#!/bin/zsh
set -e
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:$PATH"
if [ "$(uname -m)" != "arm64" ]; then
 echo "Нужен нативный Apple Silicon Mac (arm64), не режим Rosetta."
 exit 1
fi
python3 -c 'import sys; assert sys.version_info >= (3,10), "Для MLX нужен Python 3.10 или новее"' || exit 1
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
