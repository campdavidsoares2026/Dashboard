#!/bin/bash
# Starts CPEE Dashboard backend + frontend and syncs Meta Ads data

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
LOG="$SCRIPT_DIR/start_dashboard.log"
VENV="$SCRIPT_DIR/venv"

echo "[$(date)] Starting CPEE Dashboard..." >> "$LOG"

# ─── Backend ───────────────────────────────────────────────
# Kill any existing backend on port 8000
pkill -f "uvicorn app.main:app" 2>/dev/null
sleep 1

# Activate venv and start backend
source "$VENV/bin/activate"
cd "$BACKEND_DIR"
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level warning >> "$LOG" 2>&1 &
BACKEND_PID=$!
echo "[$(date)] Backend PID: $BACKEND_PID" >> "$LOG"

# Wait for backend to be ready (max 15s)
for i in $(seq 1 15); do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "[$(date)] Backend ready" >> "$LOG"
        break
    fi
    sleep 1
done

# Trigger Meta Ads sync
SYNC_RESULT=$(curl -s -X POST http://localhost:8000/api/sync/meta-ads 2>&1)
echo "[$(date)] Sync: $SYNC_RESULT" >> "$LOG"

# ─── Frontend ──────────────────────────────────────────────
# Kill any existing frontend on port 3000
pkill -f "next start" 2>/dev/null
sleep 1

cd "$FRONTEND_DIR"
export NEXT_PUBLIC_API_URL=http://localhost:8000
nohup node_modules/.bin/next start -p 3000 >> "$LOG" 2>&1 &
FRONTEND_PID=$!
echo "[$(date)] Frontend PID: $FRONTEND_PID" >> "$LOG"

echo "[$(date)] Dashboard started — http://localhost:3000" >> "$LOG"
