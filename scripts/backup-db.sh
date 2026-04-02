#!/bin/bash
# backup-db.sh — Backup manual al bazei de date JobGrade
# Rulare: bash scripts/backup-db.sh
# Salvează în: backups/backup-YYYY-MM-DD.json

set -e

BACKUP_DIR="backups"
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="${BACKUP_DIR}/backup-${DATE}.json"

# Creează directorul dacă nu există
mkdir -p "$BACKUP_DIR"

# Apelează API-ul de backup
echo "Generating backup..."
curl -s -X POST https://jobgrade.ro/api/v1/admin/backup \
  -H "Content-Type: application/json" \
  -H "x-internal-key: ${INTERNAL_API_KEY:-a86a4367337c7c3b79fd3ddf4ccd89945568a3790300b4346d94bbe70962e372}" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); json.dump(d.get('backup',d), open('${BACKUP_FILE}','w'), indent=2, ensure_ascii=False)" 2>/dev/null \
  || curl -s -X POST https://jobgrade.ro/api/v1/admin/backup \
    -H "Content-Type: application/json" \
    -H "x-internal-key: ${INTERNAL_API_KEY:-a86a4367337c7c3b79fd3ddf4ccd89945568a3790300b4346d94bbe70962e372}" \
    > "$BACKUP_FILE"

# Verifică
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
  SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✅ Backup salvat: ${BACKUP_FILE} (${SIZE})"
  echo "   Conținut: $(cat "$BACKUP_FILE" | grep -o '"totalRecords":[0-9]*' | head -1)"
else
  echo "❌ Backup eșuat!"
  exit 1
fi

# Șterge backup-uri mai vechi de 30 zile
find "$BACKUP_DIR" -name "backup-*.json" -mtime +30 -delete 2>/dev/null
echo "   Backup-uri vechi (>30 zile) șterse."
