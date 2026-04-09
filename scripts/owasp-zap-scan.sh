#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# OWASP ZAP Baseline Scan — JobGrade Platform
# ──────────────────────────────────────────────────────────────────────
#
# Rulare:
#   chmod +x scripts/owasp-zap-scan.sh
#   ./scripts/owasp-zap-scan.sh
#
# Cerințe:
#   - Docker instalat și pornit
#   - Aplicația JobGrade rulând pe http://localhost:3000
#     (pornește cu: npm run dev  sau  docker compose up)
#
# Raportul HTML va fi generat în: reports/owasp-zap-report.html
# ──────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Configurare ────────────────────────────────────────────────────

TARGET_URL="${ZAP_TARGET_URL:-http://host.docker.internal:3000}"
ZAP_IMAGE="ghcr.io/zaproxy/zaproxy:stable"
REPORT_DIR="$(cd "$(dirname "$0")/.." && pwd)/reports"
REPORT_FILE="owasp-zap-report.html"
RULES_FILE="$(cd "$(dirname "$0")/.." && pwd)/scripts/zap-rules.conf"

# ─── Creare director rapoarte ──────────────────────────────────────

mkdir -p "$REPORT_DIR"

# ─── Creare fișier de reguli (excluderi / ajustări) ─────────────────

if [ ! -f "$RULES_FILE" ]; then
  cat > "$RULES_FILE" << 'RULES'
# OWASP ZAP Rules Configuration
# Format: <rule_id> <action>
# Actions: IGNORE, WARN, FAIL
#
# Reguli comune de ignorat pentru aplicații Next.js / SPA:
#
# 10038 - Content Security Policy (CSP) Header Not Set
#         De configurat separat per environment
10038	WARN
#
# 10021 - X-Content-Type-Options Header Missing
#         Deja setat în middleware-ul nostru
10021	WARN
#
# 10036 - Server Leaks Version Information
#         Next.js headers — se dezactivează în next.config
10036	WARN
#
# 10098 - Cross-Domain Misconfiguration
#         False positive pe localhost
10098	IGNORE
#
# 10049 - Non-Storable Content
#         Normal pentru API endpoints dinamice
10049	IGNORE
#
# 10055 - CSP Wildcard Directive
#         De configurat pe producție
10055	WARN
#
# 40025 - Proxy Disclosure
#         False positive pe dev environment
40025	IGNORE
#
# 90033 - Loosely Scoped Cookie
#         Normal pe localhost
90033	IGNORE
RULES
  echo "[INFO] Fișier de reguli creat: $RULES_FILE"
fi

# ─── Verificare Docker ──────────────────────────────────────────────

if ! command -v docker &> /dev/null; then
  echo "[EROARE] Docker nu este instalat. Instalează Docker și încearcă din nou."
  exit 1
fi

if ! docker info &> /dev/null; then
  echo "[EROARE] Docker daemon nu rulează. Pornește Docker și încearcă din nou."
  exit 1
fi

# ─── Verificare aplicație pornită ───────────────────────────────────

echo "[INFO] Verificare că aplicația rulează pe localhost:3000..."
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302"; then
  echo "[AVERTISMENT] Aplicația nu pare să răspundă pe http://localhost:3000"
  echo "             Pornește aplicația cu: npm run dev"
  echo "             Continuăm oricum — ZAP va raporta erorile de conexiune."
fi

# ─── Pull imagine ZAP ──────────────────────────────────────────────

echo "[INFO] Se descarcă imaginea OWASP ZAP (dacă nu există deja)..."
docker pull "$ZAP_IMAGE"

# ─── Rulare Baseline Scan ──────────────────────────────────────────

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  OWASP ZAP Baseline Scan — JobGrade Platform"
echo "  Target: $TARGET_URL"
echo "  Report: $REPORT_DIR/$REPORT_FILE"
echo "════════════════════════════════════════════════════════════════"
echo ""

docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -v "$REPORT_DIR:/zap/wrk:rw" \
  -v "$RULES_FILE:/zap/rules.conf:ro" \
  "$ZAP_IMAGE" \
  zap-baseline.py \
    -t "$TARGET_URL" \
    -r "$REPORT_FILE" \
    -c "/zap/rules.conf" \
    -I \
    -j \
    --auto

EXIT_CODE=$?

# ─── Rezultat ───────────────────────────────────────────────────────

echo ""
echo "════════════════════════════════════════════════════════════════"

if [ $EXIT_CODE -eq 0 ]; then
  echo "  PASS — Nu s-au găsit vulnerabilități critice."
elif [ $EXIT_CODE -eq 1 ]; then
  echo "  AVERTISMENTE — Verifică raportul pentru detalii."
elif [ $EXIT_CODE -eq 2 ]; then
  echo "  FAIL — S-au găsit vulnerabilități! Verifică raportul."
else
  echo "  EROARE — ZAP a returnat codul $EXIT_CODE"
fi

echo "  Raport: $REPORT_DIR/$REPORT_FILE"
echo "════════════════════════════════════════════════════════════════"

exit $EXIT_CODE
