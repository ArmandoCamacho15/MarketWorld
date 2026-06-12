# Manual Técnico — MarketWorld ERP

| Campo | Valor |
|---|---|
| **Versión** | 1.0.0 |
| **Fecha** | 30 de mayo de 2026 |
| **Aprendices** | Armando Camacho Araque & Jhonatan Zuleta |
| **Programa de formación** | Tecnólogo en Análisis y Desarrollo de Software (ADSO) |
| **Centro de formación SENA** | EL CENTRO DE LA CONSTRUCCION - REGIONAL VALLE |
| **Instructor** | STIVEN SILVA ASCUNTAR |
| **Ficha** | 3070470 |

---

## 1. Descripción del sistema

**MarketWorld ERP** es un sistema de Planificación de Recursos Empresariales (_Enterprise Resource Planning_) de arquitectura web, concebido para satisfacer las necesidades operacionales de microempresas colombianas. El sistema centraliza en una sola plataforma los procesos de:

- **Inventario:** control de productos, categorías, stock y valorización.
- **Facturación (Ventas):** emisión de facturas de venta con soporte de IVA.
- **Compras:** registro de órdenes de compra, proveedores y cuentas por pagar (CXP).
- **CRM (Gestión de Relaciones con Clientes):** segmentos, oportunidades, campañas, actividades y recordatorios.
- **Contabilidad:** plan de cuentas y libro diario con partida doble, exportable a Excel/CSV.
- **Reportes:** informes de ventas, inventario, financiero, CXP y cartera de clientes.
- **Administración:** gestión de usuarios, roles, permisos, configuración de empresa y auditoría.
- **Dashboard:** indicadores clave de rendimiento (KPI) en tiempo real con gráficas históricas.

El sistema está construido sobre una arquitectura **desacoplada (Headless)**: el backend expone una API REST documentada y el frontend consume dichos servicios mediante JavaScript Vanilla, sin dependencia de frameworks SPA como React o Vue. El Frontend está desplegado en Vercel (`https://marketworld-erp.vercel.app`) y el Backend/API junto con la Base de Datos MySQL (Managed Database) están desplegados en DigitalOcean App Platform, consumiendo la API base: `https://marketworld-api-k8bvf.ondigitalocean.app/api/v1`.

---

## 2. Arquitectura del sistema

### 2.1 Diagrama de componentes

```
┌───────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Navegador)                        │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Frontend: HTML5 + Vanilla JS + Bootstrap 5                  │ │
│  │  /html/*.html   /js/*.js   /css/*.css                        │ │
│  │                                                              │ │
│  │  Módulos: Login · Dashboard · Inventario · Facturación       │ │
│  │           Compras · CRM · Contabilidad · Reportes · Config.  │ │
│  └────────────────────────┬─────────────────────────────────────┘ │
│                           │ HTTPS + Bearer Token (Authorization Header) │
└───────────────────────────┼───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│                     SERVIDOR (Backend)                            │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │  Laravel 11.x / PHP 8.2+                                  │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │    │
│  │  │   Routes    │  │ Controllers │  │    Services       │  │    │
│  │  │  api.php    │→ │  Api/*.php  │→ │  AuditLogger      │  │    │
│  │  └─────────────┘  └──────┬──────┘  │  InventoryService │  │    │
│  │                          │         └──────────────────┘  │    │
│  │  ┌───────────────────────▼──────────────────────────┐    │    │
│  │  │  Models (Eloquent ORM)                           │    │    │
│  │  │  Product · Invoice · Purchase · Customer · User  │    │    │
│  │  │  JournalEntry · Opportunity · AuditLog · ...     │    │    │
│  │  └───────────────────────┬──────────────────────────┘    │    │
│  └──────────────────────────┼────────────────────────────────┘   │
│                             │ PDO / Eloquent                      │
│  ┌──────────────────────────▼────────────────────────────────┐   │
│  │  Base de Datos: MySQL 8.0                                  │   │
│  │  Schema: marketworld_sena                                  │   │
│  │  23 tablas · 41 migraciones                               │   │
│  └────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

> **Nota:** En el directorio `/img` del repositorio se incluye el diagrama de arquitectura en formato imagen de alta resolución para incluir en la presentación SENA.

### 2.2 Stack tecnológico

| Capa | Tecnología | Versión | Justificación técnica |
|------|-----------|---------|----------------------|
| Backend Framework | Laravel | 11.x | Framework PHP empresarial con ORM Eloquent, sistema de rutas declarativo, middleware y sistema de migraciones robusto. Licencia MIT. |
| Lenguaje servidor | PHP | ^8.2 | Requerido por `composer.json`. Soporte de tipos nativos, match expressions y atributos PHP 8.x mejoran la legibilidad. |
| Base de datos | MySQL | 8.0 | RDBMS relacional maduro, soporte nativo en hosting colombiano, compatibilidad total con Eloquent y migraciones Laravel. |
| Frontend | Vanilla JS + Bootstrap 5 | Bootstrap 5.3 | Sin dependencia de framework SPA; mayor control del DOM, tiempo de carga reducido, mantenibilidad por aprendices ADSO. |
| Autenticación | Laravel Sanctum | * (última estable) | Configurado en modo Token Authentication (Stateless). El backend emite tokens de acceso seguros que eliminan la necesidad de cookies cross-domain y evitan bloqueos de políticas de terceros en navegadores modernos. |
| Control de roles | Spatie Laravel Permission | * (última estable) | Gestión granular de roles (`Administrador`, `Bodeguero`, `Usuario`) integrada al modelo `User` vía trait `HasRoles`. |
| Exportación Excel | PhpSpreadsheet | ^5.7 | Generación nativa de archivos `.xlsx` para el libro diario contable, sin dependencias externas de terceros. |
| Calidad de código | PHPStan + PHP_CodeSniffer | ^2.2 / ^4.0 | Análisis estático y verificación de estándares PSR-12 en modo dev. |
| Testing | PHPUnit | ^11.5.3 | Suite de pruebas unitarias e integración para validar endpoints críticos. |
| Servidor dev | Laravel Sail / `php artisan serve` | — | Contenedor Docker opcional (Sail) o servidor embebido para desarrollo local. |

---

## 3. Estructura del repositorio

```
MarketWorld/                         ← Raíz del proyecto monorepo
│
├── backend/
│   └── marketworld-api/             ← Aplicación Laravel (API REST)
│       ├── app/
│       │   ├── Http/
│       │   │   ├── Controllers/
│       │   │   │   └── Api/         ← 20 controladores de recursos
│       │   │   └── Middleware/
│       │   │       ├── RoleMiddleware.php     ← Guard de roles (alias 'role')
│       │   │       └── ApiTokenAuth.php       ← Middleware legado (reemplazado por Sanctum)
│       │   ├── Models/              ← 23 modelos Eloquent
│       │   ├── Services/
│       │   │   ├── AuditLogger.php            ← Servicio de auditoría de acciones
│       │   │   └── InventoryService.php       ← Lógica de negocio de stock
│       │   └── Providers/           ← Service providers de Laravel
│       │
│       ├── bootstrap/
│       │   └── app.php              ← Punto de entrada L11: middleware, rutas y excepciones
│       │
│       ├── config/
│       │   ├── cors.php             ← Política CORS configurable por .env
│       │   ├── sanctum.php          ← Configuración de tokens API
│       │   └── permission.php       ← Configuración de Spatie Permission
│       │
│       ├── database/
│       │   ├── migrations/          ← 41 migraciones cronológicas (Feb 2026 – May 2026)
│       │   ├── seeders/             ← Seeders de datos iniciales (roles, admin, cuentas)
│       │   └── factories/           ← Factories para pruebas con Faker
│       │
│       ├── routes/
│       │   ├── api.php              ← Todas las rutas REST bajo prefijo /api/v1
│       │   └── web.php              ← Única ruta raíz (redirección o health check)
│       │
│       ├── tests/                   ← Suite PHPUnit (Feature + Unit)
│       ├── .env.example             ← Plantilla de variables de entorno
│       └── composer.json            ← Manifiesto de dependencias PHP
│
├── html/                            ← Vistas HTML del frontend (11 páginas)
│   ├── Login.html
│   ├── dashboard.html
│   ├── inventario.html
│   ├── facturacion.html
│   ├── compras.html
│   ├── crm.html
│   ├── contabilidad.html
│   ├── reporte.html
│   ├── configuracion.html
│   ├── inicio.html
│   └── nuevo_usuario.html
│
├── js/                              ← Lógica JS por módulo (18 archivos)
│   ├── api-adapter.js               ← Capa de abstracción para llamadas a la API
│   ├── auth-check.js                ← Verificación de sesión activa en cada página
│   ├── login.js · dashboard.js · inventario.js · facturacion.js
│   ├── compras.js · crm.js · contabilidad.js · reporte.js
│   ├── configuracion.js · notifications.js · utils.js
│   └── data.js                      ← Datos estáticos de referencia
│
├── css/                             ← Hojas de estilo Vanilla CSS
├── img/                             ← Imágenes, íconos y assets estáticos
├── docs/                            ← Documentación del proyecto (este directorio)
│   ├── MANUAL_TECNICO_SENA.md
│   └── MANUAL_USUARIO_FINAL.md
│
├── marketworld_base_de_datos/       ← Scripts SQL de respaldo y seeding manual
├── scripts/                         ← Scripts de automatización (batch/shell)
├── iniciar_proyecto.bat             ← Script de arranque rápido para Windows
├── .eslintrc.json                   ← Reglas ESLint para el frontend JS
├── .stylelintrc.json                ← Reglas Stylelint para el CSS
└── guia-estilo-convenciones.md      ← Guía de convenciones del equipo
```

**Descripción de directorios clave del backend Laravel:**

| Directorio | Propósito |
|---|---|
| `app/Http/Controllers/Api/` | Contiene los 20 controladores REST. Cada controlador gestiona un recurso específico (Product, Invoice, etc.) y retorna respuestas JSON con estructura uniforme `{success, message, data, errors}`. |
| `app/Models/` | 23 modelos Eloquent que mapean las tablas de la base de datos. Incluyen relaciones (`hasMany`, `belongsTo`), accessors calculados y métodos de negocio (ej: `aplicarCostoPromedioPonderado` en `Product`). |
| `app/Services/` | Capa de servicios para lógica reutilizable: `AuditLogger` registra trazabilidad de acciones, `InventoryService` encapsula operaciones complejas de stock. |
| `app/Http/Middleware/` | `RoleMiddleware.php` implementa el guard de autorización de roles; se registra como alias `role` en `bootstrap/app.php`. |
| `database/migrations/` | 41 migraciones cronológicas que definen el esquema completo de la base de datos. Permiten reproducir el entorno en cualquier servidor con un único comando. |
| `bootstrap/app.php` | Archivo central de configuración de la aplicación en Laravel 11. Registra middleware, rutas y manejadores de excepciones globales. |

---

## 4. Módulos implementados

El sistema cuenta con **8 módulos principales**, cada uno respaldado por controladores, modelos y tablas propios.

---

### Módulo 1 — Autenticación (`AuthController`)

**Propósito:** Gestiona el registro, inicio y cierre de sesión de usuarios. Emite Bearer Tokens mediante Laravel Sanctum, los cuales se almacenan en el localStorage del cliente para autenticar de forma persistente y sin estado (Stateless) cada petición HTTP.

**Endpoints API:**

| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|----------------|
| `POST` | `/api/v1/auth/register` | Registrar nuevo usuario (rol fijo: `Usuario`) | No |
| `POST` | `/api/v1/auth/login` | Iniciar sesión · devuelve el token de acceso JSON (Bearer Token). | No |
| `POST` | `/api/v1/auth/logout` | Cerrar sesión e invalidar sesión/token | Sí |
| `GET`  | `/api/v1/auth/me` | Obtener perfil del usuario autenticado | Sí |
| `GET`  | `/api/health` | Estado de la API | No |

**Tablas:** `users`, `sessions`, `personal_access_tokens`

---

### Módulo 2 — Dashboard (`DashboardController`)

**Propósito:** Provee KPIs en tiempo real y datos históricos para visualizaciones gráficas. Agrupa automáticamente por día/semana/mes según el rango de fechas solicitado.

**Endpoints API:**

| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|----------------|
| `GET` | `/api/v1/dashboard/stats` | Retorna: ventas hoy, ventas del período, compras del período, CXP (cuentas por pagar), productos con stock bajo, valor del inventario, total de clientes, historial de ventas, historial de movimientos de inventario, historial de CXP, transacciones recientes | Sí |

**Tablas:** `invoices`, `purchases`, `products`, `customers`, `inventory_movements`, `purchase_payments`

---

### Módulo 3 — Inventario (`ProductController`, `CategoryController`, `InventoryMovementController`)

**Propósito:** Gestión integral de productos y categorías. Implementa el método de **Costo Promedio Ponderado (CPP)** para la valorización automática de entradas de stock. Registra todos los movimientos en un log de trazabilidad.

**Endpoints API:**

| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|------------|
| `GET` | `/api/v1/products` | Listar productos (con paginación y filtros) | Usuario |
| `POST` | `/api/v1/products` | Crear producto | Usuario |
| `GET` | `/api/v1/products/{id}` | Ver detalle de producto | Usuario |
| `PUT/PATCH` | `/api/v1/products/{id}` | Actualizar producto | Usuario |
| `DELETE` | `/api/v1/products/{id}` | Eliminar producto | Usuario |
| `GET` | `/api/v1/products/stock-bajo` | Productos con stock ≤ stock_mínimo | Usuario |
| `GET` | `/api/v1/products/valuation` | Valorización total del inventario (precio_compra × stock) | Usuario |
| `GET` | `/api/v1/categories` | Listar categorías | Usuario |
| `POST` | `/api/v1/categories` | Crear categoría | Usuario |
| `PUT/PATCH` | `/api/v1/categories/{id}` | Actualizar categoría | Usuario |
| `DELETE` | `/api/v1/categories/{id}` | Eliminar categoría | Usuario |
| `GET` | `/api/v1/inventory-movements` | Listar movimientos de inventario | Administrador \| Bodeguero |
| `POST` | `/api/v1/inventory-movements` | Registrar movimiento manual de stock | Administrador \| Bodeguero |
| `POST` | `/api/v1/products/{id}/adjust-cost` | Ajuste manual de costo promedio | Administrador |

**Tablas:** `products`, `categories`, `inventory_movements`, `cost_adjustments`

**Columnas clave de `products`:**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `sku` | `varchar(50) UNIQUE` | Código único del producto |
| `nombre` | `varchar(200)` | Nombre descriptivo |
| `precio_compra` | `decimal(12,2)` | Costo promedio ponderado actual |
| `precio_venta` | `decimal(12,2)` | Precio de venta al público |
| `stock` | `integer` | Unidades disponibles |
| `stock_minimo` | `integer` | Umbral de alerta de stock bajo |
| `iva` | `decimal(5,2)` | Porcentaje de IVA (por defecto 19.00%) |
| `estado` | `enum('Activo','Inactivo')` | Estado del producto |

---

### Módulo 4 — Facturación (`InvoiceController`)

**Propósito:** Emisión y gestión de facturas de venta. Al crear una factura, el sistema descuenta automáticamente el stock mediante el método `registrarSalida()` del modelo `Product` y genera el asiento contable correspondiente. Soporta anulación con reversión de inventario.

**Endpoints API:**

| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|------------|
| `GET` | `/api/v1/invoices` | Listar facturas (filtros por fecha, estado, cliente) | Usuario |
| `POST` | `/api/v1/invoices` | Crear factura (descuenta stock automáticamente) | Usuario |
| `GET` | `/api/v1/invoices/{id}` | Ver factura con ítems y cliente | Usuario |
| `PUT/PATCH` | `/api/v1/invoices/{id}` | Actualizar / anular factura | Usuario |

**Tablas:** `invoices`, `invoice_items`

**Columnas clave de `invoices`:**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `numero_factura` | `varchar UNIQUE` | Número correlativo (ej: `FAC-0001`) |
| `customer_id` | `FK → customers` | Cliente (nullable = Consumidor Final) |
| `subtotal` | `decimal(15,2)` | Base gravable |
| `impuestos` | `decimal(15,2)` | IVA calculado |
| `descuento` | `decimal(15,2)` | Descuento aplicado |
| `total` | `decimal(15,2)` | Valor total a cobrar |
| `metodo_pago` | `varchar` | Efectivo, Tarjeta, Transferencia |
| `estado` | `enum('Pagada','Pendiente','Anulada')` | Estado de la factura |
| `user_id` | `FK → users` | Vendedor responsable |

---

### Módulo 5 — Compras (`PurchaseController`, `SupplierController`)

**Propósito:** Gestión de órdenes de compra a proveedores. Implementa control de **Cuentas por Pagar (CXP)** con seguimiento de pagos parciales y sincronización automática del estado (`pendiente` / `parcial` / `pagada`). Al recibir una compra, aplica el CPP sobre los productos.

**Endpoints API:**

| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|------------|
| `GET` | `/api/v1/purchases` | Listar órdenes de compra | Administrador \| Bodeguero |
| `POST` | `/api/v1/purchases` | Crear orden de compra (actualiza stock con CPP) | Administrador \| Bodeguero |
| `GET` | `/api/v1/purchases/{id}` | Ver orden con ítems, pagos y proveedor | Administrador \| Bodeguero |
| `PUT/PATCH` | `/api/v1/purchases/{id}` | Actualizar orden | Administrador \| Bodeguero |
| `POST` | `/api/v1/purchases/{id}/payments` | Registrar pago parcial o total a proveedor | Administrador \| Bodeguero |
| `GET` | `/api/v1/suppliers` | Listar proveedores | Administrador \| Bodeguero |
| `POST` | `/api/v1/suppliers` | Crear proveedor | Administrador \| Bodeguero |
| `PUT/PATCH` | `/api/v1/suppliers/{id}` | Actualizar proveedor | Administrador \| Bodeguero |
| `DELETE` | `/api/v1/suppliers/{id}` | Eliminar proveedor | Administrador \| Bodeguero |

**Tablas:** `purchases`, `purchase_items`, `purchase_payments`, `suppliers`

---

### Módulo 6 — CRM (`CRMController`, `CustomerController`)

**Propósito:** Gestión completa del ciclo de vida del cliente. Incluye segmentación, pipeline de oportunidades comerciales (con 5 etapas), campañas de marketing, registro de actividades y recordatorios automáticos.

**Endpoints API:**

| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|------------|
| `GET/POST` | `/api/v1/customers` | CRUD de clientes | Usuario |
| `PUT/DELETE` | `/api/v1/customers/{id}` | Actualizar / eliminar cliente | Usuario |
| `GET/POST` | `/api/v1/crm/oportunidades` | Pipeline de oportunidades | Usuario |
| `PUT/DELETE` | `/api/v1/crm/oportunidades/{id}` | Gestionar oportunidad | Usuario |
| `GET/POST` | `/api/v1/crm/segmentos` | Segmentos de clientes | Usuario |
| `PUT/DELETE` | `/api/v1/crm/segmentos/{id}` | Gestionar segmento | Usuario |
| `GET/POST` | `/api/v1/crm/campanas` | Campañas de marketing | Usuario |
| `PUT/DELETE` | `/api/v1/crm/campanas/{id}` | Gestionar campaña | Usuario |
| `GET/POST` | `/api/v1/crm/actividades` | Actividades comerciales | Usuario |
| `PUT/DELETE` | `/api/v1/crm/actividades/{id}` | Gestionar actividad | Usuario |
| `GET/POST` | `/api/v1/crm/recordatorios` | Recordatorios y alertas | Usuario |
| `PUT` | `/api/v1/crm/recordatorios/{id}/leido` | Marcar recordatorio como leído | Usuario |
| `DELETE` | `/api/v1/crm/recordatorios/{id}` | Eliminar recordatorio | Usuario |

**Tablas:** `customers`, `segments`, `opportunities`, `campaigns`, `activities`, `reminders`

**Etapas del pipeline de oportunidades:** `prospecto` → `contactado` → `propuesta` → `negociacion` → `ganado` / `perdido`

---

### Módulo 7 — Contabilidad (`AccountController`, `JournalEntryController`)

**Propósito:** Contabilidad básica con plan de cuentas basado en la clasificación NIIF (Activo, Pasivo, Patrimonio, Ingreso, Gasto). Libro diario con partida doble. Exportación en formato CSV y XLSX nativos para presentación a contador.

**Endpoints API:**

| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|------------|
| `GET/POST` | `/api/v1/accounts` | CRUD del plan de cuentas | Administrador |
| `PUT/DELETE` | `/api/v1/accounts/{id}` | Gestionar cuenta contable | Administrador |
| `GET/POST` | `/api/v1/journal-entries` | Libro diario (asientos contables) | Administrador |
| `GET` | `/api/v1/journal-entries/{id}` | Ver asiento con partidas dobles | Administrador |
| `GET` | `/api/v1/journal-entries/export` | Exportar libro diario CSV | Administrador |
| `GET` | `/api/v1/journal-entries/export-xlsx` | Exportar libro diario XLSX | Administrador |

**Tablas:** `accounts`, `journal_entries`, `journal_items`

**Columnas de `accounts`:**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `codigo` | `varchar UNIQUE` | Código PUC (ej: `1105` = Caja) |
| `nombre` | `varchar` | Nombre de la cuenta |
| `tipo` | `enum('Activo','Pasivo','Patrimonio','Ingreso','Gasto')` | Naturaleza contable |

---

### Módulo 8 — Reportes y Administración (`ReportController`, `UserManagementController`, `RoleManagementController`, `CompanySettingController`, `AuditLogController`)

**Propósito:** Informes empresariales descargables y gestión administrativa del sistema. Los reportes están restringidos al rol `Administrador`. La auditoría registra IP, User-Agent y metadatos de cada acción crítica.

**Endpoints de Reportes:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/v1/reports/ventas` | Informe de ventas por período |
| `GET` | `/api/v1/reports/inventario` | Informe de valorización de inventario |
| `GET` | `/api/v1/reports/financiero` | Informe financiero (ingresos vs. gastos) |
| `GET` | `/api/v1/reports/cxp` | Informe de cuentas por pagar |
| `GET` | `/api/v1/reports/clientes` | Informe de cartera de clientes |
| `GET` | `/api/v1/reports/sales-summary` | Resumen ejecutivo de ventas |
| `GET` | `/api/v1/reports/tax-summary` | Resumen de impuestos (IVA) |
| `GET` | `/api/v1/reports/dian-draft` | Borrador de declaración DIAN |
| `GET` | `/api/v1/reports/inventory-utility` | Utilidad bruta por producto |

**Endpoints de Administración (prefijo `/api/v1/admin/`):**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET/POST/PUT/DELETE` | `admin/users` | CRUD de usuarios del sistema |
| `GET/POST/PUT/DELETE` | `admin/roles` | Gestión de roles |
| `GET` | `admin/permissions` | Listado de permisos disponibles |
| `GET` | `admin/audit-logs` | Consulta de bitácora de auditoría |

**Endpoints de Configuración de Empresa:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET/POST` | `/api/v1/company-settings` | Configuración de la empresa (NIT, moneda, CPP) — requiere rol Administrador |

**Tablas:** `audit_logs`, `company_settings`, `roles`, `permissions`, `model_has_roles`, `model_has_permissions`, `system_notifications`

---

## 5. Modelo de datos

A continuación se presenta el esquema entidad-relación completo del sistema, con las 23 tablas de dominio más las tablas de soporte de Laravel y Spatie.

```
┌──────────────┐     ┌───────────────┐     ┌───────────────────┐
│    users     │     │  permissions  │     │      roles        │
│──────────────│     │───────────────│     │───────────────────│
│ id (PK)      │────►│ id (PK)       │     │ id (PK)           │
│ name         │     │ name          │     │ name              │
│ apellido     │     │ guard_name    │     │ guard_name        │
│ telefono     │     └───────────────┘     └───────────────────┘
│ email        │
│ password     │◄─────────────────────────────────────────────────┐
│ estado       │                                                   │
└──────┬───────┘                                                   │
       │                                                           │
       │ 1:N                  ┌────────────────┐                  │
       ├──────────────────────► audit_logs      │                  │
       │                      │────────────────│                  │
       │                      │ id (PK)         │                  │
       │                      │ user_id (FK)    │                  │
       │                      │ action          │                  │
       │                      │ entity_type     │                  │
       │                      │ entity_id       │                  │
       │                      │ description     │                  │
       │                      │ metadata (JSON) │                  │
       │                      │ ip_address      │                  │
       │                      │ user_agent      │                  │
       │                      └────────────────┘                  │
       │                                                           │
       │ 1:N         ┌──────────────┐     ┌──────────────────┐    │
       ├─────────────►   invoices   │     │  invoice_items   │    │
       │             │──────────────│     │──────────────────│    │
       │             │ id (PK)      │─────► id (PK)          │    │
       │             │ numero_fact. │ 1:N │ invoice_id (FK)  │    │
       │             │ customer_id◄─┤     │ product_id (FK)──┼───►│
       │             │ fecha        │     │ cantidad         │    │
       │             │ subtotal     │     │ precio_unitario  │    │
       │             │ impuestos    │     │ subtotal         │    │
       │             │ descuento    │     └──────────────────┘    │
       │             │ total        │                             │
       │             │ metodo_pago  │          ┌─────────────┐   │
       │             │ estado       │          │  products   │   │
       │             │ user_id (FK)─┼──────────► id (PK)     │   │
       │             └──────────────┘          │ sku         │   │
       │                                       │ nombre      │   │
       │ 1:N         ┌──────────────┐          │ precio_cpt  │   │
       ├─────────────►  purchases   │          │ precio_vta  │   │
       │             │──────────────│          │ stock       │   │
       │             │ id (PK)      │          │ stock_min.  │   │
       │             │ numero_orden │          │ iva         │   │
       │             │ supplier_id◄─┼──┐       │ estado      │   │
       │             │ fecha        │  │       └──────┬──────┘   │
       │             │ total        │  │              │           │
       │             │ estado       │  │       1:N    │           │
       │             │ estado_pago  │  │  ┌───────────▼───────┐  │
       │             │ user_id (FK)─┼──┘  │inventory_movements│  │
       │             └──────┬───────┘     │───────────────────│  │
       │                    │ 1:N         │ id (PK)           │  │
       │        ┌───────────▼─────┐       │ product_id (FK)   │  │
       │        │ purchase_items  │       │ user_id (FK)      │  │
       │        │─────────────────│       │ tipo (Entrada/    │  │
       │        │ id (PK)         │       │       Salida/Ajst)│  │
       │        │ purchase_id(FK) │       │ cantidad          │  │
       │        │ product_id (FK) │       │ stock_anterior    │  │
       │        │ cantidad        │       │ stock_nuevo       │  │
       │        │ precio_unitario │       │ motivo            │  │
       │        │ costo_unitario  │       │ referencia_tipo   │  │
       │        └─────────────────┘       └───────────────────┘  │
       │                                                          │
       │        ┌──────────────────┐                              │
       │        │purchase_payments │                              │
       │        │──────────────────│                              │
       │        │ id (PK)          │                              │
       │        │ purchase_id (FK) │                              │
       │        │ monto            │                              │
       │        │ metodo_pago      │                              │
       │        │ fecha            │                              │
       │        └──────────────────┘                              │
       │                                                          │
       │    ┌─────────────┐   ┌────────────────┐                 │
       │    │  suppliers  │   │   customers    │                 │
       │    │─────────────│   │────────────────│                 │
       │    │ id (PK)     │   │ id (PK)        │                 │
       │    │ nombre      │   │ nombre         │                 │
       │    │ nit         │   │ documento      │                 │
       │    │ contacto    │   │ tipo_documento │                 │
       │    │ telefono    │   │ email          │                 │
       │    │ email       │   │ tipo_cliente   │                 │
       │    └─────────────┘   │ segmento       │                 │
       │                      │ limite_credito │                 │
       │                      │ segment_id (FK)┼──►┌──────────┐  │
       │                      └───────┬────────┘   │ segments │  │
       │                              │ 1:N         └──────────┘  │
       │                    ┌─────────▼──────┐                    │
       │                    │ opportunities  │                    │
       │                    │────────────────│                    │
       │                    │ customer_id(FK)│                    │
       │                    │ titulo         │                    │
       │                    │ valor_estimado │                    │
       │                    │ etapa          │                    │
       │                    │ user_id (FK)───┼────────────────────┘
       │                    └────────────────┘
       │
       │    ┌──────────────────┐    ┌────────────────┐
       │    │  journal_entries │    │  journal_items │
       │    │──────────────────│    │────────────────│
       │    │ id (PK)          │────► id (PK)        │
       │    │ fecha            │1:N │ journal_entry  │
       │    │ glosa            │    │ account_id(FK)─┼──►┌──────────┐
       │    │ referencia_tipo  │    │ debito         │   │ accounts │
       │    │ referencia_id    │    │ credito        │   └──────────┘
       │    │ user_id (FK)     │    └────────────────┘
       │    └──────────────────┘
       │
       │    ┌──────────────────────┐   ┌──────────────────┐
       └────► system_notifications │   │ company_settings │
            │──────────────────────│   │──────────────────│
            │ id (PK)              │   │ company_name     │
            │ user_id (FK)         │   │ tax_id (NIT)     │
            │ tipo                 │   │ currency (COP)   │
            │ titulo               │   │ cpp_decimals     │
            │ mensaje              │   │ logo_path        │
            │ leida (bool)         │   └──────────────────┘
            └──────────────────────┘
```

**Resumen de tablas:**

| # | Tabla | Descripción |
|---|-------|-------------|
| 1 | `users` | Usuarios del sistema |
| 2 | `sessions` | (Tabla no utilizada en API Stateless) |
| 3 | `personal_access_tokens` | Tokens API (Sanctum) |
| 4 | `roles` | Roles (Administrador, Bodeguero, Usuario) |
| 5 | `permissions` | Permisos granulares (Spatie) |
| 6 | `model_has_roles` | Pivote usuario-rol |
| 7 | `model_has_permissions` | Pivote usuario-permiso |
| 8 | `role_has_permissions` | Pivote rol-permiso |
| 9 | `products` | Catálogo de productos |
| 10 | `categories` | Categorías de productos |
| 11 | `inventory_movements` | Trazabilidad de movimientos de stock |
| 12 | `cost_adjustments` | Historial de ajustes de costo promedio |
| 13 | `invoices` | Facturas de venta |
| 14 | `invoice_items` | Líneas de factura |
| 15 | `customers` | Clientes |
| 16 | `segments` | Segmentos de clientes (CRM) |
| 17 | `opportunities` | Oportunidades comerciales (pipeline) |
| 18 | `campaigns` | Campañas de marketing |
| 19 | `activities` | Actividades comerciales |
| 20 | `reminders` | Recordatorios |
| 21 | `purchases` | Órdenes de compra |
| 22 | `purchase_items` | Líneas de orden de compra |
| 23 | `purchase_payments` | Pagos parciales a proveedores |
| 24 | `suppliers` | Proveedores |
| 25 | `accounts` | Plan de cuentas contables |
| 26 | `journal_entries` | Asientos contables (libro diario) |
| 27 | `journal_items` | Partidas del asiento (débito/crédito) |
| 28 | `audit_logs` | Bitácora de auditoría de acciones |
| 29 | `company_settings` | Configuración global de la empresa |
| 30 | `system_notifications` | Notificaciones en tiempo real |
| 31 | `cache` | Caché de datos (Laravel) |
| 32 | `jobs` / `job_batches` | Cola de trabajos asincrónicos |

---

## 6. Seguridad implementada

### 6.1 Autenticación — Laravel Sanctum (Bearer Tokens)

El sistema migró a **Bearer Tokens con Laravel Sanctum**. El token se guarda en el `localStorage` y se envía por cabeceras (`Authorization: Bearer <token>`). Se eliminó la validación CSRF del lado del cliente (`api-adapter.js`) porque el sistema ahora es completamente "Stateless".

**Flujo de autenticación:**

1. El frontend envía `POST /api/v1/auth/login` con las credenciales.
2. Laravel valida y devuelve un token de acceso.
3. El frontend almacena el token en el `localStorage`.
4. Todas las peticiones subsiguientes incluyen el token en la cabecera `Authorization: Bearer <token>`. El servidor valida el token en cada request.

**Configuración de middleware:**
La aplicación opera estrictamente como una API REST. No se utiliza `$middleware->statefulApi()` ya que no hay persistencia basada en cookies de sesión. Todo request se autentica comprobando el token enviado en la cabecera `Authorization`.

### 6.2 Autorización — Control de Roles (Spatie Laravel Permission)

El modelo `User` implementa el trait `HasRoles` de Spatie. El middleware personalizado `RoleMiddleware` intercepta las rutas protegidas y verifica que el usuario autenticado posea al menos uno de los roles requeridos.

**Roles del sistema:**

| Rol | Descripción | Restricciones |
|-----|-------------|---------------|
| `Administrador` | Acceso total al sistema | Ninguna |
| `Vendedor` | Acceso a facturación e inventario | Sin acceso a compras, reportes avanzados ni administración |
| `Bodeguero` | Acceso a compras, proveedores y movimientos de inventario | Sin acceso a contabilidad, reportes avanzados ni administración de usuarios |
| `Usuario` | Acceso básico a inventario, facturación y CRM | Sin acceso a compras, contabilidad ni administración |

**Ejemplo de implementación en rutas:**
```php
// Solo Administrador puede acceder a contabilidad
Route::middleware('role:Administrador')->group(function () {
    Route::apiResource('accounts', AccountController::class);
    Route::apiResource('journal-entries', JournalEntryController::class);
});

// Administrador O Bodeguero pueden gestionar compras
Route::apiResource('purchases', PurchaseController::class)
    ->middleware('role:Administrador|Bodeguero');
```

**Lógica del `RoleMiddleware`:** Parsea el string de roles separados por `|` o `,` y verifica con `$user->hasAnyRole($requiredRoles)`. Retorna HTTP 401 si no está autenticado, HTTP 403 si no tiene el rol.

### 6.3 CORS — Cross-Origin Resource Sharing

Configurado en `config/cors.php`, restringiendo el acceso de orígenes externos de forma configurable por entorno a través de variables de entorno:

```php
// config/cors.php
'paths'               => ['api/*', 'sanctum/csrf-cookie'],
'allowed_methods'     => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
'allowed_origins'     => array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost'))),
'allowed_headers'     => ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-XSRF-TOKEN'],
'supports_credentials'=> env('CORS_SUPPORTS_CREDENTIALS', false),
'max_age'             => 3600, // Caché de preflight OPTIONS por 1 hora
```

En producción se configura únicamente el dominio del frontend real en `CORS_ALLOWED_ORIGINS`.

### 6.4 Validación de entradas

Todos los controladores usan `$request->validate()` de Laravel, que valida y sanitiza la entrada antes de cualquier operación. Las reglas incluyen: tipos de dato, longitudes máximas, unicidad en base de datos y relaciones existentes.

**Ejemplo del `AuthController`:**
```php
$validated = $request->validate([
    'nombre'   => 'required|string|max:80',
    'apellido' => 'required|string|max:80',
    'email'    => 'required|email|unique:users,email',
    'telefono' => 'required|string|max:20',
    'password' => 'required|string|min:8',
]);
```

Los errores de validación retornan HTTP 422 con estructura JSON uniforme `{success, message, data, errors}`, definida globalmente en `bootstrap/app.php`.

### 6.5 Protección de contraseñas

Las contraseñas se almacenan con **Bcrypt** a través del cast `'password' => 'hashed'` definido en el modelo `User`. El archivo `.env` configura `BCRYPT_ROUNDS=12` para mayor resistencia a ataques de fuerza bruta.

### 6.6 Auditoría de acciones

El servicio `AuditLogger` registra en la tabla `audit_logs` todas las acciones críticas (login, logout, registro, creación/modificación de recursos). Almacena: `user_id`, `action`, `entity_type`, `entity_id`, `description`, `metadata` (JSON), `ip_address` y `user_agent`.

### 6.7 Gestión de acceso y tokens

- Al operar de forma *Stateless*, el sistema no mantiene sesiones activas en el servidor.
- El endpoint de logout invalida el access token actual en la base de datos (tabla `personal_access_tokens`), obligando al cliente a obtener uno nuevo en el siguiente login.
- No se manejan tokens CSRF ni cookies de sesión tradicionales en ningún flujo.

### 6.8 Manejo de errores seguro

`APP_DEBUG=false` en producción. Los manejadores de excepciones en `bootstrap/app.php` devuelven mensajes genéricos en JSON para `ValidationException`, `AuthenticationException` y `NotFoundHttpException`, sin exponer stack traces.

### 6.9 Seguridad en frontend — CSP y SRI

Las páginas HTML incluyen Content Security Policy (CSP) para limitar orígenes de scripts, estilos, fuentes, imágenes y conexiones a la API. Los recursos externos cargados desde CDN usan Subresource Integrity (SRI) con atributos `integrity` y `crossorigin` para verificar la integridad del archivo.

---

## 7. Instrucciones de instalación

### 7.1 Prerequisitos del servidor

| Software | Versión mínima | Verificación |
|----------|----------------|-------------|
| PHP | 8.2 | `php --version` |
| Composer | 2.x | `composer --version` |
| Node.js | 18.x | Única y exclusivamente como herramienta de entorno local para la gestión de dependencias (NPM) y la compilación/optimización del frontend (Vite/Bootstrap 5). No hace parte del runtime del backend. |
| MySQL | 8.0 | `mysql --version` |
| Git | 2.x | `git --version` |

### 7.2 Pasos de instalación (entorno local)

```bash
# 1. Clonar el repositorio
git clone https://github.com/ArmandoCamacho15/MarketWorld.git
cd MarketWorld

# 2. Ingresar al directorio del backend
cd backend/marketworld-api

# 3. Instalar dependencias PHP
composer install

# 4. Copiar el archivo de configuración
cp .env.example .env

# 5. Generar la clave de aplicación
php artisan key:generate

# 6. Configurar la base de datos en .env
# Editar los valores:
# DB_DATABASE=marketworld_sena
# DB_USERNAME=tu_usuario
# DB_PASSWORD=tu_contraseña

# 7. Crear la base de datos en MySQL
mysql -u root -p -e "CREATE DATABASE marketworld_sena CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 8. Ejecutar las migraciones (crea las 32 tablas)
php artisan migrate

# 9. Ejecutar los seeders (crea roles, usuario admin inicial y cuentas contables)
php artisan db:seed

# 10. Configurar los orígenes en .env
# SANCTUM_STATEFUL_DOMAINS= (Dejar en blanco para forzar Stateless)
# CORS_ALLOWED_ORIGINS=http://localhost,http://127.0.0.1:5500
# CORS_SUPPORTS_CREDENTIALS=true

# 11. Iniciar el servidor de desarrollo
php artisan serve
# El backend estará disponible en: http://127.0.0.1:8000

# 12. Abrir el frontend
# Abrir html/Login.html con un servidor estático (ej: Live Server de VS Code en puerto 5500)
```

**Credenciales del administrador inicial (creadas por el seeder):**
```
Email:    admin@marketworld.com
Password: (valor de ADMIN_DEFAULT_PASSWORD en .env)
```
> ⚠️ **Cambiar la contraseña inmediatamente después del primer inicio de sesión.**

---

## 8. Instrucciones de despliegue en producción

El sistema se despliega utilizando una arquitectura en la nube (PaaS) para garantizar escalabilidad y evitar configuraciones manuales de servidores. Se hace uso de **DigitalOcean App Platform** para el backend y **Vercel** para el frontend.

### 8.1 Despliegue del Backend (DigitalOcean App Platform)

1. En DigitalOcean, crear una nueva "App" conectada al repositorio de GitHub.
2. Seleccionar la rama `main` y especificar el directorio fuente: `backend/marketworld-api`.
3. Agregar una base de datos administrada (Dev Database o superior).
4. Configurar las variables de entorno críticas en el panel:
   - `APP_ENV=production`
   - `APP_DEBUG=false`
   - `APP_KEY=base64:...`
   - `FRONTEND_URL=https://[DOMINIO_VERCEL].vercel.app`
   - `SANCTUM_STATEFUL_DOMAINS=` (Dejar en blanco para API pura)
5. Configurar el comando "Pre-Deploy" para ejecutar las migraciones: `php artisan migrate --force --seed`
6. El buildpack detectará automáticamente Laravel a través del archivo `Procfile` y el `composer.json`, y realizará el despliegue de la API y la conexión a MySQL.

### 8.2 Despliegue del Frontend (Vercel)

1. En el código local, actualizar el archivo `js/config.js` para apuntar a la URL generada por DigitalOcean:
   ```javascript
   const APP_CONFIG = {
       API_URL: 'https://marketworld-api-[hash].ondigitalocean.app/api/v1',
   };
   ```
2. Subir los cambios a GitHub.
3. En Vercel, importar el repositorio. Como es Vanilla JS, dejar el framework preset en "Other" y el directorio raíz por defecto.
4. Vercel generará una URL pública con certificado SSL automático (ej. `marketworld-erp.vercel.app`).
5. Asegurarse de que esta URL esté correctamente configurada en las variables `FRONTEND_URL` y `SANCTUM_STATEFUL_DOMAINS` de DigitalOcean para que CORS y las cookies funcionen.


### 8.2 Configuración del Servidor Web (Nginx/Apache)

*Nota: En producción, el despliegue es automatizado por DigitalOcean App Platform, por lo que la configuración de red y proxy inverso es administrada directamente por la infraestructura en la nube.*

```nginx
server {
    listen 443 ssl http2;
    server_name tu-dominio.com;
    root /var/www/marketworld/backend/marketworld-api/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

### 8.3 Comandos de mantenimiento

```bash
# Poner en modo mantenimiento (muestra mensaje amigable)
php artisan down --message="MarketWorld en mantenimiento. Regresamos en breve."

# Restaurar el sistema
php artisan up

# Limpiar todos los cachés
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Ver logs de errores en tiempo real
php artisan pail

# Ejecutar las pruebas automatizadas
php artisan test

# Crear respaldo de la base de datos
mysqldump -u usuario -p marketworld_produccion > backup_$(date +%Y%m%d).sql
```

---

## 9. Variables de entorno de referencia

El archivo `.env.example` en `backend/marketworld-api/` contiene la plantilla completa. Las variables más importantes para cada entorno son:

| Variable | Local | Producción | Descripción |
|----------|-------|------------|-------------|
| `APP_ENV` | `local` | `production` | Entorno de ejecución |
| `APP_DEBUG` | `true` | `false` | Mostrar errores detallados |
| `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | Valores locales (ej. `marketworld_sena`) | Credenciales encriptadas del clúster de DigitalOcean | En producción apuntan a las credenciales encriptadas del clúster de DigitalOcean. |
| `SANCTUM_STATEFUL_DOMAINS` | **ELIMINADO / EN BLANCO** | **ELIMINADO / EN BLANCO** | Se deja vacía para obligar a Sanctum a tratar al frontend de Vercel como un cliente API sin estado. |
| `CORS_ALLOWED_ORIGINS` | `http://127.0.0.1:5500` | `https://marketworld-erp.vercel.app` | Orígenes CORS permitidos |
| `BCRYPT_ROUNDS` | `12` | `12` | Rondas de hashing Bcrypt |
| `LOG_LEVEL` | `debug` | `warning` | Nivel de logging |

---

*Documento generado a partir del análisis directo del código fuente del proyecto MarketWorld ERP. Versión 1.0.0 — Mayo 2026.*
