#!/bin/bash
# Start the Symphonia backend with the virtual environment activated.
# This prevents namespace package conflicts with the consensus library.
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
    echo "ERROR: .venv not found. Run: python3 -m venv .venv && pip install -r requirements.txt"
    exit 1
fi

source .venv/bin/activate

# Verify consensus library is importable
python -c "from consensus.config import LLMConfig" 2>/dev/null || {
    echo "ERROR: consensus library not installed. Run: pip install -r requirements.txt"
    exit 1
}

PORT="${PORT:-8766}"
echo "Starting Symphonia backend on port $PORT..."
exec python -m uvicorn main:app --host 0.0.0.0 --port "$PORT" "$@"
