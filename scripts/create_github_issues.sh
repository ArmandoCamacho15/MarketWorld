#!/usr/bin/env bash
# Script para crear Issues en GitHub usando la CLI `gh`.
# Requiere: GitHub CLI instalada y autenticada (`gh auth login`).
# Uso: desde la raíz del proyecto ejecutar: `bash scripts/create_github_issues.sh`

set -euo pipefail

MILESTONE="MVP v1.0"
LABEL_MUST="must"

declare -a issues=(
  "HU-01|Registro: Como usuario, quiero registrarme con mi correo y contraseña para acceder al sistema."
  "HU-02|Login: Como usuario, quiero iniciar sesión de forma segura para proteger la información del negocio."
  "HU-03|Roles: Como administrador, quiero asignar roles (Admin/Empleado) para controlar el acceso a funciones sensibles."
  "HU-04|Logout: Como usuario, quiero poder cerrar mi sesión para que nadie use mi cuenta en computadores compartidos."
  "HU-07|Productos: Como administrador, quiero registrar productos con código, nombre y precios para poblar mi catálogo."
  "HU-08|Listar productos: Como usuario, quiero listar y filtrar productos por categoría para encontrar stock rápidamente."
  "HU-09|Actualizar producto: Como administrador, quiero actualizar precio o descripción de un producto cuando cambie el mercado."
  "HU-10|Eliminar producto: Como administrador, quiero eliminar lógicamente productos que ya no se venden."
  "HU-11|Alerta stock bajo: Como usuario, quiero ver alertas visuales cuando un producto tenga stock bajo."
  "HU-14|Registrar cliente: Como cajero, quiero registrar clientes nuevos con su documento y teléfono para fidelizarlos."
  "HU-15|Buscar cliente: Como usuario, quiero buscar clientes por nombre o cédula para agilizar la facturación."
  "HU-19|POS carrito: Como cajero, quiero buscar productos y agregarlos a un carrito para realizar una venta."
  "HU-21|Medios de pago: Como cajero, quiero seleccionar diferentes medios de pago (Efectivo/Tarjeta)."
  "HU-22|Descontar stock: Como sistema, quiero descontar automáticamente el stock tras cada venta confirmada."
  "HU-23|Comprobante: Como cliente, quiero recibir un comprobante (físico o PDF) de mi compra."
  "HU-26|Dashboard ventas día: Como administrador, quiero ver el total de ventas del día en el dashboard principal."
  "HU-28|Inventario valorizado: Como administrador, quiero generar un reporte de inventario valorizado."
  "HU-31|Config empresa: Como administrador, quiero configurar el nombre, RUT y logo de mi empresa para las facturas."
  "HU-32|Config IVA: Como administrador, quiero configurar el porcentaje de impuestos (IVA) vigente."
)

echo "Creando Issues para historias 'Must' usando gh..."
for item in "${issues[@]}"; do
  IFS='|' read -r key title <<< "$item"
  body="${title}\n\nCriterios de aceptación: ver docs/USER_STORIES.md#criterios-de-aceptaci%C3%B3n"
  echo "Creando issue: [$key] $title"
  gh issue create --title "[$key] $title" --body "$body" --label "$LABEL_MUST" --milestone "$MILESTONE" || echo "Fallo creando $key — verifica gh auth, milestone y labels."
done

echo "Listo. Revisa los Issues en GitHub y ajusta etiquetas/milestone si es necesario."
