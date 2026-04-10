#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# sync-infra.sh — Sincronizează docker-compose.yml din root → infra/
#
# Sursa oficială este docker-compose.yml din root (legat de structura
# monorepo). Această copie din infra/ e versionată în git pentru istoric
# și vizibilitate.
#
# Rulează după orice modificare a docker-compose.yml din root.
# ═══════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_COMPOSE="$APP_DIR/../docker-compose.yml"
INFRA_COMPOSE="$APP_DIR/infra/docker-compose.yml"

if [ ! -f "$ROOT_COMPOSE" ]; then
  echo "❌ ERROR: $ROOT_COMPOSE nu există"
  exit 1
fi

# Verifică APP_URL pentru port corect
if grep -q "APP_URL: http://host.docker.internal:3001" "$ROOT_COMPOSE"; then
  echo "⚠️  WARNING: APP_URL e pe :3001 — ar trebui :3000 pentru dev"
  echo "   Vezi project_n8n_port_fix.md pentru detalii"
fi

# Sincronizare
cp "$ROOT_COMPOSE" "$INFRA_COMPOSE"
echo "✅ Sincronizat: $ROOT_COMPOSE → $INFRA_COMPOSE"

# Hash check pentru confirmare
echo "Hash: $(md5sum "$INFRA_COMPOSE" 2>/dev/null | cut -d' ' -f1 || md5 -q "$INFRA_COMPOSE" 2>/dev/null)"
