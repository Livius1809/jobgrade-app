#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# dev-watchdog.sh — Restartare automată Next.js dev server
#
# Verifică la fiecare 60 secunde dacă :3000 răspunde.
# Dacă nu răspunde de 3 ori consecutiv, restartează npm run dev.
# Trimite notificare ntfy la fiecare restart.
# ═══════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
PORT=3000
CHECK_INTERVAL=60        # secunde între verificări
MAX_FAILURES=3           # câte eșecuri consecutive înainte de restart
NTFY_TOPIC="jobgrade-owner-liviu-2026"
LOG_FILE="$APP_DIR/logs/dev-watchdog.log"
PID_FILE="$APP_DIR/logs/dev-server.pid"

# Creează directorul logs dacă nu există
mkdir -p "$APP_DIR/logs"

consecutive_failures=0
dev_pid=""

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

notify() {
  local title="$1"
  local message="$2"
  local priority="${3:-default}"
  curl -s -o /dev/null \
    -H "Title: $title" \
    -H "Priority: $priority" \
    -H "Tags: $4" \
    -d "$message" \
    "http://localhost:8090/$NTFY_TOPIC" 2>/dev/null || true
}

start_dev_server() {
  log "Starting Next.js dev server..."
  cd "$APP_DIR"

  # Kill proces vechi dacă există
  if [ -f "$PID_FILE" ]; then
    old_pid=$(cat "$PID_FILE")
    if kill -0 "$old_pid" 2>/dev/null; then
      log "Killing old dev server (PID $old_pid)"
      kill "$old_pid" 2>/dev/null
      sleep 3
      kill -9 "$old_pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
  fi

  # Kill orice proces pe portul 3000
  local port_pid=$(lsof -ti :$PORT 2>/dev/null || netstat -tlnp 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d/ -f1)
  if [ -n "$port_pid" ]; then
    log "Killing process on port $PORT (PID $port_pid)"
    kill "$port_pid" 2>/dev/null
    sleep 2
    kill -9 "$port_pid" 2>/dev/null || true
  fi

  # Pornește dev server în background
  nohup node --max-old-space-size=2048 node_modules/next/dist/bin/next dev > "$APP_DIR/logs/dev-server.log" 2>&1 &
  dev_pid=$!
  echo "$dev_pid" > "$PID_FILE"

  log "Dev server started with PID $dev_pid"

  # Așteaptă să pornească (max 180 secunde)
  local wait=0
  while [ $wait -lt 180 ]; do
    sleep 5
    wait=$((wait + 5))
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" 2>/dev/null | grep -q "200\|307\|302"; then
      log "Dev server is UP after ${wait}s"
      notify "✅ JobGrade Dev Server UP" "Server restartat cu succes după ${wait}s (PID $dev_pid)" "default" "white_check_mark"
      return 0
    fi
  done

  log "ERROR: Dev server failed to start after 180s"
  notify "❌ JobGrade Dev Server FAIL" "Serverul nu a pornit după 180s. Investigare manuală necesară." "urgent" "x"
  return 1
}

check_health() {
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://localhost:$PORT" 2>/dev/null)

  if [ "$http_code" = "200" ] || [ "$http_code" = "307" ] || [ "$http_code" = "302" ]; then
    return 0
  else
    return 1
  fi
}

# ── Main loop ─────────────────────────────────────────────────────────────

log "═══ Dev Watchdog started ═══"
log "App dir: $APP_DIR"
log "Port: $PORT"
log "Check interval: ${CHECK_INTERVAL}s"
log "Max failures before restart: $MAX_FAILURES"

# Verifică dacă serverul rulează deja
if check_health; then
  log "Dev server already running on :$PORT"
  consecutive_failures=0
else
  log "Dev server not running — starting..."
  start_dev_server
fi

# Loop principal
while true; do
  sleep "$CHECK_INTERVAL"

  if check_health; then
    if [ $consecutive_failures -gt 0 ]; then
      log "Dev server recovered (was at $consecutive_failures failures)"
      consecutive_failures=0
    fi
  else
    consecutive_failures=$((consecutive_failures + 1))
    log "Health check FAILED ($consecutive_failures/$MAX_FAILURES)"

    if [ $consecutive_failures -ge $MAX_FAILURES ]; then
      log "⚠️ $MAX_FAILURES consecutive failures — RESTARTING dev server"
      notify "🔄 JobGrade Auto-Restart" "Dev server nu răspunde de $((MAX_FAILURES * CHECK_INTERVAL))s. Restart automat în curs..." "high" "warning,rotating_light"

      start_dev_server
      consecutive_failures=0
    fi
  fi
done
