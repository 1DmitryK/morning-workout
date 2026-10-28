#!/bin/zsh
set -e
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:$PATH"
if ! command -v ffmpeg >/dev/null 2>&1; then
 echo "Нужен FFmpeg. Если Homebrew установлен: brew install ffmpeg"
 exit 1
fi
if [ ! -d ".venv" ]; then
 python3 -m venv .venv
fi
source .venv/bin/activate
python -m pip install -r requirements.txt
python server.py
