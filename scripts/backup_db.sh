#!/usr/bin/env bash
# Respaldo MySQL de MarketWorld ERP
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="${ROOT_DIR}/backend/marketworld-api"
ENV_FILE="${API_DIR}/.env"
BACKUP_DIR="${ROOT_DIR}/storage/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "No se encontró ${ENV_FILE}" >&2
  exit 1
fi

DB_HOST="$(grep -E '^DB_HOST=' "${ENV_FILE}" | cut -d= -f2- | tr -d '"')"
DB_PORT="$(grep -E '^DB_PORT=' "${ENV_FILE}" | cut -d= -f2- | tr -d '"')"
DB_DATABASE="$(grep -E '^DB_DATABASE=' "${ENV_FILE}" | cut -d= -f2- | tr -d '"')"
DB_USERNAME="$(grep -E '^DB_USERNAME=' "${ENV_FILE}" | cut -d= -f2- | tr -d '"')"
DB_PASSWORD="$(grep -E '^DB_PASSWORD=' "${ENV_FILE}" | cut -d= -f2- | tr -d '"')"

mkdir -p "${BACKUP_DIR}"
OUTPUT="${BACKUP_DIR}/marketworld_${DB_DATABASE}_${TIMESTAMP}.sql"

echo "Generando respaldo en ${OUTPUT}"
mysqldump -h "${DB_HOST:-127.0.0.1}" -P "${DB_PORT:-3306}" -u "${DB_USERNAME}" -p"${DB_PASSWORD}" "${DB_DATABASE}" > "${OUTPUT}"
echo "Respaldo completado."
