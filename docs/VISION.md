# Visión de MarketWorld

Visión breve:

MarketWorld será un ERP accesible y liviano para pequeñas empresas y emprendedores latinoamericanos que necesitan gestionar inventario, facturación, compras y reportes sin complejidad ni costos elevados. La solución combinará un backend Laravel robusto con un frontend estático y ligero que permita operar en conexiones moderadas.

Problema que resolvemos:

- Muchos comercios pequeños usan hojas de cálculo, notas o múltiples apps desconectadas para llevar inventario y facturación, creando errores, pérdidas de stock y problemas contables. MarketWorld unifica estas funciones en un solo lugar, con documentación simple y procesos claros.

Usuario objetivo:

- Pequeñas y microempresas (1–10 empleados) en Colombia y LATAM.
- Emprendedores que venden presencialmente y necesitan facturación básica y control de stock.
- Estudiantes que desean aprender ERP con un sistema sencillo y educativo.

Valores clave: facilidad de uso, transparencia (auditoría básica), bajo costo de operación y escalabilidad gradual.

Producto Mínimo Viable (MVP) — funcionalidades esenciales:

- Autenticación básica (registro/login) y roles mínimos (admin, vendedor).
- Gestión de productos: crear/editar/eliminar productos con código, nombre, precio, costo y stock inicial.
- Gestión de clientes: CRUD básico con documento y contacto.
- Facturación simple: crear factura con items, cálculo de impuestos y totales, reducción de stock al confirmar.
- Reporte básico: listado de productos con stock actual y alertas de stock bajo.
- Export/Import simple para migrar datos desde LocalStorage (JSON).

Restricciones del MVP:

- No incluir contabilidad completa (asientos automáticos) en primera versión.
- No integración inmediata con pasarelas de pago ni facturación electrónica obligatoria (se planeará en versiones posteriores).

Éxito del MVP (criterios generales):

- Un usuario puede registrar productos y clientes, crear una factura y ver que el stock se actualiza correctamente.
- El sistema puede importar datos exportados desde la versión en LocalStorage y reportar errores de validación.

Documentación relacionada:

- `docs/MVP_MOSCOW.md` — priorización detallada de funcionalidades.
