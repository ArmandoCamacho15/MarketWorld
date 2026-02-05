# Documentación de Base de Datos

Este documento describe la estructura de la base de datos de MarketWorld.

---

## Información General

| Propiedad | Valor |
|-----------|-------|
| Motor | MySQL 8.0+ |
| Nombre | marketworld_sena |
| Codificación | utf8mb4 |
| Collation | utf8mb4_unicode_ci |

---

## Diagrama Entidad-Relación

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  usuarios   │       │  productos  │       │  clientes   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │       │ id (PK)     │
│ nombre      │       │ sku         │       │ nombre      │
│ apellido    │       │ nombre      │       │ documento   │
│ email       │       │ descripcion │       │ email       │
│ password    │       │ categoria   │       │ telefono    │
│ rol         │       │ precio_comp │       │ direccion   │
│ estado      │       │ precio_vent │       │ segmento    │
└─────────────┘       │ stock       │       └──────┬──────┘
       │              └──────┬──────┘              │
       │                     │                     │
       ▼                     ▼                     ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  facturas   │◄──────│  detalle    │       │ proveedores │
├─────────────┤       │  facturas   │       ├─────────────┤
│ id (PK)     │       ├─────────────┤       │ id (PK)     │
│ numero      │       │ id (PK)     │       │ nombre      │
│ cliente_id  │       │ factura_id  │       │ nit         │
│ usuario_id  │       │ producto_id │       │ contacto    │
│ total       │       │ cantidad    │       │ email       │
│ estado      │       │ subtotal    │       │ telefono    │
└─────────────┘       └─────────────┘       └──────┬──────┘
                                                   │
                                                   ▼
                                            ┌─────────────┐
                                            │  ordenes    │
                                            │  compra     │
                                            ├─────────────┤
                                            │ id (PK)     │
                                            │ proveedor_id│
                                            │ usuario_id  │
                                            │ total       │
                                            │ estado      │
                                            └─────────────┘
```

---

## Descripción de Tablas

### usuarios

Almacena la información del personal que utiliza el sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT | Identificador único (clave primaria) |
| nombre | VARCHAR(100) | Nombre del usuario |
| apellido | VARCHAR(100) | Apellido del usuario |
| email | VARCHAR(150) | Correo electrónico (único) |
| password | VARCHAR(255) | Contraseña encriptada |
| rol | ENUM | Administrador, Gerente, Vendedor, Soporte |
| departamento | VARCHAR(100) | Área de trabajo |
| telefono | VARCHAR(20) | Número de contacto |
| estado | ENUM | Activo, Inactivo, Pendiente |
| ultimo_acceso | DATETIME | Fecha del último inicio de sesión |
| fecha_creacion | TIMESTAMP | Fecha de registro |

---

### productos

Catálogo de todos los artículos disponibles para venta.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT | Identificador único (clave primaria) |
| sku | VARCHAR(50) | Código único del producto |
| nombre | VARCHAR(200) | Nombre del producto |
| descripcion | TEXT | Descripción detallada |
| categoria | VARCHAR(100) | Categoría del producto |
| precio_compra | DECIMAL(12,2) | Precio de adquisición |
| precio_venta | DECIMAL(12,2) | Precio de venta al público |
| stock | INT | Cantidad en inventario |
| stock_minimo | INT | Nivel mínimo de stock |
| iva | DECIMAL(5,2) | Porcentaje de impuesto |
| estado | ENUM | Activo, Inactivo |

---

### clientes

Información de los clientes del negocio.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT | Identificador único (clave primaria) |
| nombre | VARCHAR(200) | Nombre o razón social |
| documento | VARCHAR(50) | Número de identificación (único) |
| tipo_documento | ENUM | CC, NIT, CE, Pasaporte |
| email | VARCHAR(150) | Correo electrónico |
| telefono | VARCHAR(20) | Número de contacto |
| direccion | TEXT | Dirección de envío |
| ciudad | VARCHAR(100) | Ciudad |
| tipo_cliente | ENUM | Persona Natural, Empresa |
| segmento | ENUM | Nuevo, Frecuente, Premium, Corporativo |
| total_compras | INT | Cantidad de compras realizadas |
| valor_total | DECIMAL(15,2) | Valor acumulado de compras |

---

### proveedores

Datos de los proveedores de productos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT | Identificador único (clave primaria) |
| nombre | VARCHAR(200) | Nombre o razón social |
| nit | VARCHAR(50) | Número de identificación tributaria |
| contacto | VARCHAR(150) | Persona de contacto |
| email | VARCHAR(150) | Correo electrónico |
| telefono | VARCHAR(20) | Número de contacto |
| direccion | TEXT | Dirección |
| ciudad | VARCHAR(100) | Ciudad |
| total_compras | INT | Cantidad de órdenes |
| saldo_pendiente | DECIMAL(15,2) | Deuda pendiente |
| estado | ENUM | Activo, Inactivo |

---

### facturas

Documentos de venta emitidos a clientes.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT | Identificador único (clave primaria) |
| numero_factura | VARCHAR(50) | Número consecutivo (único) |
| cliente_id | INT | Referencia al cliente (FK) |
| usuario_id | INT | Vendedor que generó la factura (FK) |
| fecha_emision | DATE | Fecha de emisión |
| fecha_vencimiento | DATE | Fecha límite de pago |
| subtotal | DECIMAL(15,2) | Valor antes de impuestos |
| iva | DECIMAL(15,2) | Valor del impuesto |
| descuento | DECIMAL(15,2) | Descuento aplicado |
| total | DECIMAL(15,2) | Valor total a pagar |
| metodo_pago | ENUM | Efectivo, Tarjeta, Transferencia, Cheque |
| estado | ENUM | Pagada, Pendiente, Vencida, Anulada |

---

### detalle_facturas

Productos incluidos en cada factura.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT | Identificador único (clave primaria) |
| factura_id | INT | Referencia a la factura (FK) |
| producto_id | INT | Referencia al producto (FK) |
| cantidad | INT | Cantidad vendida |
| precio_unitario | DECIMAL(12,2) | Precio por unidad |
| subtotal | DECIMAL(15,2) | Cantidad x precio |
| iva | DECIMAL(15,2) | Impuesto del item |
| total | DECIMAL(15,2) | Total del item |

---

### ordenes_compra

Órdenes de compra a proveedores.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT | Identificador único (clave primaria) |
| numero_orden | VARCHAR(50) | Número de orden (único) |
| proveedor_id | INT | Referencia al proveedor (FK) |
| usuario_id | INT | Usuario que creó la orden (FK) |
| fecha_orden | DATE | Fecha de la orden |
| subtotal | DECIMAL(15,2) | Valor antes de impuestos |
| iva | DECIMAL(15,2) | Valor del impuesto |
| total | DECIMAL(15,2) | Valor total |
| estado | ENUM | Pendiente, Recibido, Pagado, Cancelado |
| saldo_pendiente | DECIMAL(15,2) | Monto por pagar |

---

### movimientos_inventario

Registro de cambios en el stock de productos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT | Identificador único (clave primaria) |
| producto_id | INT | Referencia al producto (FK) |
| tipo_movimiento | ENUM | Entrada, Salida, Ajuste |
| cantidad | INT | Cantidad del movimiento |
| referencia | VARCHAR(100) | Documento de referencia |
| descripcion | TEXT | Motivo del movimiento |
| usuario_id | INT | Usuario responsable (FK) |
| fecha_movimiento | TIMESTAMP | Fecha y hora del movimiento |

---

## Relaciones

| Tabla origen | Campo | Tabla destino | Campo |
|--------------|-------|---------------|-------|
| facturas | cliente_id | clientes | id |
| facturas | usuario_id | usuarios | id |
| detalle_facturas | factura_id | facturas | id |
| detalle_facturas | producto_id | productos | id |
| ordenes_compra | proveedor_id | proveedores | id |
| ordenes_compra | usuario_id | usuarios | id |
| movimientos_inventario | producto_id | productos | id |
| movimientos_inventario | usuario_id | usuarios | id |

---

## Índices

Cada tabla cuenta con índices para optimizar las consultas frecuentes:

- Claves primarias (`id`)
- Campos únicos (`email`, `sku`, `documento`, `nit`, `numero_factura`)
- Claves foráneas
- Campos de estado y categoría

---

## Comandos Útiles

### Crear la base de datos

```sql
mysql -u root -p < marketworld_base_de_datos/schema/marketworld_schema.sql
```

### Conectar a la base de datos

```sql
mysql -u root -p marketworld_sena
```

### Ver estructura de una tabla

```sql
DESCRIBE productos;
```

### Listar todas las tablas

```sql
SHOW TABLES;
```

---

## Notas

- Todas las tablas usan el motor InnoDB para soporte de transacciones
- Las contraseñas deben almacenarse encriptadas (bcrypt recomendado)
- Los campos de fecha usan TIMESTAMP para registro automático
- Se recomienda realizar respaldos periódicos de la base de datos
