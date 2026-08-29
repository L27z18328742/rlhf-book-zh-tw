#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-8642}"

python3 "$SCRIPT_DIR/build.py"
echo "网站已启动：http://127.0.0.1:$PORT"
exec python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$SCRIPT_DIR/webapp"
