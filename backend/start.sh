#!/bin/bash
# Start the Symphonia backend with the virtual environment activated.
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
    echo "ERROR: .venv not found. Run: python3 -m venv .venv && pip install -r requirements.txt"
    exit 1
fi

source .venv/bin/activate

PORT="${PORT:-8766}"
echo "Starting Symphonia backend on port $PORT..."
exec python -m uvicorn main:app --host 0.0.0.0 --port "$PORT" "$@"
