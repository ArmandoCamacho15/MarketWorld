#!/usr/bin/env bash
# Smoke checks post-despliegue
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="${ROOT_DIR}/backend/marketworld-api"
BASE_URL="${SMOKE_BASE_URL:-http://127.0.0.1:8000}"

echo "== Smoke test MarketWorld (${BASE_URL}) =="

cd "${API_DIR}"

echo "[1/3] Migraciones pendientes"
php artisan migrate --force --no-interaction

echo "[2/3] Suite PHPUnit"
php artisan test

echo "[3/3] Health API"
curl -fsS "${BASE_URL}/api/health" >/dev/null || {
  echo "Health check falló en ${BASE_URL}/api/health" >&2
  exit 1
}

echo "Smoke test OK"
