#!/usr/bin/env bash
# Despliegue controlado (build + migraciones + smoke)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="${ROOT_DIR}/backend/marketworld-api"

echo "== Release MarketWorld =="

cd "${API_DIR}"

composer install --no-dev --prefer-dist --no-interaction
npm ci --no-audit --no-fund 2>/dev/null || npm install --no-audit --no-fund
npm run build

php artisan config:cache
php artisan route:cache
php artisan migrate --force --no-interaction

bash "${ROOT_DIR}/scripts/smoke_test.sh"

echo "Release completado."
