#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-8642}"

python3 "$SCRIPT_DIR/build.py"
echo "网站已启动：http://0.0.0.0:$PORT"
exec python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$SCRIPT_DIR/webapp"
