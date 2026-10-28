#!/usr/bin/env python3
"""Pulse Transcript: optional local MLX-Whisper engine for Apple Silicon.

Serves the same web interface and a private API on a LAN address. The recording
is never sent to GitHub or an external transcription provider. The first run
downloads model weights from Hugging Face.
"""
from __future__ import annotations

import json
import os
import secrets
import shutil
import socket
import subprocess
import tempfile
import threading
import urllib.parse
import urllib.request
import urllib.error
import wave
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODEL = "mlx-community/whisper-large-v3-turbo"
MAX_SIZE = 512 * 1024 * 1024
PORT = int(os.environ.get("PULSE_PORT", "8765"))
SHARE_IPAD = os.environ.get("PULSE_SHARE_IPAD", "0") == "1"
HOST = "0.0.0.0" if SHARE_IPAD else "127.0.0.1"
TOKEN = secrets.token_urlsafe(24)
JOB_LOCK = threading.Lock()
STATUS_LOCK = threading.Lock()
STATUS = {"stage": "Готов к работе", "percent": 0, "running": False, "detail": ""}
PROMPT = (
    "Єгова, Ісус Христос, Біблія, Святе Письмо, Прислів’я, Луки, "
    "Об’явлення, Псалми, районний конгрес, біблійний вірш, "
    "Товариство Вартової башти, ранкове поклоніння, Яків та Ісав."
)


def set_status(stage: str, percent: int, detail: str = "", running: bool = True):
    with STATUS_LOCK:
        STATUS.update(stage=stage, percent=percent, detail=detail, running=running)


def native_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("1.1.1.1", 80))  # UDP connect does not send any data
            return sock.getsockname()[0]
    except OSError:
        return "MAC-IP-ADDRESS"


class PulseHandler(SimpleHTTPRequestHandler):
    def json_reply(self, code, obj):
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        try:
            self.wfile.write(raw)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def path_data(self):
        u = urllib.parse.urlsplit(self.path)
        return u.path, urllib.parse.parse_qs(u.query)

    def authorised(self, params):
        return secrets.compare_digest(params.get("token", [""])[0], TOKEN)

    def do_GET(self):
        path, params = self.path_data()
        if path == "/api/health":
            return self.json_reply(200, {"ok": True, "engine": "mlx-whisper", "model": MODEL})
        if path == "/api/status":
            if not self.authorised(params):
                return self.json_reply(403, {"error": "Неверный ключ доступа"})
            with STATUS_LOCK:
                current = STATUS.copy()
            return self.json_reply(200, current)
        if path.startswith("/api/"):
            return self.json_reply(404, {"error": "Неизвестный запрос"})
        return super().do_GET()

    def do_POST(self):
        path, params = self.path_data()
        if path == "/api/correct":
            return self.correct_text(params)
        if path != "/api/transcribe":
            return self.json_reply(404, {"error": "Неизвестный запрос"})
        if not self.authorised(params):
            return self.json_reply(403, {"error": "Неверный ключ. Открой адрес, показанный при запуске на Mac."})
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            size = 0
        if size <= 0 or size > MAX_SIZE:
            return self.json_reply(413, {"error": "Файл пуст или больше 512 МБ"})
        language = params.get("language", ["auto"])[0]
        if language not in ("auto", "uk", "ru", "en"):
            return self.json_reply(400, {"error": "Неизвестный язык"})
        ext = params.get("ext", ["m4a"])[0].lower().strip(".")
        if ext not in ("m4a", "mp4", "mov", "wav", "mp3", "aac", "webm", "ogg"):
            return self.json_reply(400, {"error": "Неподдерживаемый формат"})
        if not JOB_LOCK.acquire(blocking=False):
            return self.json_reply(409, {"error": "Mac уже обрабатывает другую запись"})
        try:
            self.process(size, language, ext)
        except Exception as error:
            set_status("Ошибка обработки", 0, str(error), running=False)
            return self.json_reply(500, {"error": str(error)})
        finally:
            JOB_LOCK.release()

    def correct_text(self, params):
        """Return a separately editable copy; never replace the original text."""
        if not self.authorised(params):
            return self.json_reply(403, {"error": "Неверный ключ Mac"})
        if not JOB_LOCK.acquire(blocking=False):
            return self.json_reply(409, {"error": "Mac обрабатывает другую задачу"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 350_000:
                raise ValueError("Текст пуст или слишком большой")
            incoming = json.loads(self.rfile.read(length).decode("utf-8"))
            items = incoming.get("texts", [])
            language = incoming.get("language", "uk")
            provider = incoming.get("provider", "bionic")
            mode = incoming.get("mode", "literary")
            if language not in ("uk", "ru", "en"):
                raise ValueError("Неверный язык")
            if provider not in ("bionic", "ollama"):
                raise ValueError("Неверный редактор")
            if mode not in ("faithful", "literary"):
                raise ValueError("Неверный режим")
            if not isinstance(items, list) or not (1 <= len(items) <= 300):
                raise ValueError("Ожидается 1–300 текстовых фрагментов")
            if any(not isinstance(x, str) or len(x) > 1800 for x in items):
                raise ValueError("Обнаружен слишком длинный фрагмент")

            if provider == "bionic":
                # Bionic uses LM Studio's server; its exact model ID is resolved
                # from /v1/models, never assumed from a display name.
                try:
                    req = urllib.request.Request("http://127.0.0.1:1234/v1/models")
                    with urllib.request.urlopen(req, timeout=10) as response:
                        available = json.load(response).get("data", [])
                except (urllib.error.URLError, TimeoutError) as error:
                    raise RuntimeError(
                        "Bionic/LM Studio API не отвечает. В LM Studio открой "
                        "Developer → Start server (порт 1234) и загрузи Qwen 3.5 9B."
                    ) from error
                candidates = [str(x.get("id", "")) for x in available]
                configured = os.environ.get("PULSE_BIONIC_MODEL", "").strip()
                if configured and configured not in candidates:
                    raise RuntimeError("PULSE_BIONIC_MODEL не найден среди моделей LM Studio: "
                                       + ", ".join(candidates[:6]))
                chosen = configured or next(
                    (name for name in candidates if "qwen" in name.lower() and
                     ("9b" in name.lower() or "3.5" in name.lower())), None)
                if not chosen:
                    raise RuntimeError(
                        "LM Studio подключён, но не найдена Qwen 3.5 9B. "
                        "Загрузи её в LM Studio или укажи PULSE_BIONIC_MODEL."
                    )
            else:
                chosen = os.environ.get("PULSE_OLLAMA_MODEL", "qwen3:4b")

            set_status("Литературная редакция" if mode == "literary" else "Исправление",
                       1, f"Редактор: {provider}, модель: {chosen}")
            fixed = []
            for index in range(0, len(items), 4):
                batch = items[index:index + 4]
                if not any(t.strip() for t in batch):
                    fixed.extend(batch)
                    continue
                lang_label = {"uk": "українська", "ru": "русский", "en": "English"}[language]
                instruction = (
                    "Ти — професійний редактор розпізнаних промов. "
                    "Тексти пов'язані з вірою та біблійним навчанням Свідків Єгови. "
                    "Використовуй природний літературний стиль публікацій Свідків Єгови. "
                    "Терміни: Єгова, Ісус Христос, Святе Письмо, Прислів'я, Псалми, "
                    "Об'явлення, районний конгрес, старійшина, ранкове поклоніння, "
                    "промова, біблійний вірш, Товариство «Вартова башта». "
                    "Це лише термінологічні орієнтири, НЕ вигадуй нових фактів. "
                    "Не змінюй зміст, богословські твердження, імена, числа або "
                    "посилання на вірші. НЕ дописуй пропущені речення та не вигадуй "
                    "точні біблійні цитати без джерела. Якщо фраза незрозуміла, "
                    "залиш її близькою до оригіналу, а не домислюй. "
                    "Не перекладай текст на іншу мову. "
                )
                if mode == "literary":
                    instruction += (
                        "Режим: літературна редакція. Виправ пунктуацію, морфологію, "
                        "невдалі усні повтори, зберігаючи ВСІ ключові думки. "
                    )
                else:
                    instruction += (
                        "Режим: мінімальне виправлення. Виправ тільки очевидні "
                        "помилки ASR, правопис і пунктуацію, не прибирай повторів. "
                    )
                instruction += (
                    f"Мова: {lang_label}. Отримуєш масив із {len(batch)} фрагментів. "
                    "Поверни тільки об'єкт JSON з ключем items і точно такою ж "
                    "кількістю рядків у незмінному порядку. "
                    "Не об'єднуй і не пропускай фрагменти."
                )
                user_text = json.dumps({"items": batch}, ensure_ascii=False)
                if provider == "bionic":
                    payload = {
                        "model": chosen,
                        "messages": [
                            {"role": "system", "content": instruction},
                            {"role": "user", "content": user_text},
                        ],
                        "temperature": 0.1,
                        "max_tokens": 2200,
                        "stream": False,
                        "response_format": {"type": "json_object"},
                    }
                    address = "http://127.0.0.1:1234/v1/chat/completions"
                elif provider == "ollama":
                    payload = {
                        "model": chosen,
                        "prompt": instruction + "\n" + user_text,
                        "stream": False, "format": "json",
                        "options": {"temperature": 0, "num_predict": 2200},
                    }
                    address = "http://127.0.0.1:11434/api/generate"
                headers = {"Content-Type": "application/json"}
                request = urllib.request.Request(
                    address, data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
                    headers=headers, method="POST"
                )
                try:
                    with urllib.request.urlopen(request, timeout=300) as response:
                        output = json.load(response)
                except urllib.error.HTTPError as error:
                    details = error.read(1000).decode("utf-8", errors="replace")
                    raise RuntimeError(f"{provider}: HTTP {error.code}: {details}") from error
                except (urllib.error.URLError, TimeoutError) as error:
                    raise RuntimeError(
                        f"Нет ответа от {provider}. Проверь, что модель загружена, "
                        "API запущен и хватает оперативной памяти: " + str(error)
                    ) from error
                try:
                    if provider == "bionic":
                        message = output["choices"][0]["message"]["content"]
                    else:
                        message = output["response"]
                    parsed = json.loads(message)
                    suggestions = parsed["items"]
                    if not isinstance(suggestions, list) or len(suggestions) != len(batch):
                        raise ValueError("Неверное число фрагментов")
                    if any(not isinstance(v, str) or len(v) > 2600 for v in suggestions):
                        raise ValueError("Некорректные строки")
                except (KeyError, IndexError, ValueError, TypeError) as error:
                    raise RuntimeError(
                        f"{provider} вернул неполный или некорректный JSON. "
                        "Исходная транскрипция не изменена."
                    ) from error
                fixed.extend(suggestions)
                set_status("Редакция текста", int(100 * len(fixed) / len(items)),
                           f"Обработано {len(fixed)} из {len(items)} фрагментов")
            set_status("Исправленная копия готова", 100,
                       f"Редактор: {provider}, модель: {chosen}", running=False)
            return self.json_reply(200, {"corrected": fixed, "provider": provider,
                                         "mode": mode, "model": chosen})
        except Exception as error:
            set_status("Ошибка редакции", 0, str(error), running=False)
            return self.json_reply(500, {"error": str(error)})
        finally:
            JOB_LOCK.release()

    def process(self, size: int, language: str, ext: str):
        if not shutil.which("ffmpeg"):
            raise RuntimeError("FFmpeg не установлен. Выполни: brew install ffmpeg")
        with tempfile.TemporaryDirectory(prefix="pulse-transcript-") as folder:
            temp = Path(folder)
            source = temp / ("recording." + ext)
            wav = temp / "audio-16k.wav"
            written = 0
            set_status("Получение записи", 1, "Сохраняю аудиофайл только на Mac")
            with source.open("wb") as dest:
                while written < size:
                    data = self.rfile.read(min(1024 * 1024, size - written))
                    if not data:
                        raise RuntimeError("Загрузка файла прервана")
                    dest.write(data)
                    written += len(data)
                    set_status("Получение записи", 1 + int(17 * written / size))
            set_status("Подготовка аудио", 20, "FFmpeg преобразует запись в 16 кГц моно")
            proc = subprocess.run(
                ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                 "-i", str(source), "-vn", "-ar", "16000", "-ac", "1",
                 "-c:a", "pcm_s16le", str(wav)],
                capture_output=True, text=True, timeout=600, check=False,
            )
            if proc.returncode:
                raise RuntimeError("Не удалось декодировать запись: " + proc.stderr[-500:])
            with wave.open(str(wav), "rb") as f:
                duration = f.getnframes() / f.getframerate()
            if duration <= 0:
                raise RuntimeError("Звуковая дорожка пуста")
            set_status("Whisper Large-v3 Turbo", 35,
                       f"Распознавание {duration / 60:.1f} мин; модель может загружаться впервые")
            try:
                import mlx_whisper
            except ImportError as error:
                raise RuntimeError("Установи зависимости: pip install -r requirements.txt") from error
            result = mlx_whisper.transcribe(
                str(wav),
                path_or_hf_repo=MODEL,
                language=None if language == "auto" else language,
                task="transcribe",
                initial_prompt=PROMPT if language in ("auto", "uk") else None,
                condition_on_previous_text=False,
                temperature=(0.0, 0.2, 0.4),
                verbose=None,
            )
            chunks = []
            for entry in result.get("segments", []):
                text = str(entry.get("text", "")).strip()
                if not text:
                    continue
                start = max(0.0, float(entry.get("start", 0)))
                end = max(start, float(entry.get("end", start)))
                chunks.append({
                    "start": start, "end": end, "text": text, "raw": text,
                    "warning": False, "translation": "",
                })
            if not chunks:
                raise RuntimeError("Модель не обнаружила разборчивой речи")
            set_status("Готово", 100, f"Создано фрагментов: {len(chunks)}", running=False)
            return self.json_reply(200, {
                "chunks": chunks, "duration": duration,
                "language": result.get("language", language), "model": MODEL,
            })

    def log_message(self, fmt, *args):
        if not self.path.startswith("/api/status"):
            super().log_message(fmt, *args)


def main():
    if not (ROOT / "index.html").is_file():
        raise SystemExit("Не найден Pulse Transcript index.html")
    web_server = ThreadingHTTPServer((HOST, PORT), partial(PulseHandler, directory=str(ROOT)))
    link = f"http://localhost:{PORT}/?token={TOKEN}"
    print("\nPulse Transcript · Mac MLX mode\n")
    print("Открыть на Mac:", link)
    if SHARE_IPAD:
        print("Открыть на iPad в той же частной Wi-Fi сети:",
              f"http://{native_ip()}:{PORT}/?token={TOKEN}")
        print("ВНИМАНИЕ: локальный HTTP не шифрует аудио в Wi-Fi. Используй доверенную сеть.")
    print("Пока сервер запущен, не закрывай окно Terminal. Для остановки Ctrl+C.\n")
    try:
        web_server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        pass
    finally:
        web_server.server_close()


if __name__ == "__main__":
    main()
