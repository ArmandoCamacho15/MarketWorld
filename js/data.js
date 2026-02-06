// data.js - Base de datos con localStorage

(function(global) {
    'use strict';

    // Llaves de almacenamiento
    var STORAGE_KEYS = {
        USERS: 'marketworld_users',
        CURRENT_USER: 'marketworld_current_user',
        PRODUCTS: 'marketworld_products',
        CATEGORIES: 'marketworld_categories',
        NOTIFICATIONS: 'marketworld_notifications',
        CUSTOMERS: 'marketworld_customers',
        INVOICES: 'marketworld_invoices'
    };

    // Usuarios por defecto
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

    // Categorías por defecto
    var DEFAULT_CATEGORIES = [
        { id: 1, nombre: 'Electrónica', descripcion: 'Dispositivos y accesorios electrónicos', activa: true },
        { id: 2, nombre: 'Ropa', descripcion: 'Prendas de vestir y accesorios', activa: true },
        { id: 3, nombre: 'Alimentos', descripcion: 'Productos alimenticios', activa: true },
        { id: 4, nombre: 'Hogar', descripcion: 'Artículos para el hogar', activa: true },
        { id: 5, nombre: 'Deportes', descripcion: 'Equipamiento deportivo', activa: true }
    ];

    // Productos por defecto
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

    // Clientes por defecto
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

    // Facturas por defecto
    var DEFAULT_INVOICES = [];

    // Inicializar datos
    function initializeData() {
        if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
            localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_USERS));
            console.log('Datos iniciales creados');
        }
        if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
            localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
        }
        if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(DEFAULT_PRODUCTS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
            localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(DEFAULT_CUSTOMERS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
            localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(DEFAULT_INVOICES));
        }
        
        // Inicializar notificaciones vacías si no existen
        if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
            localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
            console.log('Sistema de notificaciones inicializado');
        }
    }

    // Obtener usuarios
    function getUsers() {
        var data = localStorage.getItem(STORAGE_KEYS.USERS);
        return data ? JSON.parse(data) : [];
    }

    // Buscar usuario por email
    function findUserByEmail(email) {
        var users = getUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].email.toLowerCase() === email.toLowerCase()) {
                return users[i];
            }
        }
        return null;
    }

    // Verifica si las credenciales son correctas
    function verifyCredentials(email, password) {
        var user = findUserByEmail(email);
        
        if (user && user.password === password && user.estado === 'Activo') {
            return user;
        }
        
        return null;
    }

    // Registra un nuevo usuario
    function registerUser(userData) {
        var users = getUsers();
        
        // Verificar si el email ya existe
        if (findUserByEmail(userData.email)) {
            return {
                success: false,
                message: 'Este email ya esta registrado'
            };
        }
        
        // Crear nuevo usuario
        var newUser = {
            id: users.length + 1,
            nombre: userData.nombre,
            apellido: userData.apellido,
            email: userData.email,
            password: userData.password,
            rol: 'Usuario',
            estado: 'Activo',
            fechaCreacion: new Date().toISOString().split('T')[0]
        };
        
        users.push(newUser);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        
        return {
            success: true,
            message: 'Usuario registrado correctamente',
            user: newUser
        };
    }

    // Guarda el usuario actual (sesion)
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

    // Obtiene el usuario actual
    function getCurrentUser() {
        var data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        return data ? JSON.parse(data) : null;
    }

    // Cerrar sesion
    function logout() {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }

    // Hay sesion activa?
    function isLoggedIn() {
        return getCurrentUser() !== null;
    }

    // Buscar usuario por ID
    function findUserById(id) {
        var users = getUsers();
        for (var i = 0; i < users.length; i++) {
            if (users[i].id === parseInt(id)) {
                return users[i];
            }
        }
        return null;
    }

    // Actualizar usuario
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
        
        // Verificar si el email ya existe en otro usuario
        if (userData.email && userData.email !== users[index].email) {
            var existingUser = findUserByEmail(userData.email);
            if (existingUser && existingUser.id !== parseInt(id)) {
                return { success: false, message: 'El email ya esta en uso' };
            }
        }
        
        // Actualizar campos
        users[index] = {
            ...users[index],
            ...userData,
            id: parseInt(id)
        };
        
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        
        return {
            success: true,
            message: 'Usuario actualizado correctamente',
            user: users[index]
        };
    }

    // Eliminar usuario
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
        
        return {
            success: true,
            message: 'Usuario eliminado correctamente'
        };
    }

    // Cambiar estado de usuario
    function toggleUserStatus(id) {
        var user = findUserById(id);
        if (!user) {
            return { success: false, message: 'Usuario no encontrado' };
        }
        
        var newEstado = user.estado === 'Activo' ? 'Inactivo' : 'Activo';
        return updateUser(id, { estado: newEstado });
    }

    // Products

    // Obtener productos
    function getProducts() {
        var data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        return data ? JSON.parse(data) : [];
    }

    // Buscar producto por ID
    function findProductById(id) {
        var products = getProducts();
        for (var i = 0; i < products.length; i++) {
            if (products[i].id === parseInt(id)) {
                return products[i];
            }
        }
        return null;
    }

    // Buscar producto por código
    function findProductByCode(code) {
        var products = getProducts();
        for (var i = 0; i < products.length; i++) {
            if (products[i].codigo.toLowerCase() === code.toLowerCase()) {
                return products[i];
            }
        }
        return null;
    }

    // Crear producto
    function createProduct(productData) {
        var products = getProducts();
        
        // Verificar si el código ya existe
        if (findProductByCode(productData.codigo)) {
            return {
                success: false,
                message: 'El código de producto ya existe'
            };
        }
        
        // Generar nuevo ID
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
        
        return {
            success: true,
            message: 'Producto creado exitosamente',
            product: newProduct
        };
    }

    // Actualizar producto
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
            return {
                success: false,
                message: 'Producto no encontrado'
            };
        }
        
        // Verificar código duplicado
        if (productData.codigo && productData.codigo !== products[index].codigo) {
            if (findProductByCode(productData.codigo)) {
                return {
                    success: false,
                    message: 'El código de producto ya existe'
                };
            }
        }
        
        // Actualizar campos
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
        
        return {
            success: true,
            message: 'Producto actualizado exitosamente',
            product: products[index]
        };
    }

    // Eliminar producto
    function deleteProduct(id) {
        var products = getProducts();
        var newProducts = products.filter(function(p) {
            return p.id !== parseInt(id);
        });
        
        if (products.length === newProducts.length) {
            return {
                success: false,
                message: 'Producto no encontrado'
            };
        }
        
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(newProducts));
        
        return {
            success: true,
            message: 'Producto eliminado exitosamente'
        };
    }

    // Actualizar stock
    function updateStock(id, quantity, operation) {
        var product = findProductById(id);
        if (!product) {
            return {
                success: false,
                message: 'Producto no encontrado'
            };
        }
        
        var newStock = product.stock;
        if (operation === 'add') {
            newStock += parseInt(quantity);
        } else if (operation === 'subtract') {
            newStock -= parseInt(quantity);
            if (newStock < 0) {
                return {
                    success: false,
                    message: 'Stock insuficiente'
                };
            }
        } else {
            newStock = parseInt(quantity);
        }
        
        return updateProduct(id, { stock: newStock });
    }

    // Obtener productos con stock bajo
    function getLowStockProducts() {
        var products = getProducts();
        return products.filter(function(p) {
            return p.activo && p.stock <= p.stockMinimo;
        });
    }

    // Categories

    // Obtener categorías
    function getCategories() {
        var data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
        return data ? JSON.parse(data) : [];
    }

    // Crear categoría
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
        
        return {
            success: true,
            message: 'Categoría creada exitosamente',
            category: newCategory
        };
    }

    // Notifications

    /**
     * Obtiene todas las notificaciones ordenadas por fecha (más recientes primero)
     */
    function getNotifications() {
        var notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) || [];
        return notifications.sort(function(a, b) {
            return new Date(b.fechaCreacion) - new Date(a.fechaCreacion);
        });
    }

    /**
     * Crea una nueva notificación
     * @param {Object} notificationData - { tipo, titulo, mensaje, enlace }
     */
    function createNotification(notificationData) {
        var notifications = getNotifications();
        var newNotification = {
            id: Date.now(),
            tipo: notificationData.tipo || 'info', // info, success, warning, danger
            titulo: notificationData.titulo,
            mensaje: notificationData.mensaje,
            enlace: notificationData.enlace || null,
            leida: false,
            fechaCreacion: new Date().toISOString()
        };
        notifications.unshift(newNotification);
        
        // Mantener solo las últimas 50 notificaciones
        if (notifications.length > 50) {
            notifications = notifications.slice(0, 50);
        }
        
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
        return newNotification;
    }

    /**
     * Marca una notificación como leída
     */
    function markNotificationAsRead(notificationId) {
        var notifications = getNotifications();
        var notification = notifications.find(function(n) {
            return n.id === notificationId;
        });
        
        if (notification) {
            notification.leida = true;
            localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
        }
        
        return notification;
    }

    /**
     * Marca todas las notificaciones como leídas
     */
    function markAllNotificationsAsRead() {
        var notifications = getNotifications();
        notifications.forEach(function(n) {
            n.leida = true;
        });
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    }

    /**
     * Elimina una notificación
     */
    function deleteNotification(notificationId) {
        var notifications = getNotifications();
        notifications = notifications.filter(function(n) {
            return n.id !== notificationId;
        });
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    }

    /**
     * Elimina todas las notificaciones leídas
     */
    function deleteReadNotifications() {
        var notifications = getNotifications();
        notifications = notifications.filter(function(n) {
            return !n.leida;
        });
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
        return notifications.length;
    }

    /**
     * Elimina todas las notificaciones
     */
    function deleteAllNotifications() {
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
    }

    /**
     * Obtiene el conteo de notificaciones no leídas
     */
    function getUnreadCount() {
        var notifications = getNotifications();
        return notifications.filter(function(n) {
            return !n.leida;
        }).length;
    }

    // Customers
    
    /**
     * Obtiene todos los clientes
     */
    function getCustomers() {
        var customers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
        return customers ? JSON.parse(customers) : [];
    }

    /**
     * Busca un cliente por ID
     */
    function findCustomerById(customerId) {
        var customers = getCustomers();
        return customers.find(function(c) {
            return c.id === customerId;
        });
    }

    /**
     * Busca un cliente por documento
     */
    function findCustomerByDocument(documento) {
        var customers = getCustomers();
        return customers.find(function(c) {
            return c.documento === documento;
        });
    }

    /**
     * Crea un nuevo cliente
     */
    function createCustomer(customerData) {
        var customers = getCustomers();
        
        // Validar documento único
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

    /**
     * Actualiza un cliente existente
     */
    function updateCustomer(customerId, customerData) {
        var customers = getCustomers();
        var index = customers.findIndex(function(c) {
            return c.id === customerId;
        });
        
        if (index === -1) {
            throw new Error('Cliente no encontrado');
        }
        
        // Validar documento único (excepto el mismo cliente)
        var existingCustomer = findCustomerByDocument(customerData.documento);
        if (existingCustomer && existingCustomer.id !== customerId) {
            throw new Error('Ya existe otro cliente con este documento');
        }
        
        customers[index] = Object.assign({}, customers[index], customerData);
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
        
        return customers[index];
    }

    /**
     * Elimina un cliente
     */
    function deleteCustomer(customerId) {
        var customers = getCustomers();
        customers = customers.filter(function(c) {
            return c.id !== customerId;
        });
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    }

    /**
     * Alterna el estado activo/inactivo de un cliente
     */
    function toggleCustomerStatus(customerId) {
        var customers = getCustomers();
        var customer = customers.find(function(c) {
            return c.id === customerId;
        });
        
        if (customer) {
            customer.activo = !customer.activo;
            localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
        }
        
        return customer;
    }

    // Invoices
    
    /**
     * Obtiene todas las facturas
     */
    function getInvoices() {
        var invoices = localStorage.getItem(STORAGE_KEYS.INVOICES);
        return invoices ? JSON.parse(invoices) : [];
    }

    /**
     * Busca una factura por ID
     */
    function findInvoiceById(invoiceId) {
        var invoices = getInvoices();
        return invoices.find(function(i) {
            return i.id === invoiceId;
        });
    }

    /**
     * Busca una factura por número
     */
    function findInvoiceByNumber(numeroFactura) {
        var invoices = getInvoices();
        return invoices.find(function(i) {
            return i.numeroFactura === numeroFactura;
        });
    }

    /**
     * Genera el siguiente número de factura consecutivo
     */
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

    /**
     * Crea una nueva factura
     */
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
            estado: invoiceData.estado || 'Pagada', // Pagada, Pendiente, Cancelada
            observaciones: invoiceData.observaciones || '',
            fechaCreacion: new Date().toISOString(),
            fechaVencimiento: invoiceData.fechaVencimiento || null,
            vendedor: invoiceData.vendedor || ''
        };
        
        invoices.push(newInvoice);
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
        
        // Actualizar stock de productos
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

    /**
     * Actualiza una factura existente
     */
    function updateInvoice(invoiceId, invoiceData) {
        var invoices = getInvoices();
        var index = invoices.findIndex(function(i) {
            return i.id === invoiceId;
        });
        
        if (index === -1) {
            throw new Error('Factura no encontrada');
        }
        
        var oldInvoice = invoices[index];
        
        // Si cambia el estado de Pendiente a Pagada, actualizar stock
        if (oldInvoice.estado === 'Pendiente' && invoiceData.estado === 'Pagada') {
            invoiceData.items.forEach(function(item) {
                var product = findProductById(item.productoId);
                if (product) {
                    updateStock(item.productoId, product.stock - item.cantidad);
                }
            });
        }
        
        // Si cambia de Pagada a Cancelada, devolver stock
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

    /**
     * Elimina una factura
     */
    function deleteInvoice(invoiceId) {
        var invoices = getInvoices();
        var invoice = findInvoiceById(invoiceId);
        
        // Si la factura está pagada, devolver stock
        if (invoice && invoice.estado === 'Pagada') {
            invoice.items.forEach(function(item) {
                var product = findProductById(item.productoId);
                if (product) {
                    updateStock(item.productoId, product.stock + item.cantidad);
                }
            });
        }
        
        invoices = invoices.filter(function(i) {
            return i.id !== invoiceId;
        });
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    }

    /**
     * Obtiene facturas de un cliente específico
     */
    function getInvoicesByCustomer(customerId) {
        var invoices = getInvoices();
        return invoices.filter(function(i) {
            return i.clienteId === customerId;
        });
    }

    /**
     * Obtiene facturas por rango de fechas
     */
    function getInvoicesByDateRange(startDate, endDate) {
        var invoices = getInvoices();
        return invoices.filter(function(i) {
            var invoiceDate = i.fechaCreacion.split('T')[0];
            return invoiceDate >= startDate && invoiceDate <= endDate;
        });
    }

    /**
     * Obtiene facturas por estado
     */
    function getInvoicesByStatus(estado) {
        var invoices = getInvoices();
        return invoices.filter(function(i) {
            return i.estado === estado;
        });
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
        getInvoicesByStatus: getInvoicesByStatus
    };

    console.log('Modulo de datos cargado');

})(window);