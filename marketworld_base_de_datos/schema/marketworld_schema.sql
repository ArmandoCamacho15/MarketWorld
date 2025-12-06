-- ===========================
-- BASE DE DATOS MARKETWORLD 
-- ===========================

-- Eliminar base de datos si existe y crear nueva
DROP DATABASE IF EXISTS marketworld_sena;
CREATE DATABASE marketworld_sena CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE marketworld_sena;

-- ===========================
-- TABLA: usuarios
-- ===========================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol ENUM('Administrador', 'Gerente', 'Vendedor', 'Soporte') DEFAULT 'Vendedor',
    departamento VARCHAR(100),
    telefono VARCHAR(20),
    estado ENUM('Activo', 'Inactivo', 'Pendiente') DEFAULT 'Activo',
    ultimo_acceso DATETIME,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_rol (rol),
    INDEX idx_estado (estado)
) ENGINE=InnoDB;

-- ===========================
-- TABLA: productos
-- ===========================
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(100),
    precio_compra DECIMAL(12, 2) NOT NULL,
    precio_venta DECIMAL(12, 2) NOT NULL,
    stock INT DEFAULT 0,
    stock_minimo INT DEFAULT 10,
    iva DECIMAL(5, 2) DEFAULT 19.00,
    imagen_url VARCHAR(255),
    estado ENUM('Activo', 'Inactivo') DEFAULT 'Activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sku (sku),
    INDEX idx_categoria (categoria),
    INDEX idx_estado (estado)
) ENGINE=InnoDB;

-- ===========================
-- TABLA: clientes
-- ===========================
CREATE TABLE clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    documento VARCHAR(50) UNIQUE NOT NULL,
    tipo_documento ENUM('CC', 'NIT', 'CE', 'Pasaporte') DEFAULT 'CC',
    email VARCHAR(150),
    telefono VARCHAR(20),
    direccion TEXT,
    ciudad VARCHAR(100),
    tipo_cliente ENUM('Persona Natural', 'Empresa') DEFAULT 'Persona Natural',
    segmento ENUM('Nuevo', 'Frecuente', 'Premium', 'Corporativo') DEFAULT 'Nuevo',
    estado ENUM('Activo', 'Inactivo') DEFAULT 'Activo',
    total_compras INT DEFAULT 0,
    valor_total DECIMAL(15, 2) DEFAULT 0.00,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_documento (documento),
    INDEX idx_segmento (segmento),
    INDEX idx_estado (estado)
) ENGINE=InnoDB;

-- ===========================
-- TABLA: proveedores
-- ===========================
CREATE TABLE proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    nit VARCHAR(50) UNIQUE NOT NULL,
    contacto VARCHAR(150),
    email VARCHAR(150),
    telefono VARCHAR(20),
    direccion TEXT,
    ciudad VARCHAR(100),
    total_compras INT DEFAULT 0,
    saldo_pendiente DECIMAL(15, 2) DEFAULT 0.00,
    estado ENUM('Activo', 'Inactivo') DEFAULT 'Activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nit (nit),
    INDEX idx_estado (estado)
) ENGINE=InnoDB;

-- ===========================
-- TABLA: facturas
-- ===========================
CREATE TABLE facturas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_factura VARCHAR(50) UNIQUE NOT NULL,
    cliente_id INT NOT NULL,
    usuario_id INT NOT NULL,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE,
    subtotal DECIMAL(15, 2) NOT NULL,
    iva DECIMAL(15, 2) DEFAULT 0.00,
    descuento DECIMAL(15, 2) DEFAULT 0.00,
    total DECIMAL(15, 2) NOT NULL,
    metodo_pago ENUM('Efectivo', 'Tarjeta', 'Transferencia', 'Cheque') DEFAULT 'Efectivo',
    estado ENUM('Pagada', 'Pendiente', 'Vencida', 'Anulada') DEFAULT 'Pendiente',
    observaciones TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    INDEX idx_numero_factura (numero_factura),
    INDEX idx_cliente (cliente_id),
    INDEX idx_estado (estado),
    INDEX idx_fecha_emision (fecha_emision)
) ENGINE=InnoDB;

-- ===========================
-- TABLA: detalle_facturas
-- ===========================
CREATE TABLE detalle_facturas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    factura_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    iva DECIMAL(15, 2) DEFAULT 0.00,
    total DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
    INDEX idx_factura (factura_id),
    INDEX idx_producto (producto_id)
) ENGINE=InnoDB;

-- ===========================
-- TABLA: ordenes_compra
-- ===========================
CREATE TABLE ordenes_compra (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_orden VARCHAR(50) UNIQUE NOT NULL,
    proveedor_id INT NOT NULL,
    usuario_id INT NOT NULL,
    fecha_orden DATE NOT NULL,
    fecha_vencimiento DATE,
    subtotal DECIMAL(15, 2) NOT NULL,
    iva DECIMAL(15, 2) DEFAULT 0.00,
    descuento DECIMAL(15, 2) DEFAULT 0.00,
    total DECIMAL(15, 2) NOT NULL,
    estado ENUM('Pendiente', 'Recibido', 'Pagado', 'Cancelado') DEFAULT 'Pendiente',
    saldo_pendiente DECIMAL(15, 2),
    observaciones TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    INDEX idx_numero_orden (numero_orden),
    INDEX idx_proveedor (proveedor_id),
    INDEX idx_estado (estado)
) ENGINE=InnoDB;

-- ===========================
-- TABLA: detalle_ordenes_compra
-- ===========================
CREATE TABLE detalle_ordenes_compra (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orden_compra_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
    INDEX idx_orden (orden_compra_id),
    INDEX idx_producto (producto_id)
) ENGINE=InnoDB;

-- ===========================
-- TABLA: movimientos_inventario
-- ===========================
CREATE TABLE movimientos_inventario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    tipo_movimiento ENUM('Entrada', 'Salida', 'Ajuste') NOT NULL,
    cantidad INT NOT NULL,
    referencia VARCHAR(100),
    descripcion TEXT,
    usuario_id INT NOT NULL,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    INDEX idx_producto (producto_id),
    INDEX idx_tipo (tipo_movimiento),
    INDEX idx_fecha (fecha_movimiento)
) ENGINE=InnoDB;

-- ===========================
-- TABLA: asientos_contables
-- ===========================
CREATE TABLE asientos_contables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_asiento VARCHAR(50) UNIQUE NOT NULL,
    fecha DATE NOT NULL,
    descripcion TEXT NOT NULL,
    tipo ENUM('Manual', 'Automático') DEFAULT 'Manual',
    estado ENUM('Registrado', 'Anulado') DEFAULT 'Registrado',
    usuario_id INT NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    INDEX idx_numero_asiento (numero_asiento),
    INDEX idx_fecha (fecha),
    INDEX idx_estado (estado)
) ENGINE=InnoDB;

-- ===========================
-- TABLA: detalle_asientos
-- ===========================
CREATE TABLE detalle_asientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asiento_id INT NOT NULL,
    cuenta VARCHAR(100) NOT NULL,
    debe DECIMAL(15, 2) DEFAULT 0.00,
    haber DECIMAL(15, 2) DEFAULT 0.00,
    FOREIGN KEY (asiento_id) REFERENCES asientos_contables(id) ON DELETE CASCADE,
    INDEX idx_asiento (asiento_id)
) ENGINE=InnoDB;

-- ===========================
-- INSERTAR DATOS DE PRUEBA
-- ===========================

-- Usuario administrador
INSERT INTO usuarios (nombre, apellido, email, password, rol, departamento, telefono, estado) VALUES
('Juan', 'Pérez', 'admin@marketworld.com', '$2y$10$encrypted', 'Administrador', 'Administración', '(601) 234-5678', 'Activo'),
('María', 'Gómez', 'maria.gomez@marketworld.com', '$2y$10$encrypted', 'Vendedor', 'Ventas', '(604) 456-7890', 'Activo'),
('Carlos', 'Mendoza', 'carlos.mendoza@marketworld.com', '$2y$10$encrypted', 'Soporte', 'Soporte', '(601) 789-0123', 'Pendiente');

-- Productos de ejemplo
INSERT INTO productos (sku, nombre, descripcion, categoria, precio_compra, precio_venta, stock, stock_minimo, iva) VALUES
('ELEC-1001', 'Laptop HP ProBook', 'Laptop empresarial HP ProBook', 'Electrónica', 1150000, 1250000, 15, 5, 19.00),
('ELEC-1002', 'Mouse Logitech', 'Mouse inalámbrico Logitech', 'Electrónica', 35000, 45000, 25, 10, 19.00),
('ALIM-2001', 'Arroz Diana 500g', 'Arroz blanco premium', 'Alimentos', 2800, 3500, 120, 50, 0.00),
('OFIC-3001', 'Cuaderno Universitario', 'Cuaderno 100 hojas', 'Oficina', 4200, 5500, 45, 20, 19.00);

-- Clientes de ejemplo
INSERT INTO clientes (nombre, documento, tipo_documento, email, telefono, ciudad, tipo_cliente, segmento) VALUES
('Juan Pérez García', '1234567890', 'CC', 'juan.perez@email.com', '(601) 234-5678', 'Bogotá', 'Persona Natural', 'Premium'),
('María Rodríguez S.A.S.', '900123456-1', 'NIT', 'contacto@mariarodriguez.com', '(604) 456-7890', 'Medellín', 'Empresa', 'Corporativo');

-- Proveedores de ejemplo
INSERT INTO proveedores (nombre, nit, contacto, email, telefono, ciudad) VALUES
('Tecnología Global S.A.', '900123456-1', 'Carlos Mendoza', 'carlos@tecnoglobal.com', '(601) 345-6789', 'Bogotá'),
('Distribuidora Alimentos S.A.S.', '800987654-2', 'María Rodríguez', 'maria@distribalimentos.com', '(604) 456-7890', 'Medellín');

-- ===========================
-- VERIFICACIÓN FINAL
-- ===========================
SELECT 'Base de datos MarketWorld creada exitosamente' AS Status;
SHOW TABLES;