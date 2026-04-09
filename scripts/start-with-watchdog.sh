#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# start-with-watchdog.sh — Pornește dev server + watchdog
#
# Folosire: bash scripts/start-with-watchdog.sh
# Oprire: Ctrl+C (oprește watchdog-ul, care oprește și dev server-ul)
# ═══════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "═══════════════════════════════════════════════"
echo " JobGrade Dev Server + Watchdog"
echo " Watchdog verifică :3000 la 60s"
echo " Restart automat după 3 eșecuri consecutive"
echo " Notificări via ntfy"
echo "═══════════════════════════════════════════════"
echo ""

# Pornește watchdog-ul (care pornește dev server-ul automat)
exec bash "$SCRIPT_DIR/dev-watchdog.sh"
