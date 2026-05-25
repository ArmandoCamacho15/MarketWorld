#!/usr/bin/env bash
# Rollback: restaura composer.lock previo y opcionalmente BD
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="${ROOT_DIR}/backend/marketworld-api"
LOCK_BACKUP="${1:-}"

if [[ -z "${LOCK_BACKUP}" ]]; then
  echo "Uso: $0 <ruta-composer.lock.backup>" >&2
  exit 1
fi

if [[ ! -f "${LOCK_BACKUP}" ]]; then
  echo "No existe backup: ${LOCK_BACKUP}" >&2
  exit 1
fi

cd "${API_DIR}"
cp "${LOCK_BACKUP}" composer.lock
composer install --no-interaction

php artisan migrate:rollback --step=1 --force --no-interaction || true
php artisan test --no-interaction

echo "Rollback aplicado."
