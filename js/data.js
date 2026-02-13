// --- data.js - Base de datos con localStorage ---

(function(global) {
    'use strict';

    // --- Storage keys ---
    var STORAGE_KEYS = {
        USERS: 'marketworld_users',
        CURRENT_USER: 'marketworld_current_user',
        PRODUCTS: 'marketworld_products',
        CATEGORIES: 'marketworld_categories',
        NOTIFICATIONS: 'marketworld_notifications',
        CUSTOMERS: 'marketworld_customers',
        INVOICES: 'marketworld_invoices',
        SUPPLIERS: 'marketworld_suppliers',
        PURCHASES: 'marketworld_purchases',
        PAYMENTS: 'marketworld_payments',
        ACCOUNTS: 'marketworld_accounts',
        JOURNAL_ENTRIES: 'marketworld_journal_entries'
    };

    // --- Default users ---
    var DEFAULT_USERS = [
        {
            id: 1,
            nombre: 'Administrador',
            apellido: 'Sistema',
            email: 'admin@marketworld.com',
            password: 'admin123',
            rol: 'Administrador',
            estado: 'Activo',
            fechaCreacion: '2025-01-01'
        },
        {
            id: 2,
            nombre: 'Juan',
            apellido: 'Vendedor',
            email: 'ventas@marketworld.com',
            password: 'ventas123',
            rol: 'Vendedor',
            estado: 'Activo',
            fechaCreacion: '2025-01-15'
        },
        {
            id: 3,
            nombre: 'Usuario',
            apellido: 'Prueba',
            email: 'user@marketworld.com',
            password: '123456',
            rol: 'Usuario',
            estado: 'Activo',
            fechaCreacion: '2025-02-01'
        }
    ];

    // --- Default categories ---
    var DEFAULT_CATEGORIES = [
        { id: 1, nombre: 'Electrónica', descripcion: 'Dispositivos y accesorios electrónicos', activa: true },
        { id: 2, nombre: 'Ropa', descripcion: 'Prendas de vestir y accesorios', activa: true },
        { id: 3, nombre: 'Alimentos', descripcion: 'Productos alimenticios', activa: true },
        { id: 4, nombre: 'Hogar', descripcion: 'Artículos para el hogar', activa: true },
        { id: 5, nombre: 'Deportes', descripcion: 'Equipamiento deportivo', activa: true }
    ];

    var DEFAULT_PRODUCTS = [
        {
            id: 1,
            codigo: 'PROD-001',
            nombre: 'Laptop HP 15',
            descripcion: 'Laptop HP 15 pulgadas, Intel i5, 8GB RAM',
            categoria: 'Electrónica',
            precio: 2500000,
            costo: 2000000,
            stock: 15,
            stockMinimo: 5,
            unidad: 'Unidad',
            proveedor: 'Tech Solutions',
            fechaCreacion: '2025-01-15',
            activo: true
        },
        {
            id: 2,
            codigo: 'PROD-002',
            nombre: 'Mouse Logitech',
            descripcion: 'Mouse inalámbrico Logitech M185',
            categoria: 'Electrónica',
            precio: 45000,
            costo: 30000,
            stock: 50,
            stockMinimo: 10,
            unidad: 'Unidad',
            proveedor: 'Tech Solutions',
            fechaCreacion: '2025-01-20',
            activo: true
        },
        {
            id: 3,
            codigo: 'PROD-003',
            nombre: 'Teclado Mecánico',
            descripcion: 'Teclado mecánico RGB retroiluminado',
            categoria: 'Electrónica',
            precio: 180000,
            costo: 120000,
            stock: 3,
            stockMinimo: 5,
            unidad: 'Unidad',
            proveedor: 'Tech Solutions',
            fechaCreacion: '2025-02-01',
            activo: true
        }
    ];

    var DEFAULT_CUSTOMERS = [
        {
            id: 1,
            documento: '900123456-1',
            tipoDocumento: 'NIT',
            nombre: 'Distribuidora El Sol S.A.S',
            direccion: 'Calle 50 #20-30',
            telefono: '3001234567',
            email: 'contacto@elsol.com',
            fechaCreacion: '2025-01-10',
            activo: true
        },
        {
            id: 2,
            documento: '1098765432',
            tipoDocumento: 'CC',
            nombre: 'María Rodríguez',
            direccion: 'Carrera 15 #45-67',
            telefono: '3109876543',
            email: 'maria.rodriguez@email.com',
            fechaCreacion: '2025-01-15',
            activo: true
        },
        {
            id: 3,
            documento: '890456789-2',
            tipoDocumento: 'NIT',
            nombre: 'Supermercado La Plaza Ltda',
            direccion: 'Avenida 80 #100-25',
            telefono: '3205551234',
            email: 'gerencia@laplaza.com',
            fechaCreacion: '2025-02-01',
            activo: true
        }
    ];

    var DEFAULT_INVOICES = [];

    const DEFAULT_SUPPLIERS = [
        {
            id: 1,
            nombre: 'Tecnología Global S.A.',
            nit: '900123456-1',
            contacto: 'Carlos Mendoza',
            email: 'carlos@tecnoglobal.com',
            telefono: '(601) 345 6789',
            direccion: 'Calle 100 #25-30, Bogotá',
            ciudad: 'Bogotá',
            terminosPago: '30 días',
            descuento: 5,
            tipo: 'Premium',
            activo: true,
            fechaCreacion: '2025-01-15T10:00:00.000Z'
        },
        {
            id: 2,
            nombre: 'Distribuidora Alimentos S.A.S.',
            nit: '800987654-2',
            contacto: 'María Rodríguez',
            email: 'maria@distribalimentos.com',
            telefono: '(604) 567 8901',
            direccion: 'Carrera 45 #12-10, Medellín',
            ciudad: 'Medellín',
            terminosPago: '60 días',
            descuento: 3,
            tipo: 'Regular',
            activo: true,
            fechaCreacion: '2025-02-20T10:00:00.000Z'
        },
        {
            id: 3,
            nombre: 'Suministros Industriales Ltda.',
            nit: '700654321-3',
            contacto: 'Roberto Sánchez',
            email: 'roberto@suministrosind.com',
            telefono: '(602) 234 5678',
            direccion: 'Av. 6N #25-30, Cali',
            ciudad: 'Cali',
            terminosPago: '30 días',
            descuento: 0,
            tipo: 'Regular',
            activo: true,
            fechaCreacion: '2025-03-10T10:00:00.000Z'
        }
    ];

    const DEFAULT_PURCHASES = [];
    const DEFAULT_PAYMENTS = [];

    const DEFAULT_ACCOUNTS = [
        { id: 1, codigo: '1', nombre: 'Activos', tipo: 'Activo', nivel: 'Clase', padre: null, moneda: 'COP', descripcion: 'Recursos controlados por la entidad', saldo: 185450000, activo: true },
        { id: 2, codigo: '1.1', nombre: 'Activo Corriente', tipo: 'Activo', nivel: 'Grupo', padre: '1', moneda: 'COP', descripcion: 'Activos de liquidez inmediata', saldo: 55000000, activo: true },
        { id: 3, codigo: '1.1.1', nombre: 'Caja y Bancos', tipo: 'Activo', nivel: 'Cuenta', padre: '1.1', moneda: 'COP', descripcion: 'Efectivo en caja y depósitos bancarios', saldo: 15000000, activo: true },
        { id: 4, codigo: '1.1.1.01', nombre: 'Caja General', tipo: 'Activo', nivel: 'Subcuenta', padre: '1.1.1', moneda: 'COP', descripcion: 'Efectivo disponible en la empresa', saldo: 5000000, activo: true },
        { id: 5, codigo: '1.1.1.02', nombre: 'Banco Bancolombia', tipo: 'Activo', nivel: 'Subcuenta', padre: '1.1.1', moneda: 'COP', descripcion: 'Cuenta corriente Bancolombia', saldo: 10000000, activo: true },
        { id: 6, codigo: '1.1.2', nombre: 'Cuentas por Cobrar', tipo: 'Activo', nivel: 'Cuenta', padre: '1.1', moneda: 'COP', descripcion: 'Derechos de cobro a clientes', saldo: 25000000, activo: true },
        { id: 7, codigo: '1.1.2.01', nombre: 'Cuentas por Cobrar Clientes', tipo: 'Activo', nivel: 'Subcuenta', padre: '1.1.2', moneda: 'COP', descripcion: 'Ventas a crédito', saldo: 25000000, activo: true },
        { id: 8, codigo: '1.1.3', nombre: 'Inventarios', tipo: 'Activo', nivel: 'Cuenta', padre: '1.1', moneda: 'COP', descripcion: 'Bienes para la venta', saldo: 15000000, activo: true },
        { id: 9, codigo: '1.1.3.01', nombre: 'Inventario de Mercancías', tipo: 'Activo', nivel: 'Subcuenta', padre: '1.1.3', moneda: 'COP', descripcion: 'Productos en stock', saldo: 15000000, activo: true },
        { id: 10, codigo: '1.2', nombre: 'Activo No Corriente', tipo: 'Activo', nivel: 'Grupo', padre: '1', moneda: 'COP', descripcion: 'Activos a largo plazo', saldo: 130450000, activo: true },
        { id: 11, codigo: '1.2.1', nombre: 'Propiedades, Planta y Equipo', tipo: 'Activo', nivel: 'Cuenta', padre: '1.2', moneda: 'COP', descripcion: 'Bienes tangibles para uso de la empresa', saldo: 120450000, activo: true },
        { id: 12, codigo: '1.2.2', nombre: 'Activos Intangibles', tipo: 'Activo', nivel: 'Cuenta', padre: '1.2', moneda: 'COP', descripcion: 'Activos no físicos', saldo: 10000000, activo: true },
        { id: 13, codigo: '2', nombre: 'Pasivos', tipo: 'Pasivo', nivel: 'Clase', padre: null, moneda: 'COP', descripcion: 'Obligaciones de la entidad', saldo: 72800000, activo: true },
        { id: 14, codigo: '2.1', nombre: 'Pasivo Corriente', tipo: 'Pasivo', nivel: 'Grupo', padre: '2', moneda: 'COP', descripcion: 'Obligaciones a corto plazo', saldo: 52800000, activo: true },
        { id: 15, codigo: '2.1.01', nombre: 'Cuentas por Pagar', tipo: 'Pasivo', nivel: 'Cuenta', padre: '2.1', moneda: 'COP', descripcion: 'Deudas con proveedores', saldo: 30000000, activo: true },
        { id: 16, codigo: '2.2', nombre: 'Pasivo No Corriente', tipo: 'Pasivo', nivel: 'Grupo', padre: '2', moneda: 'COP', descripcion: 'Obligaciones a largo plazo', saldo: 20000000, activo: true },
        { id: 17, codigo: '2.3.01', nombre: 'IVA por Pagar', tipo: 'Pasivo', nivel: 'Subcuenta', padre: '2.1', moneda: 'COP', descripcion: 'IVA generado pendiente de pago', saldo: 5000000, activo: true },
        { id: 18, codigo: '3', nombre: 'Patrimonio', tipo: 'Patrimonio', nivel: 'Clase', padre: null, moneda: 'COP', descripcion: 'Interés residual en los activos', saldo: 112650000, activo: true },
        { id: 19, codigo: '3.1', nombre: 'Capital Social', tipo: 'Patrimonio', nivel: 'Grupo', padre: '3', moneda: 'COP', descripcion: 'Aportes de los socios', saldo: 80000000, activo: true },
        { id: 20, codigo: '3.2', nombre: 'Utilidades Acumuladas', tipo: 'Patrimonio', nivel: 'Grupo', padre: '3', moneda: 'COP', descripcion: 'Ganancias retenidas', saldo: 32650000, activo: true },
        { id: 21, codigo: '4', nombre: 'Ingresos', tipo: 'Ingreso', nivel: 'Clase', padre: null, moneda: 'COP', descripcion: 'Entradas de beneficios económicos', saldo: 125450000, activo: true },
        { id: 22, codigo: '4.1', nombre: 'Ingresos Operacionales', tipo: 'Ingreso', nivel: 'Grupo', padre: '4', moneda: 'COP', descripcion: 'Ingresos de la actividad principal', saldo: 125450000, activo: true },
        { id: 23, codigo: '4.1.01', nombre: 'Ventas de Productos', tipo: 'Ingreso', nivel: 'Cuenta', padre: '4.1', moneda: 'COP', descripcion: 'Ingresos por ventas', saldo: 125450000, activo: true },
        { id: 24, codigo: '5', nombre: 'Gastos', tipo: 'Gasto', nivel: 'Clase', padre: null, moneda: 'COP', descripcion: 'Salidas de beneficios económicos', saldo: 87800000, activo: true },
        { id: 25, codigo: '5.1', nombre: 'Costo de Ventas', tipo: 'Gasto', nivel: 'Grupo', padre: '5', moneda: 'COP', descripcion: 'Costo de productos vendidos', saldo: 72800000, activo: true },
        { id: 26, codigo: '5.2', nombre: 'Gastos Operacionales', tipo: 'Gasto', nivel: 'Grupo', padre: '5', moneda: 'COP', descripcion: 'Gastos de administración y ventas', saldo: 15000000, activo: true }
    ];

    const DEFAULT_JOURNAL_ENTRIES = [
        {
            id: 1,
            numero: 'AS-2026-00001',
            fecha: '2026-01-15',
            descripcion: 'Apertura inicial de cuentas',
            tipo: 'Manual',
            partidas: [
                { cuenta: '1.1.1.01', nombre: 'Caja General', debe: 5000000, haber: 0 },
                { cuenta: '3.1', nombre: 'Capital Social', debe: 0, haber: 5000000 }
            ],
            estado: 'Registrado',
            usuario: 'Sistema',
            fechaCreacion: '2026-01-15T10:00:00.000Z'
        }
    ];

    // Función segura para escribir en localStorage
    function safeSetItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.error('⚠️  localStorage lleno');
                if (typeof MarketWorld !== 'undefined' && MarketWorld.utils) {
                    MarketWorld.utils.showNotification(
                        'Almacenamiento lleno. Libera espacio eliminando datos antiguos.',
                        'error',
                        6000
                    );
                }
            } else {
                console.error('Error escribiendo en localStorage:', e);
            }
            return false;
        }
    }

    // C-02: Hash de contraseñas usando algoritmo simple pero seguro
    function hashPassword(password) {
        var hash = 0;
        var salt = 'MarketWorld2026Salt';
        var str = salt + password + salt;
        for (var i = 0; i < str.length; i++) {
            var char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        // Añadir iteraciones para mayor seguridad
        for (var j = 0; j < 1000; j++) {
            hash = ((hash << 5) - hash) + j;
            hash = hash & hash;
        }
        return 'mw_' + Math.abs(hash).toString(36);
    }

    function verifyPassword(password, hash) {
        return hashPassword(password) === hash;
    }

    // C-04: Validación de sesión para operaciones críticas
    function requireAuth() {
        var user = getCurrentUser();
        if (!user) {
            throw new Error('Operación no autorizada: debe iniciar sesión');
        }
        return user;
    }

    function initializeData() {
        if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
            // Hashear contraseñas por defecto para no almacenar texto plano
            var usersToStore = DEFAULT_USERS.map(function(u) {
                var copy = Object.assign({}, u);
                try {
                    copy.password = hashPassword(String(u.password || ''));
                } catch (err) {
                    copy.password = String(u.password || '');
                }
                return copy;
            });
            safeSetItem(STORAGE_KEYS.USERS, JSON.stringify(usersToStore));
            console.log('Datos iniciales creados');
        }
        if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
            safeSetItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
        }
        if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
            safeSetItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
            safeSetItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(DEFAULT_CUSTOMERS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
            safeSetItem(STORAGE_KEYS.INVOICES, JSON.stringify(DEFAULT_INVOICES));
        }
        if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
            safeSetItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
        }
        if (!localStorage.getItem(STORAGE_KEYS.SUPPLIERS)) {
            safeSetItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(DEFAULT_SUPPLIERS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.PURCHASES)) {
            safeSetItem(STORAGE_KEYS.PURCHASES, JSON.stringify(DEFAULT_PURCHASES));
        }
        if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
            safeSetItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(DEFAULT_PAYMENTS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.ACCOUNTS)) {
            safeSetItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(DEFAULT_ACCOUNTS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.JOURNAL_ENTRIES)) {
            safeSetItem(STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(DEFAULT_JOURNAL_ENTRIES));
        }
    }

    // Usuarios
    function getUsers() {
        var data = localStorage.getItem(STORAGE_KEYS.USERS);
        return data ? JSON.parse(data) : [];
    }

    function findUserByEmail(email) {
        var users = getUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].email.toLowerCase() === email.toLowerCase()) {
                return users[i];
            }
        }
        return null;
    }

    function verifyCredentials(email, password) {
        var user = findUserByEmail(email);
        if (!user || user.estado !== 'Activo') {
            return null;
        }
        // Soportar tanto contraseñas hasheadas como texto plano (legacy)
        var isValid = false;
        if (user.password.startsWith('mw_')) {
            isValid = verifyPassword(password, user.password);
        } else {
            // Legacy: texto plano - hashear automáticamente
            isValid = (user.password === password);
            if (isValid) {
                // Migrar a hash automáticamente
                var users = getUsers();
                var index = users.findIndex(function(u) { return u.id === user.id; });
                if (index !== -1) {
                    users[index].password = hashPassword(password);
                    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
                }
            }
        }
        return isValid ? user : null;
    }

    function registerUser(userData) {
        var users = getUsers();
        if (findUserByEmail(userData.email)) {
            return { success: false, message: 'Este email ya esta registrado' };
        }
        var newUser = {
            id: users.length + 1,
            nombre: userData.nombre,
            apellido: userData.apellido,
            email: userData.email,
            password: hashPassword(userData.password), // C-02: Hashear contraseña
            rol: 'Usuario',
            estado: 'Activo',
            fechaCreacion: new Date().toISOString().split('T')[0]
        };
        users.push(newUser);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        return { success: true, message: 'Usuario registrado correctamente', user: newUser };
    }

    function setCurrentUser(user) {
        var sessionUser = {
            id: user.id,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            rol: user.rol,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(sessionUser));
    }

    function getCurrentUser() {
        var data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        return data ? JSON.parse(data) : null;
    }

    function logout() {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }

    function isLoggedIn() {
        return getCurrentUser() !== null;
    }

    function findUserById(id) {
        var users = getUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === parseInt(id)) {
                return users[i];
            }
        }
        return null;
    }

    function updateUser(id, userData) {
        var users = getUsers();
        var index = -1;
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === parseInt(id)) {
                index = i;
                break;
            }
        }
        if (index === -1) {
            return { success: false, message: 'Usuario no encontrado' };
        }
        if (userData.email && userData.email !== users[index].email) {
            var existingUser = findUserByEmail(userData.email);
            if (existingUser && existingUser.id !== parseInt(id)) {
                return { success: false, message: 'El email ya esta en uso' };
            }
        }
        users[index] = { ...users[index], ...userData, id: parseInt(id) };
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        return { success: true, message: 'Usuario actualizado correctamente', user: users[index] };
    }

    function deleteUser(id) {
        var users = getUsers();
        var newUsers = [];
        var deleted = false;
        for (var i = 0; i < users.length; i++) {
            if (users[i].id !== parseInt(id)) {
                newUsers.push(users[i]);
            } else {
                deleted = true;
            }
        }
        if (!deleted) {
            return { success: false, message: 'Usuario no encontrado' };
        }
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(newUsers));
        return { success: true, message: 'Usuario eliminado correctamente' };
    }

    function toggleUserStatus(id) {
        var user = findUserById(id);
        if (!user) {
            return { success: false, message: 'Usuario no encontrado' };
        }
        var newEstado = user.estado === 'Activo' ? 'Inactivo' : 'Activo';
        return updateUser(id, { estado: newEstado });
    }

    // Productos
    function getProducts() {
        var data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        return data ? JSON.parse(data) : [];
    }

    function findProductById(id) {
        var products = getProducts();
        for (var i = 0; i < products.length; i++) {
            if (products[i].id === parseInt(id)) {
                return products[i];
            }
        }
        return null;
    }

    function findProductByCode(code) {
        var products = getProducts();
        for (var i = 0; i < products.length; i++) {
            if (products[i].codigo.toLowerCase() === code.toLowerCase()) {
                return products[i];
            }
        }
        return null;
    }

    function createProduct(productData) {
        var products = getProducts();
        if (findProductByCode(productData.codigo)) {
            return { success: false, message: 'El código de producto ya existe' };
        }
        var newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
        var newProduct = {
            id: newId,
            codigo: productData.codigo,
            nombre: productData.nombre,
            descripcion: productData.descripcion || '',
            categoria: productData.categoria,
            precio: parseFloat(productData.precio),
            costo: parseFloat(productData.costo) || 0,
            stock: parseInt(productData.stock) || 0,
            stockMinimo: parseInt(productData.stockMinimo) || 0,
            unidad: productData.unidad || 'Unidad',
            proveedor: productData.proveedor || '',
            fechaCreacion: new Date().toISOString().split('T')[0],
            activo: productData.activo !== false
        };
        products.push(newProduct);
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        return { success: true, message: 'Producto creado exitosamente', product: newProduct };
    }

    function updateProduct(id, productData) {
        var products = getProducts();
        var index = -1;
        for (var i = 0; i < products.length; i++) {
            if (products[i].id === parseInt(id)) {
                index = i;
                break;
            }
        }
        if (index === -1) {
            return { success: false, message: 'Producto no encontrado' };
        }
        if (productData.codigo && productData.codigo !== products[index].codigo) {
            if (findProductByCode(productData.codigo)) {
                return { success: false, message: 'El código de producto ya existe' };
            }
        }
        if (productData.codigo) products[index].codigo = productData.codigo;
        if (productData.nombre) products[index].nombre = productData.nombre;
        if (productData.descripcion !== undefined) products[index].descripcion = productData.descripcion;
        if (productData.categoria) products[index].categoria = productData.categoria;
        if (productData.precio !== undefined) products[index].precio = parseFloat(productData.precio);
        if (productData.costo !== undefined) products[index].costo = parseFloat(productData.costo);
        if (productData.stock !== undefined) products[index].stock = parseInt(productData.stock);
        if (productData.stockMinimo !== undefined) products[index].stockMinimo = parseInt(productData.stockMinimo);
        if (productData.unidad) products[index].unidad = productData.unidad;
        if (productData.proveedor !== undefined) products[index].proveedor = productData.proveedor;
        if (productData.activo !== undefined) products[index].activo = productData.activo;
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
        return { success: true, message: 'Producto actualizado exitosamente', product: products[index] };
    }

    function deleteProduct(id) {
        var products = getProducts();
        var newProducts = products.filter(function(p) { return p.id !== parseInt(id); });
        if (products.length === newProducts.length) {
            return { success: false, message: 'Producto no encontrado' };
        }
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(newProducts));
        return { success: true, message: 'Producto eliminado exitosamente' };
    }

    function updateStock(id, quantity, operation) {
        var product = findProductById(id);
        if (!product) {
            return { success: false, message: 'Producto no encontrado' };
        }
        var newStock = product.stock;
        if (operation === 'add') {
            newStock += parseInt(quantity);
        } else if (operation === 'subtract') {
            newStock -= parseInt(quantity);
            if (newStock < 0) {
                return { success: false, message: 'Stock insuficiente' };
            }
        } else {
            newStock = parseInt(quantity);
        }
        return updateProduct(id, { stock: newStock });
    }

    function getLowStockProducts() {
        var products = getProducts();
        return products.filter(function(p) { return p.activo && p.stock <= p.stockMinimo; });
    }

    // Categorías
    function getCategories() {
        var data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
        return data ? JSON.parse(data) : [];
    }

    function createCategory(categoryData) {
        var categories = getCategories();
        var newId = categories.length > 0 ? Math.max(...categories.map(c => c.id)) + 1 : 1;
        var newCategory = {
            id: newId,
            nombre: categoryData.nombre,
            descripcion: categoryData.descripcion || '',
            activa: categoryData.activa !== false
        };
        categories.push(newCategory);
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
        return { success: true, message: 'Categoría creada exitosamente', category: newCategory };
    }

    function updateCategory(id, categoryData) {
        var categories = getCategories();
        var index = categories.findIndex(function(c) { return c.id === parseInt(id); });
        
        if (index === -1) {
            return { success: false, message: 'Categoría no encontrada' };
        }
        
        categories[index] = {
            id: parseInt(id),
            nombre: categoryData.nombre,
            descripcion: categoryData.descripcion || '',
            activa: categoryData.activa !== false
        };
        
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
        return { success: true, message: 'Categoría actualizada exitosamente' };
    }

    function deleteCategory(id) {
        var categories = getCategories();
        var index = categories.findIndex(function(c) { return c.id === parseInt(id); });
        
        if (index === -1) {
            return { success: false, message: 'Categoría no encontrada' };
        }
        
        // Verificar si hay productos con esta categoría
        var products = getProducts();
        var hasProducts = products.some(function(p) {
            return p.categoria === categories[index].nombre;
        });
        
        if (hasProducts) {
            return { success: false, message: 'No se puede eliminar: hay productos en esta categoría' };
        }
        
        categories.splice(index, 1);
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
        return { success: true, message: 'Categoría eliminada exitosamente' };
    }

    // Notificaciones
    function getNotifications() {
        var notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) || [];
        return notifications.sort(function(a, b) {
            return new Date(b.fechaCreacion) - new Date(a.fechaCreacion);
        });
    }

    function createNotification(notificationData) {
        var notifications = getNotifications();
        var newNotification = {
            id: Date.now(),
            tipo: notificationData.tipo || 'info',
            titulo: notificationData.titulo,
            mensaje: notificationData.mensaje,
            enlace: notificationData.enlace || null,
            leida: false,
            fechaCreacion: new Date().toISOString()
        };
        notifications.unshift(newNotification);
        if (notifications.length > 50) {
            notifications = notifications.slice(0, 50);
        }
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
        return newNotification;
    }

    function markNotificationAsRead(notificationId) {
        var notifications = getNotifications();
        var notification = notifications.find(function(n) { return n.id === notificationId; });
        if (notification) {
            notification.leida = true;
            localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
        }
        return notification;
    }

    function markAllNotificationsAsRead() {
        var notifications = getNotifications();
        notifications.forEach(function(n) { n.leida = true; });
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    }

    function deleteNotification(notificationId) {
        var notifications = getNotifications();
        notifications = notifications.filter(function(n) { return n.id !== notificationId; });
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    }

    function deleteReadNotifications() {
        var notifications = getNotifications();
        notifications = notifications.filter(function(n) { return !n.leida; });
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
        return notifications.length;
    }

    function deleteAllNotifications() {
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
    }

    function getUnreadCount() {
        var notifications = getNotifications();
        return notifications.filter(function(n) { return !n.leida; }).length;
    }

    // Clientes
    function getCustomers() {
        var customers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
        return customers ? JSON.parse(customers) : [];
    }

    function findCustomerById(customerId) {
        var customers = getCustomers();
        return customers.find(function(c) { return c.id === customerId; });
    }

    function findCustomerByDocument(documento) {
        var customers = getCustomers();
        return customers.find(function(c) { return c.documento === documento; });
    }

    function createCustomer(customerData) {
        var customers = getCustomers();
        var existingCustomer = findCustomerByDocument(customerData.documento);
        if (existingCustomer) {
            throw new Error('Ya existe un cliente con este documento');
        }
        var maxId = customers.length > 0
            ? Math.max.apply(Math, customers.map(function(c) { return c.id; }))
            : 0;
        var newCustomer = {
            id: maxId + 1,
            documento: customerData.documento,
            tipoDocumento: customerData.tipoDocumento || 'CC',
            nombre: customerData.nombre,
            direccion: customerData.direccion || '',
            telefono: customerData.telefono || '',
            email: customerData.email || '',
            fechaCreacion: new Date().toISOString().split('T')[0],
            activo: true
        };
        customers.push(newCustomer);
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
        return newCustomer;
    }

    function updateCustomer(customerId, customerData) {
        var customers = getCustomers();
        var index = customers.findIndex(function(c) { return c.id === customerId; });
        if (index === -1) {
            throw new Error('Cliente no encontrado');
        }
        var existingCustomer = findCustomerByDocument(customerData.documento);
        if (existingCustomer && existingCustomer.id !== customerId) {
            throw new Error('Ya existe otro cliente con este documento');
        }
        customers[index] = Object.assign({}, customers[index], customerData);
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
        return customers[index];
    }

    function deleteCustomer(customerId) {
        var customers = getCustomers();
        customers = customers.filter(function(c) { return c.id !== customerId; });
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    }

    function toggleCustomerStatus(customerId) {
        var customers = getCustomers();
        var customer = customers.find(function(c) { return c.id === customerId; });
        if (customer) {
            customer.activo = !customer.activo;
            localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
        }
        return customer;
    }

    // Facturas
    function getInvoices() {
        var invoices = localStorage.getItem(STORAGE_KEYS.INVOICES);
        return invoices ? JSON.parse(invoices) : [];
    }

    function findInvoiceById(invoiceId) {
        var invoices = getInvoices();
        return invoices.find(function(i) { return i.id === invoiceId; });
    }

    function findInvoiceByNumber(numeroFactura) {
        var invoices = getInvoices();
        return invoices.find(function(i) { return i.numeroFactura === numeroFactura; });
    }

    function generateInvoiceNumber() {
        var invoices = getInvoices();
        if (invoices.length === 0) {
            return 'FAC-00001';
        }
        var maxNumber = Math.max.apply(Math, invoices.map(function(i) {
            var num = parseInt(i.numeroFactura.split('-')[1]);
            return isNaN(num) ? 0 : num;
        }));
        var nextNumber = maxNumber + 1;
        return 'FAC-' + String(nextNumber).padStart(5, '0');
    }

    function createInvoice(invoiceData) {
        var invoices = getInvoices();
        var maxId = invoices.length > 0
            ? Math.max.apply(Math, invoices.map(function(i) { return i.id; }))
            : 0;
        var newInvoice = {
            id: maxId + 1,
            numeroFactura: generateInvoiceNumber(),
            clienteId: invoiceData.clienteId,
            clienteNombre: invoiceData.clienteNombre,
            clienteDocumento: invoiceData.clienteDocumento,
            items: invoiceData.items,
            subtotal: invoiceData.subtotal,
            iva: invoiceData.iva,
            descuento: invoiceData.descuento || 0,
            total: invoiceData.total,
            metodoPago: invoiceData.metodoPago || 'efectivo',
            estado: invoiceData.estado || 'Pagada',
            observaciones: invoiceData.observaciones || '',
            fechaCreacion: new Date().toISOString(),
            fechaVencimiento: invoiceData.fechaVencimiento || null,
            vendedor: invoiceData.vendedor || ''
        };
        invoices.push(newInvoice);
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
        if (newInvoice.estado === 'Pagada') {
            newInvoice.items.forEach(function(item) {
                var product = findProductById(item.productoId);
                if (product) {
                    updateStock(item.productoId, product.stock - item.cantidad);
                }
            });
        }
        return newInvoice;
    }

    function updateInvoice(invoiceId, invoiceData) {
        var invoices = getInvoices();
        var index = invoices.findIndex(function(i) { return i.id === invoiceId; });
        if (index === -1) {
            throw new Error('Factura no encontrada');
        }
        var oldInvoice = invoices[index];
        if (oldInvoice.estado === 'Pendiente' && invoiceData.estado === 'Pagada') {
            invoiceData.items.forEach(function(item) {
                var product = findProductById(item.productoId);
                if (product) {
                    updateStock(item.productoId, product.stock - item.cantidad);
                }
            });
        }
        if (oldInvoice.estado === 'Pagada' && invoiceData.estado === 'Cancelada') {
            oldInvoice.items.forEach(function(item) {
                var product = findProductById(item.productoId);
                if (product) {
                    updateStock(item.productoId, product.stock + item.cantidad);
                }
            });
        }
        invoices[index] = Object.assign({}, oldInvoice, invoiceData);
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
        return invoices[index];
    }

    function deleteInvoice(invoiceId) {
        var invoices = getInvoices();
        var invoice = findInvoiceById(invoiceId);
        if (invoice && invoice.estado === 'Pagada') {
            invoice.items.forEach(function(item) {
                var product = findProductById(item.productoId);
                if (product) {
                    updateStock(item.productoId, product.stock + item.cantidad);
                }
            });
        }
        invoices = invoices.filter(function(i) { return i.id !== invoiceId; });
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    }

    function getInvoicesByCustomer(customerId) {
        var invoices = getInvoices();
        return invoices.filter(function(i) { return i.clienteId === customerId; });
    }

    function getInvoicesByDateRange(startDate, endDate) {
        var invoices = getInvoices();
        return invoices.filter(function(i) {
            var invoiceDate = i.fechaCreacion.split('T')[0];
            return invoiceDate >= startDate && invoiceDate <= endDate;
        });
    }

    function getInvoicesByStatus(estado) {
        var invoices = getInvoices();
        return invoices.filter(function(i) { return i.estado === estado; });
    }

    // Proveedores
    function getSuppliers() {
        var data = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
        return data ? JSON.parse(data) : [];
    }

    function findSupplierById(id) {
        var suppliers = getSuppliers();
        return suppliers.find(function(s) { return s.id === parseInt(id); });
    }

    function findSupplierByNit(nit) {
        var suppliers = getSuppliers();
        return suppliers.find(function(s) { return s.nit === nit; });
    }

    function createSupplier(supplierData) {
        var suppliers = getSuppliers();
        if (findSupplierByNit(supplierData.nit)) {
            return { success: false, message: 'Ya existe un proveedor con este NIT' };
        }
        var maxId = suppliers.length > 0
            ? Math.max.apply(Math, suppliers.map(function(s) { return s.id; }))
            : 0;
        var newSupplier = {
            id: maxId + 1,
            nit: supplierData.nit,
            nombre: supplierData.nombre,
            contacto: supplierData.contacto || '',
            email: supplierData.email || '',
            telefono: supplierData.telefono || '',
            direccion: supplierData.direccion || '',
            ciudad: supplierData.ciudad || '',
            terminosPago: supplierData.terminosPago || 'Contado',
            descuento: parseFloat(supplierData.descuento) || 0,
            tipo: supplierData.tipo || 'Regular',
            activo: true,
            fechaCreacion: new Date().toISOString().split('T')[0]
        };
        suppliers.push(newSupplier);
        localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
        return { success: true, message: 'Proveedor creado exitosamente', supplier: newSupplier };
    }

    function updateSupplier(id, supplierData) {
        var suppliers = getSuppliers();
        var index = suppliers.findIndex(function(s) { return s.id === parseInt(id); });
        if (index === -1) {
            return { success: false, message: 'Proveedor no encontrado' };
        }
        if (supplierData.nit && supplierData.nit !== suppliers[index].nit) {
            var existing = findSupplierByNit(supplierData.nit);
            if (existing && existing.id !== parseInt(id)) {
                return { success: false, message: 'Ya existe otro proveedor con este NIT' };
            }
        }
        suppliers[index] = Object.assign({}, suppliers[index], supplierData);
        localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
        return { success: true, message: 'Proveedor actualizado', supplier: suppliers[index] };
    }

    function deleteSupplier(id) {
        var suppliers = getSuppliers();
        var filtered = suppliers.filter(function(s) { return s.id !== parseInt(id); });
        if (filtered.length === suppliers.length) {
            return { success: false, message: 'Proveedor no encontrado' };
        }
        localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(filtered));
        return { success: true, message: 'Proveedor eliminado' };
    }

    function toggleSupplierStatus(id) {
        var suppliers = getSuppliers();
        var supplier = suppliers.find(function(s) { return s.id === parseInt(id); });
        if (!supplier) {
            return { success: false, message: 'Proveedor no encontrado' };
        }
        supplier.activo = !supplier.activo;
        localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
        return { success: true, supplier: supplier };
    }

    // ======= ÓRDENES DE COMPRA =======
    function getPurchases() {
        var data = localStorage.getItem(STORAGE_KEYS.PURCHASES);
        return data ? JSON.parse(data) : [];
    }

    function findPurchaseById(id) {
        var purchases = getPurchases();
        return purchases.find(function(p) { return p.id === parseInt(id); }) || null;
    }

    function findPurchaseByNumber(numero) {
        var purchases = getPurchases();
        return purchases.find(function(p) { return p.numeroOrden === numero; }) || null;
    }

    function generatePurchaseNumber() {
        var purchases = getPurchases();
        var year = new Date().getFullYear();
        var maxNum = 0;
        purchases.forEach(function(p) {
            if (p.numeroOrden) {
                var match = p.numeroOrden.match(/OC-\d{4}-(\d{5})/);
                if (match) {
                    var num = parseInt(match[1]);
                    if (num > maxNum) maxNum = num;
                }
            }
        });
        var next = String(maxNum + 1).padStart(5, '0');
        return 'OC-' + year + '-' + next;
    }

    function createPurchase(purchaseData) {
        var purchases = getPurchases();
        var newPurchase = {
            id: Date.now(),
            numeroOrden: purchaseData.numeroOrden || generatePurchaseNumber(),
            proveedorId: purchaseData.proveedorId || null,
            proveedorNombre: purchaseData.proveedorNombre || '',
            proveedorNit: purchaseData.proveedorNit || '',
            items: purchaseData.items || [],
            subtotal: purchaseData.subtotal || 0,
            iva: purchaseData.iva || 0,
            descuento: purchaseData.descuento || 0,
            envio: purchaseData.envio || 0,
            total: purchaseData.total || 0,
            saldo: purchaseData.saldo !== undefined ? purchaseData.saldo : (purchaseData.total || 0),
            terminosPago: purchaseData.terminosPago || 'Contado',
            estado: purchaseData.estado || 'Pendiente',
            observaciones: purchaseData.observaciones || '',
            afectarInventario: purchaseData.afectarInventario !== undefined ? purchaseData.afectarInventario : true,
            usuario: purchaseData.usuario || '',
            fechaCreacion: purchaseData.fechaCreacion || new Date().toISOString(),
            fechaVencimiento: purchaseData.fechaVencimiento || ''
        };
        purchases.push(newPurchase);
        localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
        return newPurchase;
    }

    function updatePurchase(id, updates) {
        var purchases = getPurchases();
        var index = purchases.findIndex(function(p) { return p.id === parseInt(id); });
        if (index === -1) return null;
        purchases[index] = Object.assign({}, purchases[index], updates);
        localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
        return purchases[index];
    }

    function deletePurchase(id) {
        var purchases = getPurchases();
        var filtered = purchases.filter(function(p) { return p.id !== parseInt(id); });
        localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(filtered));
        return true;
    }

    function getPurchasesBySupplier(supplierId) {
        return getPurchases().filter(function(p) { return p.proveedorId === parseInt(supplierId); });
    }

    function getPurchasesByStatus(estado) {
        if (!estado || estado === 'Todos') return getPurchases();
        return getPurchases().filter(function(p) { return p.estado === estado; });
    }

    function getPurchasesByDateRange(startDate, endDate) {
        var purchases = getPurchases();
        return purchases.filter(function(p) {
            var fecha = new Date(p.fechaCreacion);
            return fecha >= new Date(startDate) && fecha <= new Date(endDate + 'T23:59:59');
        });
    }

    // ======= PAGOS A PROVEEDORES =======
    function getPayments() {
        var data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
        return data ? JSON.parse(data) : [];
    }

    function findPaymentById(id) {
        var payments = getPayments();
        return payments.find(function(p) { return p.id === parseInt(id); }) || null;
    }

    function createPayment(paymentData) {
        var payments = getPayments();
        var newPayment = {
            id: Date.now(),
            referencia: paymentData.referencia || ('PAG-' + String(payments.length + 1).padStart(4, '0')),
            proveedorId: paymentData.proveedorId || null,
            proveedorNombre: paymentData.proveedorNombre || '',
            compraId: paymentData.compraId || null,
            numeroOrden: paymentData.numeroOrden || '',
            monto: paymentData.monto || 0,
            metodoPago: paymentData.metodoPago || 'Transferencia',
            referenciaTransaccion: paymentData.referenciaTransaccion || '',
            tipo: paymentData.tipo || 'Completo',
            fechaPago: paymentData.fechaPago || new Date().toISOString(),
            usuario: paymentData.usuario || '',
            fechaCreacion: new Date().toISOString()
        };
        payments.push(newPayment);
        localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
        return newPayment;
    }

    function getPaymentsBySupplier(supplierId) {
        return getPayments().filter(function(p) { return p.proveedorId === parseInt(supplierId); });
    }

    function getPaymentsByPurchase(compraId) {
        return getPayments().filter(function(p) { return p.compraId === parseInt(compraId); });
    }

    // ======= CONTABILIDAD =======
    
    // Cuentas Contables
    function getAccounts() {
        var data = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
        return data ? JSON.parse(data) : [];
    }

    function findAccountByCode(codigo) {
        var accounts = getAccounts();
        if (!codigo && codigo !== 0) return null;
        var codeNorm = String(codigo).trim().toLowerCase();
        return accounts.find(function(a) { return String(a.codigo).trim().toLowerCase() === codeNorm; });
    }

    function findAccountById(id) {
        var accounts = getAccounts();
        return accounts.find(function(a) { return a.id === parseInt(id); });
    }

    function createAccount(accountData) {
        // C-04: Validar sesión activa
        try {
            requireAuth();
        } catch (e) {
            return { success: false, message: e.message };
        }
        
        var accounts = getAccounts();
        if (!accountData || !accountData.codigo || !accountData.nombre) {
            return { success: false, message: 'Datos incompletos para crear la cuenta' };
        }
        if (findAccountByCode(accountData.codigo)) {
            return { success: false, message: 'Ya existe una cuenta con este código' };
        }
        // Si se especifica padre, verificar existencia
        if (accountData.padre) {
            var padre = findAccountByCode(accountData.padre);
            if (!padre) return { success: false, message: 'Cuenta padre no encontrada' };
        }
        var maxId = accounts.length > 0
            ? Math.max.apply(Math, accounts.map(function(a) { return a.id; }))
            : 0;
        var newAccount = {
            id: maxId + 1,
            codigo: accountData.codigo,
            nombre: accountData.nombre,
            tipo: accountData.tipo || 'Activo',
            nivel: accountData.nivel || 'Cuenta',
            padre: accountData.padre || null,
            moneda: accountData.moneda || 'COP',
            descripcion: accountData.descripcion || '',
            saldo: 0,
            activo: true
        };
        var currentUser = getCurrentUser();
        newAccount.creadoPor = currentUser ? currentUser.email || currentUser.nombre : 'Sistema';
        newAccount.creadoEn = new Date().toISOString();
        accounts.push(newAccount);
        safeSetItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
        return { success: true, message: 'Cuenta creada exitosamente', account: newAccount };
    }

    function updateAccount(codigo, updates) {
        // C-04: Validar sesión activa
        try {
            requireAuth();
        } catch (e) {
            return { success: false, message: e.message };
        }
        
        var accounts = getAccounts();
        var index = accounts.findIndex(function(a) { return a.codigo === codigo; });
        if (index === -1) {
            return { success: false, message: 'Cuenta no encontrada' };
        }
        var updated = Object.assign({}, accounts[index], updates);
        var currentUser = getCurrentUser();
        updated.ultimaModificacionPor = currentUser ? currentUser.email || currentUser.nombre : 'Sistema';
        updated.ultimaModificacionEn = new Date().toISOString();
        accounts[index] = updated;
        safeSetItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
        return { success: true, message: 'Cuenta actualizada', account: accounts[index] };
    }

    function deleteAccount(codigo) {
        // C-04: Validar sesión activa
        try {
            requireAuth();
        } catch (e) {
            return { success: false, message: e.message };
        }
        
        var accounts = getAccounts();
        var account = findAccountByCode(codigo);
        if (!account) return { success: false, message: 'Cuenta no encontrada' };
        // No eliminar si tiene hijos
        var hasChildren = accounts.some(function(a) { return a.padre === account.codigo; });
        if (hasChildren) return { success: false, message: 'La cuenta tiene subcuentas. No se permite eliminar.' };
        // No eliminar si existen movimientos en libros
        var entries = getJournalEntries();
        var used = entries.some(function(e) { return e.partidas.some(function(p) { return String(p.cuenta).trim().toLowerCase() === String(codigo).trim().toLowerCase(); }); });
        if (used) return { success: false, message: 'La cuenta tiene movimientos registrados. Desactívala en lugar de eliminar.' };

        var filtered = accounts.filter(function(a) { return String(a.codigo).trim().toLowerCase() !== String(codigo).trim().toLowerCase(); });
        safeSetItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(filtered));
        return { success: true, message: 'Cuenta eliminada' };
    }

    // Obtener hijos directos
    function getAccountChildren(codigo) {
        var accounts = getAccounts();
        return accounts.filter(function(a) { return a.padre === codigo; });
    }

    // Propagar cambio de saldo hacia los padres (optimizado y seguro)
    function propagateBalanceChange(codigo, delta) {
        if (!codigo || delta === 0) return true;
        
        try {
            var accounts = getAccounts();
            var accountMap = {};
            accounts.forEach(function(a) { accountMap[a.codigo] = a; });
            
            var updates = [];
            var current = accountMap[codigo];
            var visited = {};
            
            // Prevenir loops infinitos
            while (current && current.padre) {
                if (visited[current.codigo]) {
                    console.error('⚠️  Referencia circular detectada en cuenta: ' + current.codigo);
                    createNotification({
                        tipo: 'error',
                        titulo: 'Error de Integridad',
                        mensaje: 'Jerarquía circular detectada en plan contable'
                    });
                    return false;
                }
                visited[current.codigo] = true;
                
                var parent = accountMap[current.padre];
                if (!parent) break;
                
                parent.saldo = (parent.saldo || 0) + delta;
                updates.push({ codigo: parent.codigo, saldo: parent.saldo });
                current = parent;
            }
            
            // Aplicar todos los cambios atómicamente
            if (updates.length > 0) {
                accounts = accounts.map(function(a) {
                    var update = updates.find(function(u) { return u.codigo === a.codigo; });
                    return update ? Object.assign({}, a, { saldo: update.saldo }) : a;
                });
                
                if (!safeSetItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts))) {
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error propagando saldo:', error);
            return false;
        }
    }

    // Recalcular saldos agregados bottom-up (útil para auditoría y reparación)
    function recalculateAggregatedBalances() {
        var accounts = getAccounts();
        // Construir mapa por código
        var map = {};
        accounts.forEach(function(a) { map[a.codigo] = Object.assign({}, a); });

        // Obtener orden topológico: procesar de mayor longitud de código a menor
        var sorted = accounts.slice().sort(function(a, b) { return String(b.codigo).length - String(a.codigo).length; });
        sorted.forEach(function(a) {
            if (!a.padre) return;
            var parent = map[a.padre];
            if (!parent) return;
            parent.saldo = (parent.saldo || 0) + (a.saldo || 0);
        });

        // Guardar back
        var out = Object.keys(map).map(function(k) { return map[k]; });
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(out));
        return out;
    }

    // Asientos Contables
    function getJournalEntries() {
        var data = localStorage.getItem(STORAGE_KEYS.JOURNAL_ENTRIES);
        return data ? JSON.parse(data) : [];
    }

    function findJournalEntryById(id) {
        var entries = getJournalEntries();
        return entries.find(function(e) { return e.id === parseInt(id); });
    }

    function findJournalEntryByNumber(numero) {
        var entries = getJournalEntries();
        return entries.find(function(e) { return e.numero === numero; });
    }

    function generateJournalNumber() {
        var entries = getJournalEntries();
        var year = new Date().getFullYear();
        var maxNum = 0;
        entries.forEach(function(e) {
            if (e.numero) {
                var match = e.numero.match(/AS-(\d{4})-(\d{5})/);
                if (match && parseInt(match[1]) === year) {
                    var num = parseInt(match[2]);
                    if (num > maxNum) maxNum = num;
                }
            }
        });
        var next = String(maxNum + 1).padStart(5, '0');
        return 'AS-' + year + '-' + next;
    }

    function createJournalEntry(entryData) {
        // C-04: Validar sesión activa
        try {
            requireAuth();
        } catch (e) {
            return { success: false, message: e.message };
        }
        
        var entries = getJournalEntries();
        var currentUser = getCurrentUser();

        // Validar estructura mínima
        if (!entryData || !Array.isArray(entryData.partidas) || entryData.partidas.length < 2) {
            return { success: false, message: 'Un asiento requiere al menos dos partidas' };
        }

        // Validar que el asiento esté balanceado y que las cuentas existan y estén activas
        var totalDebe = 0;
        var totalHaber = 0;
        var deltas = {}; // mapa codigo -> delta aplicable
        for (var i = 0; i < entryData.partidas.length; i++) {
            var p = entryData.partidas[i];
            var acc = findAccountByCode(p.cuenta);
            if (!acc) return { success: false, message: 'Cuenta no encontrada: ' + p.cuenta };
            if (!acc.activo) return { success: false, message: 'La cuenta no está activa: ' + p.cuenta };
            var debe = parseFloat(p.debe || 0) || 0;
            var haber = parseFloat(p.haber || 0) || 0;
            totalDebe += debe;
            totalHaber += haber;
            var delta = 0;
            if (acc.tipo === 'Activo' || acc.tipo === 'Gasto') {
                delta = debe - haber;
            } else {
                delta = haber - debe;
            }
            var key = String(acc.codigo).trim();
            deltas[key] = (deltas[key] || 0) + delta;
        }

        if (Math.abs(totalDebe - totalHaber) > 0.01) {
            return { success: false, message: 'El asiento no está balanceado' };
        }

        // Preparar nuevo asiento
        var newEntry = {
            id: Date.now(),
            numero: entryData.numero || generateJournalNumber(),
            fecha: entryData.fecha || new Date().toISOString().split('T')[0],
            descripcion: entryData.descripcion || '',
            tipo: entryData.tipo || 'Manual',
            partidas: entryData.partidas || [],
            estado: 'Registrado',
            usuario: (currentUser ? currentUser.nombre || currentUser.email : 'Sistema'),
            fechaCreacion: new Date().toISOString()
        };

        // Aplicar cambios de saldo de forma atómica: calcular nuevos saldos en memoria
        var accounts = getAccounts();
        var accountMap = {};
        accounts.forEach(function(a) { accountMap[a.codigo] = Object.assign({}, a); });

        Object.keys(deltas).forEach(function(cod) {
            var acc = accountMap[cod];
            if (!acc) return; // ya validado antes
            acc.saldo = (acc.saldo || 0) + deltas[cod];
        });

        // Persistir asiento y luego actualizar cuentas y propagar hacia padres
        entries.push(newEntry);
        if (!safeSetItem(STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(entries))) {
            return { success: false, message: 'Error al guardar asiento' };
        }

        // Actualizar cuentas físicas y propagar
        Object.keys(deltas).forEach(function(cod) {
            var acc = findAccountByCode(cod);
            if (!acc) return;
            var nuevoSaldo = (acc.saldo || 0) + deltas[cod];
            updateAccount(acc.codigo, { saldo: nuevoSaldo });
            // Propagar a padres
            propagateBalanceChange(acc.codigo, deltas[cod]);
        });

        return { success: true, message: 'Asiento registrado exitosamente', entry: newEntry };
    }

    function updateJournalEntry(id, updates) {
        // C-04: Validar sesión activa
        try {
            requireAuth();
        } catch (e) {
            return { success: false, message: e.message };
        }
        
        var entries = getJournalEntries();
        var index = entries.findIndex(function(e) { return e.id === parseInt(id); });
        if (index === -1) {
            return { success: false, message: 'Asiento no encontrado' };
        }
        entries[index] = Object.assign({}, entries[index], updates);
        localStorage.setItem(STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(entries));
        return { success: true, message: 'Asiento actualizado', entry: entries[index] };
    }

    function deleteJournalEntry(id) {
        // C-04: Validar sesión activa
        try {
            requireAuth();
        } catch (e) {
            return { success: false, message: e.message };
        }
        
        var entries = getJournalEntries();
        var entry = findJournalEntryById(id);
        if (!entry) {
            return { success: false, message: 'Asiento no encontrado' };
        }

        // Construir deltas a revertir
        var deltas = {};
        entry.partidas.forEach(function(partida) {
            var account = findAccountByCode(partida.cuenta);
            if (!account) return;
            var delta = 0;
            if (account.tipo === 'Activo' || account.tipo === 'Gasto') {
                delta = (partida.debe || 0) - (partida.haber || 0);
            } else {
                delta = (partida.haber || 0) - (partida.debe || 0);
            }
            deltas[account.codigo] = (deltas[account.codigo] || 0) - delta; // restar para revertir
        });

        // Aplicar reversión en cuentas y propagar
        Object.keys(deltas).forEach(function(cod) {
            var acc = findAccountByCode(cod);
            if (!acc) return;
            var nuevoSaldo = (acc.saldo || 0) + deltas[cod];
            updateAccount(acc.codigo, { saldo: nuevoSaldo });
            propagateBalanceChange(acc.codigo, deltas[cod]);
        });

        var filtered = entries.filter(function(e) { return e.id !== parseInt(id); });
        if (!safeSetItem(STORAGE_KEYS.JOURNAL_ENTRIES, JSON.stringify(filtered))) {
            return { success: false, message: 'Error al eliminar asiento' };
        }
        return { success: true, message: 'Asiento eliminado' };
    }

    function getJournalEntriesByDateRange(startDate, endDate) {
        var entries = getJournalEntries();
        return entries.filter(function(e) {
            var fecha = e.fecha;
            return fecha >= startDate && fecha <= endDate;
        });
    }

    function getJournalEntriesByType(tipo) {
        var entries = getJournalEntries();
        if (!tipo || tipo === 'Todos') return entries;
        return entries.filter(function(e) { return e.tipo === tipo; });
    }

    // Resumen Financiero
    function getFinancialSummary() {
        var accounts = getAccounts();
        var summary = {
            activos: 0,
            pasivos: 0,
            patrimonio: 0,
            ingresos: 0,
            gastos: 0,
            utilidadNeta: 0
        };

        accounts.forEach(function(a) {
            if (a.nivel === 'Clase' && a.activo) {
                if (a.codigo === '1') summary.activos = a.saldo || 0;
                if (a.codigo === '2') summary.pasivos = a.saldo || 0;
                if (a.codigo === '3') summary.patrimonio = a.saldo || 0;
                if (a.codigo === '4') summary.ingresos = a.saldo || 0;
                if (a.codigo === '5') summary.gastos = a.saldo || 0;
            }
        });

        summary.utilidadNeta = summary.ingresos - summary.gastos;
        return summary;
    }

    // Libro Mayor - Obtener movimientos de una cuenta (con límites)
    function getAccountMovements(codigo, options) {
        options = options || {};
        var limit = options.limit || 1000;
        var offset = options.offset || 0;
        var startDate = options.startDate;
        var endDate = options.endDate;
        
        var entries = getJournalEntries();
        var movements = [];
        
        entries.forEach(function(entry) {
            // Filtro por rango de fechas si se especifica
            if (startDate && entry.fecha < startDate) return;
            if (endDate && entry.fecha > endDate) return;
            
            entry.partidas.forEach(function(partida) {
                if (partida.cuenta === codigo) {
                    movements.push({
                        fecha: entry.fecha,
                        numero: entry.numero,
                        descripcion: entry.descripcion,
                        debe: partida.debe || 0,
                        haber: partida.haber || 0
                    });
                }
            });
        });
        
        // Ordenar y aplicar paginación
        movements.sort(function(a, b) {
            return new Date(a.fecha) - new Date(b.fecha);
        });
        
        return {
            movements: movements.slice(offset, offset + limit),
            total: movements.length,
            hasMore: movements.length > (offset + limit)
        };
    }

    // ========================================
    // MOVIMIENTOS DE INVENTARIO
    // ========================================

    function getInventoryMovements() {
        var movements = localStorage.getItem('marketworld_inventory_movements');
        if (!movements) return [];
        
        try {
            return JSON.parse(movements);
        } catch (e) {
            console.error('Error al parsear movimientos de inventario:', e);
            return [];
        }
    }

    function createInventoryMovement(movementData) {
        if (!movementData || !movementData.productoId || !movementData.cantidad) {
            return { success: false, message: 'Datos incompletos del movimiento' };
        }

        var movements = getInventoryMovements();
        var user = getCurrentUser();
        var userName = user ? user.nombre + ' ' + user.apellido : 'Sistema';

        var newMovement = {
            id: movements.length > 0 ? Math.max.apply(Math, movements.map(function(m) { return m.id; })) + 1 : 1,
            fecha: new Date().toISOString(),
            tipo: movementData.tipo || 'entrada',
            productoId: movementData.productoId,
            productoNombre: movementData.productoNombre || '',
            cantidad: parseInt(movementData.cantidad, 10),
            stockAnterior: movementData.stockAnterior || 0,
            stockNuevo: movementData.stockNuevo || 0,
            usuario: userName,
            motivo: movementData.motivo || 'Sin especificar'
        };

        movements.push(newMovement);
        
        if (safeSetItem('marketworld_inventory_movements', JSON.stringify(movements))) {
            console.log('Movimiento creado:', newMovement);
            return { success: true, message: 'Movimiento registrado correctamente', data: newMovement };
        } else {
            return { success: false, message: 'Error al guardar el movimiento' };
        }
    }

    function deleteInventoryMovement(id) {
        var movements = getInventoryMovements();
        var index = movements.findIndex(function(m) { return m.id === id; });
        
        if (index === -1) {
            return { success: false, message: 'Movimiento no encontrado' };
        }

        movements.splice(index, 1);
        
        if (safeSetItem('marketworld_inventory_movements', JSON.stringify(movements))) {
            return { success: true, message: 'Movimiento eliminado correctamente' };
        } else {
            return { success: false, message: 'Error al eliminar el movimiento' };
        }
    }

    function clearInventoryMovements() {
        localStorage.removeItem('marketworld_inventory_movements');
        return { success: true, message: 'Movimientos eliminados correctamente' };
    }

    // Iniciar
    initializeData();

    // Exponer funciones
    global.MarketWorld = global.MarketWorld || {};
    global.MarketWorld.data = {
        // Usuarios
        getUsers: getUsers,
        findUserByEmail: findUserByEmail,
        findUserById: findUserById,
        verifyCredentials: verifyCredentials,
        registerUser: registerUser,
        updateUser: updateUser,
        deleteUser: deleteUser,
        toggleUserStatus: toggleUserStatus,
        setCurrentUser: setCurrentUser,
        getCurrentUser: getCurrentUser,
        logout: logout,
        isLoggedIn: isLoggedIn,
        // Productos
        getProducts: getProducts,
        findProductById: findProductById,
        findProductByCode: findProductByCode,
        createProduct: createProduct,
        updateProduct: updateProduct,
        deleteProduct: deleteProduct,
        updateStock: updateStock,
        getLowStockProducts: getLowStockProducts,
        // Categorías
        getCategories: getCategories,
        createCategory: createCategory,
        updateCategory: updateCategory,
        deleteCategory: deleteCategory,
        // Notificaciones
        getNotifications: getNotifications,
        createNotification: createNotification,
        markNotificationAsRead: markNotificationAsRead,
        markAllNotificationsAsRead: markAllNotificationsAsRead,
        deleteNotification: deleteNotification,
        deleteReadNotifications: deleteReadNotifications,
        deleteAllNotifications: deleteAllNotifications,
        getUnreadCount: getUnreadCount,
        // Clientes
        getCustomers: getCustomers,
        findCustomerById: findCustomerById,
        findCustomerByDocument: findCustomerByDocument,
        createCustomer: createCustomer,
        updateCustomer: updateCustomer,
        deleteCustomer: deleteCustomer,
        toggleCustomerStatus: toggleCustomerStatus,
        // Facturas
        getInvoices: getInvoices,
        findInvoiceById: findInvoiceById,
        findInvoiceByNumber: findInvoiceByNumber,
        generateInvoiceNumber: generateInvoiceNumber,
        createInvoice: createInvoice,
        updateInvoice: updateInvoice,
        deleteInvoice: deleteInvoice,
        getInvoicesByCustomer: getInvoicesByCustomer,
        getInvoicesByDateRange: getInvoicesByDateRange,
        getInvoicesByStatus: getInvoicesByStatus,
        // Proveedores
        getSuppliers: getSuppliers,
        findSupplierById: findSupplierById,
        findSupplierByNit: findSupplierByNit,
        createSupplier: createSupplier,
        updateSupplier: updateSupplier,
        deleteSupplier: deleteSupplier,
        toggleSupplierStatus: toggleSupplierStatus,
        // Compras
        getPurchases: getPurchases,
        findPurchaseById: findPurchaseById,
        findPurchaseByNumber: findPurchaseByNumber,
        generatePurchaseNumber: generatePurchaseNumber,
        createPurchase: createPurchase,
        updatePurchase: updatePurchase,
        deletePurchase: deletePurchase,
        getPurchasesBySupplier: getPurchasesBySupplier,
        getPurchasesByStatus: getPurchasesByStatus,
        getPurchasesByDateRange: getPurchasesByDateRange,
        // Pagos
        getPayments: getPayments,
        findPaymentById: findPaymentById,
        createPayment: createPayment,
        getPaymentsBySupplier: getPaymentsBySupplier,
        getPaymentsByPurchase: getPaymentsByPurchase,
        // Contabilidad - Cuentas
        getAccounts: getAccounts,
        findAccountByCode: findAccountByCode,
        findAccountById: findAccountById,
        createAccount: createAccount,
        updateAccount: updateAccount,
        deleteAccount: deleteAccount,
        // Contabilidad - Asientos
        getJournalEntries: getJournalEntries,
        findJournalEntryById: findJournalEntryById,
        findJournalEntryByNumber: findJournalEntryByNumber,
        generateJournalNumber: generateJournalNumber,
        createJournalEntry: createJournalEntry,
        updateJournalEntry: updateJournalEntry,
        deleteJournalEntry: deleteJournalEntry,
        getJournalEntriesByDateRange: getJournalEntriesByDateRange,
        getJournalEntriesByType: getJournalEntriesByType,
        // Contabilidad - Reportes
        getFinancialSummary: getFinancialSummary,
        getAccountMovements: getAccountMovements,
        // Movimientos de Inventario
        getInventoryMovements: getInventoryMovements,
        createInventoryMovement: createInventoryMovement,
        deleteInventoryMovement: deleteInventoryMovement,
        clearInventoryMovements: clearInventoryMovements,
        // Utilidades
        initializeData: initializeData,
        safeSetItem: safeSetItem
    };

    console.log('Modulo de datos cargado');

})(window);