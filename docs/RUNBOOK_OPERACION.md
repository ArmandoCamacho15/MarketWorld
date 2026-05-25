# Runbook de operación — MarketWorld ERP

## 1. Protocolo de despliegue

1. Crear respaldo: `bash scripts/backup_db.sh`
2. Copiar respaldo de lockfile: `cp backend/marketworld-api/composer.lock backend/marketworld-api/composer.lock.bak`
3. Ejecutar release: `bash scripts/release.sh`
4. Verificar smoke: debe terminar con `Smoke test OK`
5. Registrar versión y hora en bitácora del instructor

Variables relevantes en `backend/marketworld-api/.env`:

- `APP_ENV=production`
- `APP_DEBUG=false`
- `ADMIN_DEFAULT_PASSWORD` (solo seed inicial, nunca en frontend)

## 2. Protocolo de incidente

| Severidad | Acción |
|-----------|--------|
| API caída | Revisar `php artisan serve`/FPM, logs `storage/logs/laravel.log` |
| 500 en compras/pagos | Validar migraciones y cuentas 1105/2205 en plan contable |
| CI rojo | Revisar GitHub Actions → workflow `CI MarketWorld` |
| Credenciales | Rotar en backend; no usar usuarios demo en `localStorage` |

Escalamiento:

1. Congelar despliegues
2. Restaurar último backup DB si hay corrupción de datos
3. Rollback de dependencias si el fallo es post-`composer update`

## 3. Restauración desde backup

```bash
# Detener escrituras (modo mantenimiento)
cd backend/marketworld-api
php artisan down

# Restaurar (ajustar ruta del .sql)
mysql -h 127.0.0.1 -u root -p marketworld_db < storage/backups/marketworld_marketworld_db_YYYYMMDD_HHMMSS.sql

php artisan up
bash scripts/smoke_test.sh
```

## 4. Verificación post-despliegue (smoke checks)

El script `scripts/smoke_test.sh` valida:

- Migraciones al día
- Suite `php artisan test`
- Endpoint `GET /api/health`

Checks manuales recomendados:

- Login Sanctum (`POST /api/v1/login`)
- Listado compras (`GET /api/v1/purchases`)
- Registro pago (`POST /api/v1/purchases/{id}/payments`)
- Dashboard (`GET /api/v1/dashboard/stats`) — campo `accounts_payable`
- Reporte financiero (`GET /api/v1/reports/financiero`) — campo `cuentas_por_pagar`

## 5. Autenticación

La autenticación es **exclusivamente backend (Laravel Sanctum)**. No existen usuarios demo ni hashes de contraseña en `js/data.js`.

Usuario inicial: crear con `php artisan db:seed` y variable `ADMIN_DEFAULT_PASSWORD` en `.env`.
