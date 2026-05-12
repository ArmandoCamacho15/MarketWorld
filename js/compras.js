// compras.js - Módulo de compras y proveedores

(function() {
    'use strict';

    // --- Estado ---
    let carrito = [];
    let productoSeleccionado = null;
    let metodoPagoSeleccionado = 'Transferencia';
    let purchaseSearchTerm = '';
    const purchaseHistoryState = {
        page: 1,
        perPage: 10,
        lastPage: 1,
        total: 0,
    };
    const purchaseCatalogState = {
        products: [],
        suppliers: [],
        purchases: [],
        payments: [],
        currentUser: null,
    };

    function setPurchaseCatalogProducts(products) {
        purchaseCatalogState.products = Array.isArray(products) ? products.slice() : [];
    }

    function setPurchaseCatalogSuppliers(suppliers) {
        purchaseCatalogState.suppliers = Array.isArray(suppliers) ? suppliers.slice() : [];
    }

    function getPurchaseCatalogProducts() {
        return purchaseCatalogState.products.slice();
    }

    function getPurchaseCatalogSuppliers() {
        return purchaseCatalogState.suppliers.slice();
    }

    function setPurchaseCatalogPurchases(purchases) {
        purchaseCatalogState.purchases = Array.isArray(purchases) ? purchases.slice() : [];
    }

    function getPurchaseCatalogPurchases() {
        return purchaseCatalogState.purchases.slice();
    }

    function setPurchaseCatalogPayments(payments) {
        purchaseCatalogState.payments = Array.isArray(payments) ? payments.slice() : [];
    }

    function getPurchaseCatalogPayments() {
        return purchaseCatalogState.payments.slice();
    }

    function setCurrentPurchaseUser(user) {
        purchaseCatalogState.currentUser = user || null;
    }

    function getCurrentPurchaseUser() {
        return purchaseCatalogState.currentUser;
    }

    function mapApiPurchaseToCompras(apiPurchase) {
        const apiPayments = Array.isArray(apiPurchase.payments)
            ? apiPurchase.payments
            : (Array.isArray(apiPurchase.pagos) ? apiPurchase.pagos : []);
        const paidTotal = parseFloat(
            apiPurchase.paid_total !== undefined
                ? apiPurchase.paid_total
                : apiPayments.reduce(function(sum, payment) {
                    return sum + parseFloat(payment.monto || payment.amount || 0);
                }, 0)
        ) || 0;
        const total = parseFloat(apiPurchase.total || 0);
        const saldo = parseFloat(
            apiPurchase.saldo !== undefined
                ? apiPurchase.saldo
                : Math.max(total - paidTotal, 0)
        ) || 0;

        return {
            id: apiPurchase.id,
            numeroOrden: apiPurchase.numero_orden || apiPurchase.numeroOrden || '',
            fechaCreacion: apiPurchase.fecha || apiPurchase.created_at || apiPurchase.fechaCreacion || new Date().toISOString(),
            fechaVencimiento: apiPurchase.fecha_vencimiento || apiPurchase.fechaVencimiento || '',
            estado: apiPurchase.estado || 'Pendiente',
            terminosPago: apiPurchase.terminos_pago || apiPurchase.terminosPago || 'Contado',
            proveedorNombre: (apiPurchase.supplier && apiPurchase.supplier.nombre) || apiPurchase.proveedorNombre || apiPurchase.proveedor || '',
            proveedorNit: (apiPurchase.supplier && apiPurchase.supplier.nit_ruc) || apiPurchase.proveedorNit || '',
            usuario: (apiPurchase.user && (apiPurchase.user.nombre || apiPurchase.user.username)) || apiPurchase.usuario || '',
            observaciones: apiPurchase.observaciones || '',
            items: Array.isArray(apiPurchase.items) ? apiPurchase.items : [],
            subtotal: parseFloat(apiPurchase.subtotal || 0),
            iva: parseFloat(apiPurchase.iva || 0),
            descuento: parseFloat(apiPurchase.descuento || 0),
            envio: parseFloat(apiPurchase.envio || 0),
            total: total,
            paid_total: paidTotal,
            saldo: saldo,
            afectarInventario: apiPurchase.afectarInventario !== undefined ? apiPurchase.afectarInventario : true,
            pagos: apiPayments,
            payments: apiPayments,
            estadoPago: saldo <= 0 && total > 0 ? 'Pagada' : (apiPurchase.estado || 'Pendiente')
        };
    }

    function mapApiPaymentToCompras(apiPayment) {
        const purchase = apiPayment.purchase || {};
        const supplier = apiPayment.supplier || purchase.supplier || {};
        const purchaseId = apiPayment.purchase_id || apiPayment.compraId || purchase.id || null;
        const supplierId = apiPayment.supplier_id || apiPayment.proveedorId || supplier.id || null;

        return {
            id: apiPayment.id || Date.now(),
            referencia: apiPayment.referencia || apiPayment.referencia_transaccion || ('PAG-' + Date.now()),
            proveedorId: supplierId,
            proveedorNombre: apiPayment.proveedorNombre || supplier.nombre || supplier.name || '',
            compraId: purchaseId,
            numeroOrden: apiPayment.numeroOrden || apiPayment.numero_orden || purchase.numero_orden || purchase.numeroOrden || '',
            monto: parseFloat(apiPayment.monto || apiPayment.amount || 0),
            metodoPago: apiPayment.metodoPago || apiPayment.metodo_pago || 'Transferencia',
            referenciaTransaccion: apiPayment.referenciaTransaccion || apiPayment.referencia_transaccion || '',
            tipo: apiPayment.tipo || 'Completo',
            fechaPago: apiPayment.fechaPago || apiPayment.fecha_pago || new Date().toISOString(),
            usuario: apiPayment.usuario || (apiPayment.user && (apiPayment.user.nombre || apiPayment.user.username)) || ''
        };
    }

    function collectPurchasePayments(purchases) {
        const payments = [];

        (Array.isArray(purchases) ? purchases : []).forEach(function(purchase) {
            const paymentList = Array.isArray(purchase.payments)
                ? purchase.payments
                : (Array.isArray(purchase.pagos) ? purchase.pagos : []);

            paymentList.forEach(function(payment) {
                payments.push(mapApiPaymentToCompras(Object.assign({}, payment, {
                    purchase_id: purchase.id,
                    purchase: purchase,
                    supplier_id: purchase.supplier_id || (purchase.supplier && purchase.supplier.id),
                    supplier: purchase.supplier,
                })));
            });
        });

        return payments;
    }

    function getPurchaseDisplayState(purchase) {
        if (!purchase) return 'Pendiente';

        const saldo = parseNumber(purchase.saldo !== undefined ? purchase.saldo : purchase.total);
        const total = parseNumber(purchase.total);
        const estado = String(purchase.estado || 'Pendiente');

        if (total > 0 && saldo <= 0) {
            return 'Pagada';
        }

        return estado;
    }

    function mapApiSupplierToCompras(apiSupplier) {
        return {
            id: apiSupplier.id,
            nit: apiSupplier.nit_ruc || apiSupplier.nit || '',
            nombre: apiSupplier.nombre || '',
            contacto: apiSupplier.contacto || '',
            email: apiSupplier.email || '',
            telefono: apiSupplier.telefono || '',
            direccion: apiSupplier.direccion || '',
            ciudad: apiSupplier.ciudad || '',
            terminosPago: apiSupplier.terminos_pago || apiSupplier.terminosPago || '30 días',
            descuento: parseFloat(apiSupplier.descuento || 0),
            tipo: apiSupplier.tipo || 'Regular',
            activo: (apiSupplier.estado || 'Activo') === 'Activo'
        };
    }

    function setSafeHtml(element, html) {
        if (!element) return;
        if (window.MarketWorld && MarketWorld.utils && typeof MarketWorld.utils.insertarHTMLSeguro === 'function') {
            MarketWorld.utils.insertarHTMLSeguro(element, html);
            return;
        }
        element.textContent = String(html || '');
    }

    // --- Inicialización ---
    document.addEventListener('DOMContentLoaded', async function() {
        if (typeof MarketWorld !== 'undefined' && MarketWorld.notifications) {
            MarketWorld.notifications.init();
        }

        await sincronizarDatosComprasConApi();
        await cargarUsuarioActual();

        initFechas();
        await initNumeroOrden();
        cargarSelectProveedores();
        actualizarKPIs();
        cargarHistorial();
        cargarProveedores();
        cargarHistorialPagos(); // Cargar historial de pagos inicial
        initEventListeners();
        
        // Debug: validar que el módulo de compras cargó con datos servidos por API.
    });

    async function sincronizarDatosComprasConApi() {
        try {
            const hasApi = typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.products && MarketWorld.api.suppliers;
            if (!hasApi) return;

            const [productsResponse, suppliersResponse] = await Promise.all([
                MarketWorld.api.products.getAll({ per_page: 100 }),
                MarketWorld.api.suppliers.getAll({ per_page: 100 })
            ]);

            const apiProducts = Array.isArray(productsResponse && productsResponse.data) ? productsResponse.data : [];
            const apiSuppliers = Array.isArray(suppliersResponse && suppliersResponse.data) ? suppliersResponse.data : [];
            let apiPurchases = [];

            try {
                const purchasesResponse = await MarketWorld.api.purchases.getAll({ per_page: 100 });
                apiPurchases = Array.isArray(purchasesResponse && purchasesResponse.data) ? purchasesResponse.data : [];
            } catch (purchaseError) {
                console.warn('No se pudieron sincronizar compras desde API en compras:', purchaseError.message || purchaseError);
            }

            setPurchaseCatalogProducts(apiProducts.map(mapApiProductToCompras));
            setPurchaseCatalogSuppliers(apiSuppliers.map(mapApiSupplierToCompras));
            setPurchaseCatalogPurchases(apiPurchases.map(mapApiPurchaseToCompras));
            setPurchaseCatalogPayments(collectPurchasePayments(apiPurchases));
        } catch (error) {
            console.warn('No se pudieron sincronizar productos/proveedores desde API en compras:', error.message || error);
        }
    }

    function mapApiProductToCompras(apiProduct) {
        return {
            id: apiProduct.id,
            codigo: apiProduct.sku || '',
            nombre: apiProduct.nombre || '',
            descripcion: apiProduct.descripcion || '',
            categoria: apiProduct.categoria || 'General',
            precio: parseFloat(apiProduct.precio_venta || 0),
            costo: parseFloat(apiProduct.precio_compra || 0),
            stock: parseInt(apiProduct.stock || 0, 10),
            stockMinimo: parseInt(apiProduct.stock_minimo || 0, 10),
            unidad: apiProduct.unidad || 'Unidad',
            proveedor: apiProduct.proveedor || '',
            fechaCreacion: (apiProduct.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0],
            activo: (apiProduct.estado || 'Activo') === 'Activo'
        };
    }

    function sincronizarProveedoresDesdeProductos(products) {
        const currentSuppliers = getPurchaseCatalogSuppliers();
        const names = new Set(
            currentSuppliers
                .filter(function(s) { return s && s.nombre; })
                .map(function(s) { return s.nombre.toLowerCase(); })
        );

        let nextId = currentSuppliers.length > 0
            ? Math.max.apply(Math, currentSuppliers.map(function(s) { return s.id || 0; })) + 1
            : 1;

        const generated = [];

        products.forEach(function(product) {
            const supplierName = (product && product.proveedor ? String(product.proveedor).trim() : '');
            if (!supplierName) return;

            const key = supplierName.toLowerCase();
            if (names.has(key)) return;

            names.add(key);
            generated.push({
                id: nextId++,
                nit: 'AUTO-' + Date.now() + '-' + nextId,
                nombre: supplierName,
                contacto: '',
                email: '',
                telefono: '',
                direccion: '',
                ciudad: '',
                terminosPago: '30 días',
                descuento: 0,
                tipo: 'Regular',
                activo: true,
                fechaCreacion: new Date().toISOString().split('T')[0]
            });
        });

        if (generated.length > 0) {
            setPurchaseCatalogSuppliers(currentSuppliers.concat(generated));
        }
    }

    // --- Helpers API / Auth ---
    function hasApiAccess() {
        try {
            // El acceso ahora se valida por el servidor mediante cookies HttpOnly.
            return typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.purchases && MarketWorld.api.auth;
        } catch (e) {
            return false;
        }
    }

    function normalizeApiListResponse(response, fallbackMeta) {
        if (typeof MarketWorld !== 'undefined' &&
            MarketWorld.api &&
            typeof MarketWorld.api.normalizeListResponse === 'function') {
            return MarketWorld.api.normalizeListResponse(response, fallbackMeta);
        }

        const items = response && Array.isArray(response.data) ? response.data : [];
        return {
            items: items,
            meta: Object.assign({
                total: items.length,
                per_page: (fallbackMeta && fallbackMeta.per_page) || 10,
                current_page: (fallbackMeta && fallbackMeta.current_page) || 1,
                last_page: 1,
            }, (response && response.meta) || {}),
            success: !response || response.success !== false,
        };
    }

    function ensurePurchaseHistoryPagination() {
        const tbody = document.getElementById('historialTbody');
        if (!tbody) return null;

        const tableResponsive = tbody.closest('.table-responsive');
        if (!tableResponsive || !tableResponsive.parentNode) return null;

        let container = document.getElementById('purchaseHistoryPagination');
        if (container) return container;

        container = document.createElement('nav');
        container.id = 'purchaseHistoryPagination';
        container.className = 'mt-3 d-flex justify-content-center';
        container.setAttribute('aria-label', 'Paginación historial de compras');
        tableResponsive.parentNode.appendChild(container);

        return container;
    }

    function renderPurchaseHistoryPagination() {
        const container = ensurePurchaseHistoryPagination();
        if (!container) return;

        const current = purchaseHistoryState.page;
        const last = Math.max(1, purchaseHistoryState.lastPage);

        if (last <= 1) {
            setSafeHtml(container, '');
            return;
        }

        const pageItems = [];
        const startPage = Math.max(1, current - 2);
        const endPage = Math.min(last, current + 2);

        pageItems.push('<li class="page-item' + (current <= 1 ? ' disabled' : '') + '"><a class="page-link" href="#" data-purchase-page="prev">Anterior</a></li>');

        for (let i = startPage; i <= endPage; i++) {
            pageItems.push('<li class="page-item' + (i === current ? ' active' : '') + '"><a class="page-link" href="#" data-purchase-page="' + i + '">' + i + '</a></li>');
        }

        pageItems.push('<li class="page-item' + (current >= last ? ' disabled' : '') + '"><a class="page-link" href="#" data-purchase-page="next">Siguiente</a></li>');

        setSafeHtml(container, '<ul class="pagination mb-0">' + pageItems.join('') + '</ul>');
    }

    function mapEstadoFiltroToApi(value) {
        if (!value || value === 'Todos') return '';
        if (value === 'Pagado') return '';
        if (value === 'Recibido') return 'Recibida';
        if (value === 'Cancelado') return 'Cancelada';
        return value;
    }

    // --- Usuario ---
    function cargarUsuarioActual() {
        const user = getCurrentPurchaseUser();
        if (!user) return;
        const el = (id) => document.getElementById(id);
        if (el('userName')) el('userName').textContent = user.nombre || user.username;
        if (el('userRole')) el('userRole').textContent = user.rol || 'Usuario';
        if (el('userAvatar')) {
            el('userAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nombre || user.username)}&background=0d6ef0&color=fff`;
        }
    }

    // --- Fechas e inicialización ---
    function initFechas() {
        const hoy = new Date().toISOString().split('T')[0];
        const el = (id) => document.getElementById(id);
        if (el('fechaCompra')) el('fechaCompra').value = hoy;
        if (el('fechaPago')) el('fechaPago').value = hoy;

        // Fecha vencimiento +30 días
        const venc = new Date();
        venc.setDate(venc.getDate() + 30);
        if (el('fechaVencimiento')) el('fechaVencimiento').value = venc.toISOString().split('T')[0];

        // Filtros historial
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        if (el('fechaInicio')) el('fechaInicio').value = inicioMes.toISOString().split('T')[0];
        if (el('fechaFin')) el('fechaFin').value = hoy;
    }

    async function initNumeroOrden() {
        const el = document.getElementById('numeroOrden');
        if (!el) return;

        // Intento obtener las compras desde la API si está disponible
        try {
            if (typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.purchases) {
                const resp = await MarketWorld.api.purchases.getAll();
                if (resp && resp.success && Array.isArray(resp.data)) {
                    let maxNum = 0;
                    resp.data.forEach(function(p) {
                        const texto = p.numero_orden || p.numeroOrden || '';
                        const m = String(texto).match(/OC-\d{4}-(\d{5})/);
                        if (m) {
                            const n = parseInt(m[1]);
                            if (n > maxNum) maxNum = n;
                        }
                    });
                    const year = new Date().getFullYear();
                    const next = String(maxNum + 1).padStart(5, '0');
                    el.value = 'OC-' + year + '-' + next;
                    return;
                }
            }
        } catch (e) {
            console.warn('No se pudo obtener compras desde API para generar número:', e);
        }

        const purchases = getPurchaseCatalogPurchases();
        const year = new Date().getFullYear();
        let maxNum = 0;

        purchases.forEach(function(purchase) {
            if (!purchase || !purchase.numeroOrden) return;
            const match = String(purchase.numeroOrden).match(/OC-\d{4}-(\d{5})/);
            if (match) {
                const number = parseInt(match[1], 10);
                if (number > maxNum) maxNum = number;
            }
        });

        el.value = 'OC-' + year + '-' + String(maxNum + 1).padStart(5, '0');
    }

    // --- Select de proveedores ---
    function cargarSelectProveedores() {
        const suppliers = getPurchaseCatalogSuppliers().filter(s => s.activo);
        const selects = ['selectProveedor', 'selectProveedorPago', 'filtrarProveedorPago', 'proveedorFiltro'];

        selects.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;

            const firstOpt = sel.querySelector('option');
            setSafeHtml(sel, '');
            if (firstOpt) sel.appendChild(firstOpt);

            suppliers.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                if (id === 'selectProveedorPago') {
                    const saldo = calcularSaldoProveedor(s.id);
                    opt.textContent = `${s.nombre} (Saldo: ${formatMoney(saldo)})`;
                } else {
                    opt.textContent = `${s.nombre} (NIT ${s.nit})`;
                }
                sel.appendChild(opt);
            });
        });
    }

    // --- KPIs ---
    async function actualizarKPIs() {
        const localPurchases = getPurchaseCatalogPurchases();
        const suppliers = getPurchaseCatalogSuppliers().filter(s => s.activo);

        const now = new Date();
        const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
    
        // Obtener compras desde API para KPIs reales
        let apiPurchases = [];
        if (hasApiAccess()) {
            try {
                const resp = await MarketWorld.api.purchases.getAll();
                if (resp && resp.success) apiPurchases = resp.data;
            } catch(e) { console.warn('KPIs: No se pudo conectar a la API.'); }
        }

        const purchases = apiPurchases.length > 0 ? apiPurchases : localPurchases;

        const totalPagar = purchases.filter(p => p.estado !== 'Cancelado' && p.estado !== 'Recibida')
                        .reduce((sum, p) => sum + (parseNumber(p.total) || 0), 0);
        setTextSafe('kpiTotalPagar', formatMoney(totalPagar));

        const comprasMes = purchases.filter(p => new Date(p.created_at || p.fechaCreacion) >= inicioMes && p.estado !== 'Cancelado');
        const totalMes = comprasMes.reduce((sum, p) => sum + (parseNumber(p.total) || 0), 0);
        setTextSafe('kpiComprasMes', formatMoney(totalMes));

        const pendientes = purchases.filter(p => p.estado === 'Pendiente').length;
        setTextSafe('kpiComprasPendientes', pendientes);

        setTextSafe('kpiProveedoresActivos', suppliers.length);
    }

    // --- Buscar productos (autocomplete) ---
    function buscarProductos(query) {
        if (!query || query.length < 2) {
            document.getElementById('autocompleteProductos').style.display = 'none';
            return;
        }

        const q = query.toLowerCase();
        const products = getPurchaseCatalogProducts().filter(p => p.activo);

        const resultados = products.filter(p =>
            p.nombre.toLowerCase().includes(q) ||
            p.codigo.toLowerCase().includes(q)
        ).slice(0, 8);

        const container = document.getElementById('autocompleteProductos');
        if (resultados.length === 0) {
            container.style.display = 'none';
            return;
        }

        setSafeHtml(container, resultados.map(p => `
            <div class="autocomplete-item" data-id="${p.id}" data-product-id="${p.id}">
                <div class="fw-bold">${p.nombre}</div>
                <div class="small text-muted">SKU: ${p.codigo} | Precio: ${formatMoney(p.precio)} | Stock: ${p.stock}</div>
            </div>
        `).join(''));
        container.querySelectorAll('.autocomplete-item[data-product-id]').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.getAttribute('data-product-id'), 10);
                if (!isNaN(id)) window.seleccionarProducto(id);
            });
        });
        container.style.display = 'block';
    }

    window.seleccionarProducto = function (id) {
        const product = getPurchaseCatalogProducts().find(function(item) {
            return item.id === parseInt(id, 10);
        });
        if (!product) return;

        productoSeleccionado = product;
        document.getElementById('buscarProducto').value = product.nombre;
        document.getElementById('precioCompraProducto').value = (product.precio * 0.6).toFixed(2); // Precio compra ~60% del venta
        document.getElementById('autocompleteProductos').style.display = 'none';
    };

    function agregarAlCarrito() {
        if (!productoSeleccionado) {
            mostrarAlerta('Seleccione un producto de la lista', 'warning');
            return;
        }

        const cantidad = parseInt(document.getElementById('cantidadProducto').value) || 1;
        const precio = parseFloat(document.getElementById('precioCompraProducto').value) || 0;

        if (precio <= 0) {
            mostrarAlerta('Ingrese un precio de compra válido', 'warning');
            return;
        }

        // Verificar si ya está en carrito
        const existente = carrito.find(item => item.productoId === productoSeleccionado.id);
        if (existente) {
            existente.cantidad += cantidad;
            existente.subtotal = existente.cantidad * existente.precioUnitario;
        } else {
            carrito.push({
                productoId: productoSeleccionado.id,
                codigo: productoSeleccionado.codigo,
                nombre: productoSeleccionado.nombre,
                precioUnitario: precio,
                cantidad: cantidad,
                subtotal: precio * cantidad
            });
        }

        productoSeleccionado = null;
        document.getElementById('buscarProducto').value = '';
        document.getElementById('cantidadProducto').value = '1';
        document.getElementById('precioCompraProducto').value = '0';

        renderCarrito();
        calcularTotales();
    }

    // --- Carrito ---
    function renderCarrito() {
        const tbody = document.getElementById('productosTbody');
        if (!tbody) return;

        if (carrito.length === 0) {
            setSafeHtml(tbody, `
                <tr id="emptyCartRow">
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="bi bi-cart-x fs-3"></i>
                        <p class="mb-0 mt-2">No hay productos agregados</p>
                    </td>
                </tr>`);
            return;
        }

        setSafeHtml(tbody, carrito.map((item, idx) => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="bi bi-box-seam me-2"></i>
                        <div>
                            <div>${item.nombre}</div>
                            <div class="text-muted small">SKU: ${item.codigo}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm" value="${item.precioUnitario.toFixed(2)}" 
                        min="0" step="0.01" style="width:100px;" data-cart-action="set-price" data-index="${idx}">
                </td>
                <td>
                    <div class="d-flex align-items-center gap-1">
                        <button class="btn btn-sm btn-outline-secondary" data-cart-action="decrease" data-index="${idx}">-</button>
                        <input type="number" class="form-control form-control-sm text-center" value="${item.cantidad}" 
                            min="1" style="width:60px;" data-cart-action="set-qty" data-index="${idx}">
                        <button class="btn btn-sm btn-outline-secondary" data-cart-action="increase" data-index="${idx}">+</button>
                    </div>
                </td>
                <td class="fw-bold">${formatMoney(item.subtotal)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" data-cart-action="remove" data-index="${idx}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join(''));

        tbody.querySelectorAll('[data-cart-action="set-price"]').forEach(input => {
            input.addEventListener('change', () => {
                const idx = parseInt(input.getAttribute('data-index'), 10);
                if (!isNaN(idx)) window.actualizarPrecioCarrito(idx, input.value);
            });
        });
        tbody.querySelectorAll('[data-cart-action="set-qty"]').forEach(input => {
            input.addEventListener('change', () => {
                const idx = parseInt(input.getAttribute('data-index'), 10);
                if (!isNaN(idx)) window.actualizarCantidadCarrito(idx, input.value);
            });
        });
        tbody.querySelectorAll('[data-cart-action="decrease"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                if (!isNaN(idx)) window.cambiarCantidadCarrito(idx, -1);
            });
        });
        tbody.querySelectorAll('[data-cart-action="increase"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                if (!isNaN(idx)) window.cambiarCantidadCarrito(idx, 1);
            });
        });
        tbody.querySelectorAll('[data-cart-action="remove"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                if (!isNaN(idx)) window.eliminarDelCarrito(idx);
            });
        });
    }

    window.actualizarPrecioCarrito = function (idx, valor) {
        const precio = parseFloat(valor) || 0;
        carrito[idx].precioUnitario = precio;
        carrito[idx].subtotal = precio * carrito[idx].cantidad;
        renderCarrito();
        calcularTotales();
    };

    window.actualizarCantidadCarrito = function (idx, valor) {
        const cant = parseInt(valor) || 1;
        carrito[idx].cantidad = Math.max(1, cant);
        carrito[idx].subtotal = carrito[idx].precioUnitario * carrito[idx].cantidad;
        renderCarrito();
        calcularTotales();
    };

    window.cambiarCantidadCarrito = function (idx, delta) {
        const nuevaCant = carrito[idx].cantidad + delta;
        if (nuevaCant < 1) return;
        carrito[idx].cantidad = nuevaCant;
        carrito[idx].subtotal = carrito[idx].precioUnitario * carrito[idx].cantidad;
        renderCarrito();
        calcularTotales();
    };

    window.eliminarDelCarrito = function (idx) {
        carrito.splice(idx, 1);
        renderCarrito();
        calcularTotales();
    };

    // --- Cálculos ---
    function calcularTotales() {
        const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
        const iva = subtotal * 0.19;
        const descPct = parseFloat(document.getElementById('descuentoPorcentaje')?.value) || 0;
        const descuento = (subtotal + iva) * (descPct / 100);
        const envio = parseFloat(document.getElementById('envioInput')?.value) || 0;
        const total = subtotal + iva - descuento + envio;

        setTextSafe('subtotalVal', formatMoney(subtotal));
        setTextSafe('ivaVal', formatMoney(iva));
        setTextSafe('descuentoVal', `-${formatMoney(descuento)}`);
        setTextSafe('totalVal', formatMoney(total));
    }

    // --- Registrar compra ---
    async function registrarCompra() {
        const btnSave = document.getElementById('btnRegistrarCompra');
        
        // Validaciones
        const proveedorId = document.getElementById('selectProveedor')?.value;
        if (!proveedorId) {
            mostrarAlerta('Seleccione un proveedor', 'warning');
            return;
        }

        if (carrito.length === 0) {
            mostrarAlerta('Agregue al menos un producto', 'warning');
            return;
        }

        const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
        const iva = subtotal * 0.19;
        const descPct = parseFloat(document.getElementById('descuentoPorcentaje')?.value) || 0;
        const descuento = (subtotal + iva) * (descPct / 100);
        const envio = parseFloat(document.getElementById('envioInput')?.value) || 0;
        const total = subtotal + iva - descuento + envio;

        const originalText = btnSave ? btnSave.innerHTML : '';
        if (btnSave) {
            btnSave.disabled = true;
            setSafeHtml(btnSave, '<span class="spinner-border spinner-border-sm me-2"></span> Procesando...');
        }

        try {
            const ordenNumero = document.getElementById('numeroOrden')?.value || 'COM-' + Date.now();
            const observaciones = document.getElementById('observacionesCompra')?.value || '';
            const fechaVal = document.getElementById('fechaCompra')?.value || new Date().toISOString().split('T')[0];

            const selectedEstado = document.getElementById('compraEstado')?.value || 'Recibida';
            const afectarInventario = !!document.getElementById('affectInventory')?.checked;

            const purchaseData = {
                numero_orden: ordenNumero,
                supplier_id: parseInt(proveedorId),
                fecha: fechaVal,
                total: total,
                estado: selectedEstado,
                observaciones: observaciones,
                afectarInventario: afectarInventario,
                items: carrito.map(item => ({
                    product_id: item.productoId,
                    cantidad: item.cantidad,
                    precio_unitario: item.precioUnitario,
                    subtotal: item.subtotal
                }))
            };

            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.purchases) {
                throw new Error('Adaptador de API no disponible');
            }

            const response = await MarketWorld.api.purchases.create(purchaseData);

            if (response && response.success) {
                // Mostrar modal grande de éxito con opciones Aceptar/Cancelar
                showSuccessModal(ordenNumero, response.data);
            } else {
                throw new Error(response.message || 'Error al guardar la compra.');
            }
            
        } catch (error) {
            console.error('Error al registrar compra:', error);
            try { console.error('API error details:', error.status, error.body || error); } catch(e) {}
                // Si la API devolvió errores de validación, mostrarlos detalladamente
                try {
                    if (error && error.body && error.body.errors) {
                        const errs = error.body.errors;
                        const messages = [];
                        for (const key in errs) {
                            if (Array.isArray(errs[key])) {
                                messages.push(errs[key].join(', '));
                            } else {
                                messages.push(String(errs[key]));
                            }
                        }
                        mostrarAlerta(`❌ Error de validación: ${messages.join(' | ')}`, 'danger');
                    } else {
                        mostrarAlerta(`❌ Error: ${error.message || error}`, 'danger');
                    }
                } catch (e) {
                    mostrarAlerta(`❌ Error al registrar compra: ${error.message || error}`, 'danger');
                }
        } finally {
            if (btnSave) {
                btnSave.disabled = false;
                setSafeHtml(btnSave, originalText);
            }
        }
    }

    function limpiarFormularioCompra() {
        carrito = [];
        productoSeleccionado = null;
        renderCarrito();
        calcularTotales();

        const el = (id) => document.getElementById(id);
        if (el('selectProveedor')) el('selectProveedor').value = '';
        if (el('observacionesCompra')) el('observacionesCompra').value = '';
        if (el('descuentoPorcentaje')) el('descuentoPorcentaje').value = '0';
        if (el('envioInput')) el('envioInput').value = '0';
        if (el('alertEstadoCuenta')) el('alertEstadoCuenta').style.display = 'none';
        if (el('buscarProducto')) el('buscarProducto').value = '';

        initNumeroOrden();
        initFechas();
    }

    // --- Historial de compras ---
    async function cargarHistorial(options) {
        options = options || {};
        const tbody = document.getElementById('historialTbody');
        if (!tbody) return;

        if (options.resetPage) {
            purchaseHistoryState.page = 1;
        }

        if (typeof options.search === 'string') {
            purchaseSearchTerm = options.search.trim();
        }

        const searchTerm = String(options.search !== undefined ? options.search : purchaseSearchTerm || '').trim().toLowerCase();

        try {
            if (!hasApiAccess()) return;

            const estadoFiltro = document.getElementById('estadoFiltro');
            const proveedorFiltro = document.getElementById('proveedorFiltro');
            const fechaInicioFiltro = document.getElementById('fechaInicio');
            const fechaFinFiltro = document.getElementById('fechaFin');
            const estadoSeleccionado = estadoFiltro ? estadoFiltro.value : 'Todos';
            const requestFilters = {
                page: purchaseHistoryState.page,
                per_page: purchaseHistoryState.perPage,
            };

            const estadoApi = mapEstadoFiltroToApi(estadoSeleccionado);
            if (estadoApi) requestFilters.estado = estadoApi;

            if (proveedorFiltro && proveedorFiltro.value) {
                requestFilters.supplier_id = proveedorFiltro.value;
            }

            if (searchTerm) {
                requestFilters.search = searchTerm;
            }

            const response = await MarketWorld.api.purchases.getAll(requestFilters);
            const parsed = normalizeApiListResponse(response, {
                current_page: purchaseHistoryState.page,
                per_page: purchaseHistoryState.perPage,
            });
            if (!parsed.success) return;

            const normalizedPurchases = parsed.items.map(mapApiPurchaseToCompras);
            setPurchaseCatalogPurchases(normalizedPurchases);
            setPurchaseCatalogPayments(collectPurchasePayments(normalizedPurchases));

            purchaseHistoryState.page = parsed.meta.current_page;
            purchaseHistoryState.perPage = parsed.meta.per_page;
            purchaseHistoryState.lastPage = parsed.meta.last_page;
            purchaseHistoryState.total = parsed.meta.total;

            let purchases = normalizedPurchases.slice();

            if (estadoSeleccionado === 'Pagado') {
                purchases = purchases.filter(function(purchase) {
                    return getPurchaseDisplayState(purchase) === 'Pagada';
                });
            } else if (estadoSeleccionado && estadoSeleccionado !== 'Todos') {
                purchases = purchases.filter(function(purchase) {
                    return getPurchaseDisplayState(purchase) === estadoSeleccionado || purchase.estado === estadoSeleccionado;
                });
            }

            if (searchTerm) {
                purchases = purchases.filter(function(purchase) {
                    const searchable = [
                        purchase.numeroOrden,
                        purchase.proveedorNombre,
                        purchase.proveedorNit,
                        purchase.observaciones,
                        purchase.estado,
                        purchase.estadoPago,
                        String(purchase.id),
                    ].join(' ').toLowerCase();

                    return searchable.includes(searchTerm);
                });
            }

            if (fechaInicioFiltro && fechaInicioFiltro.value) {
                const inicio = new Date(fechaInicioFiltro.value + 'T00:00:00');
                purchases = purchases.filter(function(purchase) {
                    const fecha = new Date(purchase.fechaCreacion || purchase.fecha || purchase.created_at || 0);
                    return !isNaN(fecha.getTime()) && fecha >= inicio;
                });
            }

            if (fechaFinFiltro && fechaFinFiltro.value) {
                const fin = new Date(fechaFinFiltro.value + 'T23:59:59');
                purchases = purchases.filter(function(purchase) {
                    const fecha = new Date(purchase.fechaCreacion || purchase.fecha || purchase.created_at || 0);
                    return !isNaN(fecha.getTime()) && fecha <= fin;
                });
            }

            setSafeHtml(tbody, '');

            if (purchases.length === 0) {
                setSafeHtml(tbody, '<tr><td colspan="8" class="text-center text-muted py-4">No hay compras registradas</td></tr>');
                renderPurchaseHistoryPagination();
                return;
            }

            setSafeHtml(tbody, purchases.map(p => {
                const fecha = new Date(p.fechaCreacion || p.fecha || p.created_at || Date.now()).toLocaleDateString('es-CO');
                const estadoVisual = getPurchaseDisplayState(p);
                const badgeClass = getBadgeClass(estadoVisual);
                const proveedorNombre = (p.supplier && p.supplier.nombre) || p.proveedor || p.proveedorNombre || 'Sin proveedor';

                return `
                    <tr>
                        <td><strong>${p.numero_orden || p.numeroOrden}</strong></td>
                        <td>${fecha}</td>
                        <td class="fw-bold">${proveedorNombre}</td>
                        <td class="fw-bold">${formatMoney(parseFloat(p.total))}</td>
                        <td><span class="badge ${badgeClass}">${estadoVisual}</span></td>
                        <td>${p.observaciones || '-'}</td>
                        <td>${formatMoney(parseFloat(p.saldo || 0))}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary btn-ver-compra" data-purchase-id="${p.id}">
                                <i class="bi bi-eye"></i>
                            </button>
                        </td>
                    </tr>`;
            }).join(''));

            tbody.querySelectorAll('.btn-ver-compra[data-purchase-id]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = parseInt(btn.getAttribute('data-purchase-id'), 10);
                    if (!isNaN(id)) window.verDetalleCompra(id);
                });
            });

            renderPurchaseHistoryPagination();
            actualizarKPIs();

        } catch (error) {
            console.error('Error al cargar historial de compras API:', error);
        }
    }

    function getBadgeClass(estado) {
        switch (estado) {
            case 'Pendiente': return 'bg-warning text-dark';
            case 'Recibida':
            case 'Recibido': return 'bg-info text-white';
            case 'Pagada':
            case 'Pagado': return 'bg-success';
            case 'Cancelada':
            case 'Cancelado': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    window.verDetalleCompra = async function (id) {
        let purchase = getPurchaseCatalogPurchases().find(function(item) {
            return parseInt(item.id, 10) === parseInt(id, 10);
        }) || null;

        // Si no está en local, intentar desde la API
        if (!purchase && typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.purchases && MarketWorld.api.purchases.getById) {
            try {
                const resp = await MarketWorld.api.purchases.getById(id);
                if (resp && resp.success && resp.data) {
                    const p = mapApiPurchaseToCompras(resp.data);
                    const itemsArr = Array.isArray(p.items) ? p.items.map(i => {
                        const precio = i.precio_unitario || i.precioUnitario || i.unit_price || 0;
                        const cantidad = i.cantidad || i.quantity || 0;
                        const subtotalItem = i.subtotal || (precio * cantidad) || 0;
                        return {
                            nombre: (i.product && i.product.nombre) || i.nombre || i.productoNombre || '',
                            codigo: (i.product && i.product.sku) || i.codigo || i.product_codigo || '',
                            precioUnitario: precio,
                            cantidad: cantidad,
                            subtotal: subtotalItem,
                            productoId: i.product_id || (i.product && i.product.id) || null
                        };
                    }) : [];

                    const subtotalCalc = itemsArr.reduce((s, it) => s + (it.subtotal || 0), 0);
                    const descuentoCalc = p.descuento || 0;
                    const envioCalc = p.envio || 0;
                    const ivaCalc = p.iva !== undefined ? p.iva : parseFloat((subtotalCalc * 0.19).toFixed(2));
                    const totalCalc = p.total !== undefined ? p.total : (subtotalCalc + ivaCalc - descuentoCalc + envioCalc);

                    purchase = {
                        id: p.id,
                        numeroOrden: p.numeroOrden || '',
                        fechaCreacion: p.fechaCreacion || new Date().toISOString(),
                        fechaVencimiento: p.fechaVencimiento || '',
                        estado: p.estado || 'Pendiente',
                        terminosPago: p.terminosPago || '',
                        proveedorNombre: p.proveedorNombre || '',
                        proveedorNit: p.proveedorNit || '',
                        usuario: p.usuario || '',
                        observaciones: p.observaciones || '',
                        items: itemsArr,
                        subtotal: subtotalCalc,
                        iva: ivaCalc,
                        descuento: descuentoCalc,
                        envio: envioCalc,
                        total: totalCalc,
                        saldo: p.saldo || (totalCalc - (p.paid_total || 0)) || 0,
                        afectarInventario: p.afectarInventario !== undefined ? p.afectarInventario : true
                    };
                }
            } catch (e) {
                console.warn('No se pudo obtener orden desde API:', e && e.message ? e.message : e);
            }
        }

        if (!purchase) return;

        const fecha = new Date(purchase.fechaCreacion).toLocaleDateString('es-CO');
        const venc = purchase.fechaVencimiento ? new Date(purchase.fechaVencimiento).toLocaleDateString('es-CO') : '-';
        const estadoVisual = getPurchaseDisplayState(purchase);
        
        const pagosCompra = (Array.isArray(purchase.pagos) ? purchase.pagos : (Array.isArray(purchase.payments) ? purchase.payments : getPurchaseCatalogPayments())).filter(function(payment) {
            const paymentPurchaseId = payment.compraId || payment.purchase_id || payment.purchaseId || (payment.purchase && payment.purchase.id) || id;
            return parseInt(paymentPurchaseId, 10) === parseInt(id, 10);
        });
        const totalPagado = parseNumber(purchase.paid_total) || pagosCompra.reduce((sum, p) => sum + (p.monto || 0), 0);

        const body = document.getElementById('detalleCompraBody');
        setSafeHtml(body, `
            <div class="row mb-3">
                <div class="col-md-6">
                    <h6>Información de la Orden</h6>
                    <p><strong>N° Orden:</strong> ${purchase.numeroOrden}</p>
                    <p><strong>Fecha:</strong> ${fecha}</p>
                    <p><strong>Vencimiento:</strong> ${venc}</p>
                    <p><strong>Estado:</strong> <span class="badge ${getBadgeClass(estadoVisual)}">${estadoVisual}</span></p>
                    <p><strong>Términos:</strong> ${purchase.terminosPago}</p>
                </div>
                <div class="col-md-6">
                    <h6>Proveedor</h6>
                    <p><strong>Nombre:</strong> ${purchase.proveedorNombre}</p>
                    <p><strong>NIT:</strong> ${purchase.proveedorNit}</p>
                    <p><strong>Registrado por:</strong> ${purchase.usuario}</p>
                    ${purchase.observaciones ? `<p><strong>Observaciones:</strong> ${purchase.observaciones}</p>` : ''}
                </div>
            </div>
            <h6>Productos</h6>
            <table class="table table-sm">
                <thead>
                    <tr><th>Producto</th><th>SKU</th><th>Precio</th><th>Cant.</th><th>Subtotal</th></tr>
                </thead>
                <tbody>
                    ${purchase.items.map(item => `
                        <tr>
                            <td>${item.nombre}</td>
                            <td>${item.codigo}</td>
                            <td>${formatMoney(item.precioUnitario)}</td>
                            <td>${item.cantidad}</td>
                            <td>${formatMoney(item.subtotal)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <hr>
            <div class="row">
                <div class="col-md-6 offset-md-6">
                    <div class="d-flex justify-content-between"><span>Subtotal:</span><span>${formatMoney(purchase.subtotal)}</span></div>
                    <div class="d-flex justify-content-between"><span>IVA (19%):</span><span>${formatMoney(purchase.iva)}</span></div>
                    <div class="d-flex justify-content-between"><span>Descuento:</span><span class="text-success">-${formatMoney(purchase.descuento)}</span></div>
                    <div class="d-flex justify-content-between"><span>Envío:</span><span>${formatMoney(purchase.envio || 0)}</span></div>
                    <hr>
                    <div class="d-flex justify-content-between fw-bold fs-5"><span>Total:</span><span>${formatMoney(purchase.total)}</span></div>
                    <div class="d-flex justify-content-between mt-2 text-success"><span>Total pagado:</span><span class="fw-bold">${formatMoney(totalPagado)}</span></div>
                    <div class="d-flex justify-content-between mt-1"><span>Saldo pendiente:</span><span class="fw-bold ${parseNumber(purchase.saldo) <= 0 ? 'text-success' : 'text-danger'}">${formatMoney(purchase.saldo || 0)}</span></div>
                </div>
            </div>
            ${pagosCompra.length > 0 ? `
                <hr>
                <h6>Historial de Pagos (${pagosCompra.length})</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Método</th>
                                <th>Referencia</th>
                                <th>Monto</th>
                                <th>Tipo</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pagosCompra.map(pago => `
                                <tr>
                                    <td>${new Date(pago.fechaPago).toLocaleDateString('es-CO')}</td>
                                    <td>${pago.metodoPago}</td>
                                    <td>${pago.referenciaTransaccion || '-'}</td>
                                    <td class="text-success fw-bold">${formatMoney(pago.monto)}</td>
                                    <td><span class="badge ${pago.tipo === 'Completo' ? 'bg-success' : 'bg-warning text-dark'}">${pago.tipo}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<div class="alert alert-info mt-3">No hay pagos registrados para esta orden.</div>'}
        `);

        const modal = new bootstrap.Modal(document.getElementById('modalDetalleCompra'));
        modal.show();
    };

    window.marcarRecibido = async function (id) {
        if (!confirm('¿Marcar esta orden como recibida?')) return;

        if (!hasApiAccess() || !MarketWorld.api.purchases.update) {
            mostrarAlerta('No hay conexión API activa para actualizar la orden.', 'warning');
            return;
        }

        try {
            const response = await MarketWorld.api.purchases.update(id, { estado: 'Recibida' });
            if (!response || !response.success) {
                throw new Error((response && response.message) ? response.message : 'No se pudo actualizar la orden.');
            }

            const orderNumber = (response.data && response.data.numero_orden)
                ? response.data.numero_orden
                : ('#' + id);

            if (typeof MarketWorld !== 'undefined' && MarketWorld.notifications) {
                MarketWorld.notifications.create('info', 'Orden Recibida', `La orden ${orderNumber} fue marcada como recibida`, 'compras.html');
            }

            const filtroEstado = document.getElementById('estadoFiltro');
            if (filtroEstado && (filtroEstado.value === 'Pendiente' || filtroEstado.value === 'Pagado')) {
                filtroEstado.value = 'Todos';
            }

            await cargarHistorial();
            await actualizarKPIs();
            mostrarAlerta('Orden marcada como recibida', 'success');
        } catch (error) {
            const message = (error && error.body && error.body.message)
                ? error.body.message
                : (error.message || 'Error al marcar la orden como recibida.');
            mostrarAlerta(message, 'danger');
        }
    };

    window.cancelarCompra = async function (id) {
        if (!confirm('¿Está seguro de cancelar esta orden de compra?')) return;

        if (!hasApiAccess() || !MarketWorld.api.purchases.update) {
            mostrarAlerta('No hay conexión API activa para actualizar la orden.', 'warning');
            return;
        }

        try {
            const response = await MarketWorld.api.purchases.update(id, { estado: 'Cancelada' });
            if (!response || !response.success) {
                throw new Error((response && response.message) ? response.message : 'No se pudo cancelar la orden.');
            }

            const orderNumber = (response.data && response.data.numero_orden)
                ? response.data.numero_orden
                : ('#' + id);

            if (typeof MarketWorld !== 'undefined' && MarketWorld.notifications) {
                MarketWorld.notifications.create('danger', 'Orden Cancelada', `La orden ${orderNumber} fue cancelada`, 'compras.html');
            }

            const filtroEstado = document.getElementById('estadoFiltro');
            if (filtroEstado && filtroEstado.value !== 'Todos' && filtroEstado.value !== 'Cancelada') {
                filtroEstado.value = 'Todos';
            }

            await cargarHistorial();
            await actualizarKPIs();
            mostrarAlerta('Orden cancelada correctamente.', 'warning');
        } catch (error) {
            const message = (error && error.body && error.body.message)
                ? error.body.message
                : (error.message || 'Error al cancelar la orden.');
            mostrarAlerta(message, 'danger');
        }
    };

    // --- Proveedores ---
    function cargarProveedores(filtro) {
        let suppliers = getPurchaseCatalogSuppliers();

        if (filtro) {
            const q = filtro.toLowerCase();
            suppliers = suppliers.filter(s =>
                s.nombre.toLowerCase().includes(q) ||
                s.nit.toLowerCase().includes(q) ||
                (s.contacto && s.contacto.toLowerCase().includes(q))
            );
        }

        const tbody = document.getElementById('proveedoresTbody');
        if (!tbody) return;

        if (suppliers.length === 0) {
            setSafeHtml(tbody, '<tr><td colspan="5" class="text-center text-muted py-4">No se encontraron proveedores</td></tr>');
            return;
        }

        setSafeHtml(tbody, suppliers.map(s => {
            const compras = getPurchaseCatalogPurchases().filter(function(item) {
                return parseInt(item.proveedorId || item.supplier_id || 0, 10) === parseInt(s.id, 10);
            }).length;
            const saldo = calcularSaldoProveedor(s.id);

            return `
                <tr style="cursor:pointer;" data-supplier-action="view" data-supplier-id="${s.id}">
                    <td>
                        <div class="fw-bold">${s.nombre}</div>
                        <div class="text-muted small">NIT ${s.nit}</div>
                        ${!s.activo ? '<span class="badge bg-secondary">Inactivo</span>' : ''}
                    </td>
                    <td>
                        <div>${s.contacto || '-'}</div>
                        <div class="text-muted small">${s.email || ''}</div>
                    </td>
                    <td>${compras}</td>
                    <td class="fw-bold ${saldo <= 0 ? 'text-success' : 'text-danger'}">${formatMoney(saldo)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" title="Ver detalle" data-supplier-action="view" data-supplier-id="${s.id}">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info me-1" title="Editar" data-supplier-action="edit" data-supplier-id="${s.id}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" title="Eliminar" data-supplier-action="delete" data-supplier-id="${s.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>`;
        }).join(''));

        tbody.querySelectorAll('[data-supplier-action][data-supplier-id]').forEach(el => {
            el.addEventListener('click', (event) => {
                const action = el.getAttribute('data-supplier-action');
                const id = parseInt(el.getAttribute('data-supplier-id'), 10);
                if (isNaN(id)) return;
                if (action === 'view') {
                    window.verDetalleProveedor(id);
                    return;
                }
                event.stopPropagation();
                if (action === 'edit') {
                    window.editarProveedor(id);
                } else if (action === 'delete') {
                    window.eliminarProveedor(id);
                }
            });
        });
    }

    function calcularSaldoProveedor(supplierId) {
        const purchases = getPurchaseCatalogPurchases().filter(function(item) {
            return parseInt(item.proveedorId || item.supplier_id || 0, 10) === parseInt(supplierId, 10);
        });
        return purchases.reduce((sum, p) => sum + (p.saldo || 0), 0);
    }

    function calcularTotalComprasProveedor(supplierId) {
        const purchases = getPurchaseCatalogPurchases().filter(function(item) {
            return parseInt(item.proveedorId || item.supplier_id || 0, 10) === parseInt(supplierId, 10);
        });
        return purchases.reduce((sum, p) => sum + (p.total || 0), 0);
    }

    function calcularTotalPagadoProveedor(supplierId) {
        const payments = getPurchaseCatalogPayments().filter(function(item) {
            return parseInt(item.proveedorId || item.supplierId || 0, 10) === parseInt(supplierId, 10);
        });
        return payments.reduce((sum, p) => sum + (p.monto || 0), 0);
    }

    window.verDetalleProveedor = function (id) {
        const supplier = getPurchaseCatalogSuppliers().find(function(item) {
            return item.id === parseInt(id, 10);
        });
        if (!supplier) return;

        const totalCompras = calcularTotalComprasProveedor(id);
        const totalPagado = calcularTotalPagadoProveedor(id);
        const saldo = calcularSaldoProveedor(id);
        const numCompras = getPurchaseCatalogPurchases().filter(function(item) {
            return parseInt(item.proveedorId || item.supplier_id || 0, 10) === parseInt(id, 10);
        }).length;

        const body = document.getElementById('detalleProveedorBody');
        setSafeHtml(body, `
            <div class="text-center mb-4">
                <div class="fw-bold fs-4">${supplier.nombre}</div>
                <div class="text-muted">NIT ${supplier.nit}</div>
                <span class="badge ${supplier.tipo === 'Premium' ? 'bg-warning text-dark' : 'bg-secondary'} mt-2">Proveedor ${supplier.tipo}</span>
            </div>
            <div class="mb-4">
                <h6>Información de Contacto</h6>
                <ul class="list-group">
                    <li class="list-group-item"><i class="bi bi-person me-2"></i> ${supplier.contacto || '-'}</li>
                    <li class="list-group-item"><i class="bi bi-envelope me-2"></i> ${supplier.email || '-'}</li>
                    <li class="list-group-item"><i class="bi bi-telephone me-2"></i> ${supplier.telefono || '-'}</li>
                    <li class="list-group-item"><i class="bi bi-geo-alt me-2"></i> ${supplier.direccion || '-'}${supplier.ciudad ? ', ' + supplier.ciudad : ''}</li>
                </ul>
            </div>
            <div class="mb-4">
                <h6>Condiciones Comerciales</h6>
                <div class="d-flex justify-content-between mb-2">
                    <span>Términos de pago:</span><span>${supplier.terminosPago}</span>
                </div>
                <div class="d-flex justify-content-between">
                    <span>Descuento habitual:</span><span>${supplier.descuento}%</span>
                </div>
            </div>
            <div>
                <h6>Estado de Cuenta</h6>
                <div class="d-flex justify-content-between mb-2">
                    <span>Total compras (${numCompras}):</span><span>${formatMoney(totalCompras)}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span>Total pagado:</span><span>${formatMoney(totalPagado)}</span>
                </div>
                <div class="d-flex justify-content-between fw-bold">
                    <span>Saldo pendiente:</span>
                    <span class="${saldo <= 0 ? 'text-success' : 'text-danger'}">${formatMoney(saldo)}</span>
                </div>
            </div>
            <div class="d-grid gap-2 mt-3">
                <button class="btn btn-outline-info btn-sm" id="btnEditarProveedorDetalle" data-supplier-id="${id}">
                    <i class="bi bi-pencil me-1"></i> Editar
                </button>
            </div>
        `);

        const btnEditarDetalle = document.getElementById('btnEditarProveedorDetalle');
        if (btnEditarDetalle) {
            btnEditarDetalle.addEventListener('click', () => {
                const supplierId = parseInt(btnEditarDetalle.getAttribute('data-supplier-id'), 10);
                if (!isNaN(supplierId)) window.editarProveedor(supplierId);
            });
        }
    };

    window.editarProveedor = function (id) {
        const supplier = id ? getPurchaseCatalogSuppliers().find(function(item) {
            return item.id === parseInt(id, 10);
        }) : null;
        const label = document.getElementById('modalProveedorLabel');

        if (supplier) {
            label.textContent = 'Editar Proveedor';
            document.getElementById('proveedorIdEdit').value = supplier.id;
            document.getElementById('provNombre').value = supplier.nombre;
            document.getElementById('provNit').value = supplier.nit;
            document.getElementById('provContacto').value = supplier.contacto || '';
            document.getElementById('provEmail').value = supplier.email || '';
            document.getElementById('provTelefono').value = supplier.telefono || '';
            document.getElementById('provCiudad').value = supplier.ciudad || '';
            document.getElementById('provDireccion').value = supplier.direccion || '';
            document.getElementById('provTerminos').value = supplier.terminosPago;
            document.getElementById('provDescuento').value = supplier.descuento;
            document.getElementById('provTipo').value = supplier.tipo;
        } else {
            label.textContent = 'Nuevo Proveedor';
            document.getElementById('proveedorIdEdit').value = '';
            document.getElementById('provNombre').value = '';
            document.getElementById('provNit').value = '';
            document.getElementById('provContacto').value = '';
            document.getElementById('provEmail').value = '';
            document.getElementById('provTelefono').value = '';
            document.getElementById('provCiudad').value = '';
            document.getElementById('provDireccion').value = '';
            document.getElementById('provTerminos').value = '30 días';
            document.getElementById('provDescuento').value = '0';
            document.getElementById('provTipo').value = 'Regular';
        }

        const modal = new bootstrap.Modal(document.getElementById('modalProveedor'));
        modal.show();
    };

    function guardarProveedor() {
        const nombre = document.getElementById('provNombre').value.trim();
        const nit = document.getElementById('provNit').value.trim();

        if (!nombre || !nit) {
            mostrarAlerta('Nombre y NIT son obligatorios', 'warning');
            return;
        }

        const data = {
            nombre: nombre,
            nit: nit,
            contacto: document.getElementById('provContacto').value.trim(),
            email: document.getElementById('provEmail').value.trim(),
            telefono: document.getElementById('provTelefono').value.trim(),
            ciudad: document.getElementById('provCiudad').value.trim(),
            direccion: document.getElementById('provDireccion').value.trim(),
            terminosPago: document.getElementById('provTerminos').value,
            descuento: parseFloat(document.getElementById('provDescuento').value) || 0,
            tipo: document.getElementById('provTipo').value
        };

        const editId = document.getElementById('proveedorIdEdit').value;

        if (editId) {
            if (!MarketWorld.api || !MarketWorld.api.suppliers) {
                mostrarAlerta('No hay API disponible para actualizar proveedores', 'warning');
                return;
            }

            MarketWorld.api.suppliers.update(parseInt(editId), data)
                .then(function(response) {
                    if (!response || !response.success) {
                        throw new Error((response && response.message) ? response.message : 'No se pudo actualizar el proveedor');
                    }
                    mostrarAlerta('Proveedor actualizado exitosamente', 'success');
                    return sincronizarDatosComprasConApi().then(function() {
                        cargarProveedores();
                        cargarSelectProveedores();
                    });
                })
                .catch(function(error) {
                    mostrarAlerta((error && error.message) ? error.message : 'No se pudo actualizar el proveedor', 'danger');
                });
            bootstrap.Modal.getInstance(document.getElementById('modalProveedor')).hide();
            return;
        } else {
            if (!MarketWorld.api || !MarketWorld.api.suppliers) {
                mostrarAlerta('No hay API disponible para crear proveedores', 'warning');
                return;
            }

            const duplicate = getPurchaseCatalogSuppliers().find(function(item) {
                return String(item.nit || '').toLowerCase() === String(nit).toLowerCase();
            });
            if (duplicate) {
                mostrarAlerta('Ya existe un proveedor con ese NIT', 'danger');
                return;
            }

            MarketWorld.api.suppliers.create(data)
                .then(function(response) {
                    if (!response || !response.success) {
                        throw new Error((response && response.message) ? response.message : 'No se pudo crear el proveedor');
                    }

                    if (typeof MarketWorld !== 'undefined' && MarketWorld.notifications) {
                        MarketWorld.notifications.create('success', 'Nuevo Proveedor', `Proveedor "${nombre}" registrado exitosamente`, 'compras.html');
                    }

                    mostrarAlerta('Proveedor creado exitosamente', 'success');
                    return sincronizarDatosComprasConApi().then(function() {
                        cargarProveedores();
                        cargarSelectProveedores();
                    });
                })
                .catch(function(error) {
                    mostrarAlerta((error && error.message) ? error.message : 'No se pudo crear el proveedor', 'danger');
                });
        }

        bootstrap.Modal.getInstance(document.getElementById('modalProveedor')).hide();
    }

    window.eliminarProveedor = function (id) {
        const supplier = getPurchaseCatalogSuppliers().find(function(item) {
            return item.id === parseInt(id, 10);
        });
        if (!supplier) return;

        const compras = getPurchaseCatalogPurchases().filter(function(item) {
            return parseInt(item.proveedorId || item.supplier_id || 0, 10) === parseInt(id, 10);
        });
        if (compras.length > 0) {
            mostrarAlerta('No se puede eliminar un proveedor con compras asociadas. Puede desactivarlo.', 'warning');
            return;
        }

        if (!confirm(`¿Eliminar el proveedor "${supplier.nombre}"?`)) return;

        if (!MarketWorld.api || !MarketWorld.api.suppliers) {
            mostrarAlerta('No hay API disponible para eliminar proveedores', 'warning');
            return;
        }

        MarketWorld.api.suppliers.delete(id)
            .then(function(response) {
                if (!response || !response.success) {
                    throw new Error((response && response.message) ? response.message : 'No se pudo eliminar el proveedor');
                }
                mostrarAlerta('Proveedor eliminado', 'success');
                return sincronizarDatosComprasConApi().then(function() {
                    cargarProveedores();
                    cargarSelectProveedores();
                });
            })
            .catch(function(error) {
                mostrarAlerta((error && error.message) ? error.message : 'No se pudo eliminar el proveedor', 'danger');
            });
    };

    // --- Pagos ---
    function cargarComprasPendientesPago(proveedorId) {
        const container = document.getElementById('listaComprasPendientes');
        if (!container) return;

        if (!proveedorId) {
            setSafeHtml(container, '<p class="text-muted small mb-0">Seleccione un proveedor</p>');
            return;
        }

        const compras = getPurchaseCatalogPurchases().filter(function(item) {
            return parseInt(item.proveedorId || item.supplier_id || 0, 10) === parseInt(proveedorId, 10);
        })
            .filter(p => p.saldo > 0 && p.estado !== 'Cancelado');

        if (compras.length === 0) {
            setSafeHtml(container, '<p class="text-muted small mb-0">No hay compras pendientes de pago</p>');
            return;
        }

        setSafeHtml(container, compras.map(p => {
            const venc = p.fechaVencimiento ? new Date(p.fechaVencimiento).toLocaleDateString('es-CO') : '-';
            return `
                <div class="form-check mb-1">
                    <input class="form-check-input compra-pago-check" type="checkbox" value="${p.id}" id="compraPago${p.id}" data-saldo="${p.saldo}">
                    <label class="form-check-label small" for="compraPago${p.id}">
                        ${p.numeroOrden} - ${formatMoney(p.saldo)} (Vence: ${venc})
                    </label>
                </div>`;
        }).join(''));

        // Listener para actualizar monto
        container.querySelectorAll('.compra-pago-check').forEach(cb => {
            cb.addEventListener('change', () => {
                let total = 0;
                container.querySelectorAll('.compra-pago-check:checked').forEach(checked => {
                    total += parseFloat(checked.dataset.saldo) || 0;
                });
                const montoInput = document.getElementById('montoPagar');
                if (montoInput) montoInput.value = total.toFixed(2);
            });
        });
    }

    async function registrarPago() {
        const proveedorId = parseInt(document.getElementById('selectProveedorPago')?.value);
        if (!proveedorId) {
            mostrarAlerta('Seleccione un proveedor', 'warning');
            return;
        }

        const monto = parseFloat(document.getElementById('montoPagar')?.value) || 0;
        if (monto <= 0) {
            mostrarAlerta('Ingrese un monto válido', 'warning');
            return;
        }

        const proveedor = getPurchaseCatalogSuppliers().find(function(item) {
            return item.id === proveedorId;
        });
        if (!proveedor) {
            mostrarAlerta('Proveedor no encontrado', 'danger');
            return;
        }

        const referencia = document.getElementById('referenciaPago')?.value || '';
        const fechaPago = document.getElementById('fechaPago')?.value || new Date().toISOString();

        // Obtener compras seleccionadas
        const checksSeleccionados = document.querySelectorAll('.compra-pago-check:checked');
        if (checksSeleccionados.length === 0) {
            mostrarAlerta('Seleccione al menos una compra pendiente para registrar el pago', 'warning');
            return;
        }

        const comprasSeleccionadas = Array.from(checksSeleccionados).map(function(cb) {
            return getPurchaseCatalogPurchases().find(function(item) {
                return parseInt(item.id, 10) === parseInt(cb.value, 10);
            });
        }).filter(Boolean);

        const saldoSeleccionado = comprasSeleccionadas.reduce(function(sum, purchase) {
            return sum + parseNumber(purchase.saldo || 0);
        }, 0);

        if (monto > saldoSeleccionado) {
            mostrarAlerta('El monto supera el saldo combinado de las compras seleccionadas', 'warning');
            return;
        }

        if (!hasApiAccess() || !MarketWorld.api.purchases || !MarketWorld.api.purchases.registerPayment) {
            mostrarAlerta('No hay API disponible para registrar pagos', 'warning');
            return;
        }

        try {
            let montoRestante = monto;

            for (const purchase of comprasSeleccionadas) {
                if (montoRestante <= 0) break;

                const saldoCompra = parseNumber(purchase.saldo || 0);
                if (saldoCompra <= 0) continue;

                const pagoAplicado = Math.min(montoRestante, saldoCompra);
                const response = await MarketWorld.api.purchases.registerPayment(purchase.id, {
                    monto: pagoAplicado,
                    metodo_pago: metodoPagoSeleccionado,
                    referencia_transaccion: referencia,
                    fecha_pago: fechaPago,
                });

                if (!response || !response.success) {
                    throw new Error((response && response.message) ? response.message : 'No fue posible registrar el pago.');
                }

                montoRestante -= pagoAplicado;
            }

            await sincronizarDatosComprasConApi();
            await cargarHistorialPagos();
            await cargarHistorial();
            await actualizarKPIs();
            cargarSelectProveedores();
            cargarProveedores();

            if (typeof MarketWorld !== 'undefined' && MarketWorld.notifications) {
                MarketWorld.notifications.create('success', 'Pago Registrado', `Pago de ${formatMoney(monto)} a ${proveedor.nombre} registrado`, 'compras.html');
            }

            document.getElementById('montoPagar').value = '0';
            document.getElementById('referenciaPago').value = '';
            document.getElementById('selectProveedorPago').value = '';
            cargarComprasPendientesPago(null);

            mostrarAlerta(`Pago de ${formatMoney(monto)} registrado exitosamente`, 'success');
        } catch (error) {
            console.error('Error al registrar pago:', error);
            mostrarAlerta((error && error.message) ? error.message : 'No se pudo registrar el pago', 'danger');
        }
    }

    function cargarHistorialPagos() {
        let payments = getPurchaseCatalogPayments();

        // Filtrar por proveedor
        const filtroProvId = document.getElementById('filtrarProveedorPago')?.value;
        if (filtroProvId) {
            payments = payments.filter(p => p.proveedorId === parseInt(filtroProvId));
        }

        if (purchaseSearchTerm) {
            const term = purchaseSearchTerm.toLowerCase();
            payments = payments.filter(function(payment) {
                return [payment.numeroOrden, payment.proveedorNombre, payment.referenciaTransaccion, payment.metodoPago, payment.tipo].join(' ').toLowerCase().includes(term);
            });
        }

        // Ordenar por fecha desc
        payments.sort((a, b) => new Date(b.fechaPago) - new Date(a.fechaPago));

        const container = document.getElementById('historialPagosContainer');
        if (!container) {
            console.error('Container historialPagosContainer no encontrado');
            return;
        }

        if (payments.length === 0) {
            setSafeHtml(container, '<p class="text-center text-muted py-4">No hay pagos registrados</p>');
        } else {
            setSafeHtml(container, payments.map(p => {
                const fecha = new Date(p.fechaPago).toLocaleDateString('es-CO');
                const esCompleto = p.tipo === 'Completo';

                return `
                    <article class="payment-history-item ${esCompleto ? '' : 'partial'}" role="listitem">
                        <div class="d-flex justify-content-between">
                            <div class="fw-bold">Pago ${p.tipo.toLowerCase()}</div>
                            <div class="${esCompleto ? 'text-success' : 'text-warning'}">${formatMoney(p.monto)}</div>
                        </div>
                        <div class="text-muted small">${p.numeroOrden || 'General'} | ${fecha}</div>
                        <div>${p.metodoPago}${p.referenciaTransaccion ? ' | Ref: ' + p.referenciaTransaccion : ''}</div>
                        <div class="text-muted small">${p.proveedorNombre}</div>
                    </article>`;
            }).join(''));
        }

        // Total pagado
        const totalPagado = payments.reduce((sum, p) => sum + (p.monto || 0), 0);
        setTextSafe('totalPagadoFiltro', formatMoney(totalPagado));
    }

    // --- Estado de cuenta del proveedor ---
    function mostrarEstadoCuenta(proveedorId) {
        const alert = document.getElementById('alertEstadoCuenta');
        const texto = document.getElementById('estadoCuentaTexto');
        if (!alert || !texto) return;

        if (!proveedorId) {
            alert.style.display = 'none';
            return;
        }

        const saldo = calcularSaldoProveedor(parseInt(proveedorId));
        const comprasPend = getPurchaseCatalogPurchases().filter(function(item) {
            return parseInt(item.proveedorId || item.supplier_id || 0, 10) === parseInt(proveedorId, 10);
        })
            .filter(p => p.saldo > 0 && p.estado !== 'Cancelado');

        let proxVenc = '-';
        if (comprasPend.length > 0) {
            const fechas = comprasPend.filter(p => p.fechaVencimiento).map(p => new Date(p.fechaVencimiento));
            if (fechas.length > 0) {
                fechas.sort((a, b) => a - b);
                proxVenc = fechas[0].toLocaleDateString('es-CO');
            }
        }

        texto.textContent = `Saldo pendiente: ${formatMoney(saldo)} | Próximo vencimiento: ${proxVenc}`;
        alert.style.display = 'block';
    }

    function refreshActivePurchaseView() {
        const activeTab = document.querySelector('.tab-pane.active.show');
        if (!activeTab) return;

        switch (activeTab.id) {
            case 'purchase-history':
                cargarHistorial({ resetPage: true, search: purchaseSearchTerm });
                break;
            case 'suppliers':
                cargarProveedores(purchaseSearchTerm);
                break;
            case 'payments':
                cargarHistorialPagos();
                cargarSelectProveedores();
                break;
            default:
                break;
        }
    }

    function exportarHistorialCompras() {
        const estadoFiltro = document.getElementById('estadoFiltro');
        const proveedorFiltro = document.getElementById('proveedorFiltro');
        const fechaInicioFiltro = document.getElementById('fechaInicio');
        const fechaFinFiltro = document.getElementById('fechaFin');

        let purchases = getPurchaseCatalogPurchases().slice();
        const estadoSeleccionado = estadoFiltro ? estadoFiltro.value : 'Todos';

        if (estadoSeleccionado === 'Pagado') {
            purchases = purchases.filter(function(purchase) {
                return getPurchaseDisplayState(purchase) === 'Pagada';
            });
        } else if (estadoSeleccionado && estadoSeleccionado !== 'Todos') {
            purchases = purchases.filter(function(purchase) {
                return getPurchaseDisplayState(purchase) === estadoSeleccionado || purchase.estado === estadoSeleccionado;
            });
        }

        if (proveedorFiltro && proveedorFiltro.value) {
            purchases = purchases.filter(function(purchase) {
                return parseInt(purchase.proveedorId || purchase.supplier_id || 0, 10) === parseInt(proveedorFiltro.value, 10);
            });
        }

        if (purchaseSearchTerm) {
            const term = purchaseSearchTerm.toLowerCase();
            purchases = purchases.filter(function(purchase) {
                return [purchase.numeroOrden, purchase.proveedorNombre, purchase.proveedorNit, purchase.observaciones, purchase.estado].join(' ').toLowerCase().includes(term);
            });
        }

        if (fechaInicioFiltro && fechaInicioFiltro.value) {
            const inicio = new Date(fechaInicioFiltro.value + 'T00:00:00');
            purchases = purchases.filter(function(purchase) {
                const fecha = new Date(purchase.fechaCreacion || purchase.fecha || 0);
                return !isNaN(fecha.getTime()) && fecha >= inicio;
            });
        }

        if (fechaFinFiltro && fechaFinFiltro.value) {
            const fin = new Date(fechaFinFiltro.value + 'T23:59:59');
            purchases = purchases.filter(function(purchase) {
                const fecha = new Date(purchase.fechaCreacion || purchase.fecha || 0);
                return !isNaN(fecha.getTime()) && fecha <= fin;
            });
        }

        if (purchases.length === 0) {
            mostrarAlerta('No hay compras para exportar con los filtros actuales', 'warning');
            return;
        }

        const header = ['NumeroOrden', 'Fecha', 'Proveedor', 'Estado', 'Subtotal', 'IVA', 'Total', 'Saldo'];
        const rows = purchases.map(function(purchase) {
            return [
                purchase.numeroOrden,
                purchase.fechaCreacion,
                purchase.proveedorNombre,
                getPurchaseDisplayState(purchase),
                parseNumber(purchase.subtotal).toFixed(2),
                parseNumber(purchase.iva).toFixed(2),
                parseNumber(purchase.total).toFixed(2),
                parseNumber(purchase.saldo).toFixed(2),
            ].map(function(value) {
                return '"' + String(value).replace(/"/g, '""') + '"';
            }).join(',');
        });

        const csv = [header.join(','), ...rows].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'historial-compras.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        mostrarAlerta('Historial de compras exportado correctamente', 'success');
    }

    // --- Event listeners ---
    function initEventListeners() {
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('input', (e) => {
                purchaseSearchTerm = e.target.value.trim();
            });
            globalSearch.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    purchaseSearchTerm = e.target.value.trim();
                    refreshActivePurchaseView();
                }
            });
        }

        // Buscar producto (autocomplete)
        const buscarInput = document.getElementById('buscarProducto');
        if (buscarInput) {
            buscarInput.addEventListener('input', (e) => buscarProductos(e.target.value));
            buscarInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    agregarAlCarrito();
                }
            });
        }

        // Botón buscar producto (solo busca)
        const btnBuscar = document.getElementById('btnBuscarProducto');
        if (btnBuscar) btnBuscar.addEventListener('click', () => buscarProductos(document.getElementById('buscarProducto')?.value));

        // Botón agregar al carrito
        const btnAgregar = document.getElementById('btnAgregarCarrito');
        if (btnAgregar) btnAgregar.addEventListener('click', agregarAlCarrito);

        // Cerrar autocomplete al hacer click fuera
        document.addEventListener('click', (e) => {
            const ac = document.getElementById('autocompleteProductos');
            if (ac && !e.target.closest('#buscarProducto') && !e.target.closest('#autocompleteProductos')) {
                ac.style.display = 'none';
            }
        });

        // Registrar compra
        const btnRegistrar = document.getElementById('btnRegistrarCompra');
        if (btnRegistrar) btnRegistrar.addEventListener('click', registrarCompra);

        // Limpiar compra
        const btnLimpiar = document.getElementById('btnLimpiarCompra');
        if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarFormularioCompra);

        // Descuento y envío (recalcular)
        const descInput = document.getElementById('descuentoPorcentaje');
        if (descInput) descInput.addEventListener('input', calcularTotales);

        const envioInput = document.getElementById('envioInput');
        if (envioInput) envioInput.addEventListener('input', calcularTotales);

        // Seleccionar proveedor (nueva compra)
        const selProv = document.getElementById('selectProveedor');
        if (selProv) {
            selProv.addEventListener('change', (e) => {
                mostrarEstadoCuenta(e.target.value);
                // Aplicar descuento del proveedor
                const provId = parseInt(e.target.value);
                if (provId) {
                    const prov = getPurchaseCatalogSuppliers().find(function(item) {
                        return parseInt(item.id, 10) === provId;
                    });
                    if (prov && prov.descuento > 0) {
                        const descInput = document.getElementById('descuentoPorcentaje');
                        if (descInput) descInput.value = prov.descuento;
                        calcularTotales();
                    }
                    // Actualizar términos de pago
                    const terminos = document.getElementById('terminosPago');
                    if (terminos && prov) terminos.value = prov.terminosPago;
                }
            });
        }

        // Términos de pago -> actualizar fecha vencimiento
        const terminos = document.getElementById('terminosPago');
        if (terminos) {
            terminos.addEventListener('change', () => {
                const fechaCompra = document.getElementById('fechaCompra')?.value;
                if (!fechaCompra) return;
                const base = new Date(fechaCompra);
                let dias = 0;
                switch (terminos.value) {
                    case 'Contado': dias = 0; break;
                    case '30 días': dias = 30; break;
                    case '60 días': dias = 60; break;
                    case '90 días': dias = 90; break;
                }
                base.setDate(base.getDate() + dias);
                const fechaVenc = document.getElementById('fechaVencimiento');
                if (fechaVenc) fechaVenc.value = base.toISOString().split('T')[0];
            });
        }

        // Filtros historial
        ['estadoFiltro', 'proveedorFiltro', 'fechaInicio', 'fechaFin'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', function() {
                    cargarHistorial({ resetPage: true });
                });
            }
        });

        const purchaseHistoryPagination = ensurePurchaseHistoryPagination();
        if (purchaseHistoryPagination) {
            purchaseHistoryPagination.addEventListener('click', function(event) {
                const link = event.target.closest('[data-purchase-page]');
                if (!link) return;

                event.preventDefault();
                const target = link.getAttribute('data-purchase-page');
                let nextPage = purchaseHistoryState.page;

                if (target === 'prev') {
                    nextPage = Math.max(1, purchaseHistoryState.page - 1);
                } else if (target === 'next') {
                    nextPage = Math.min(purchaseHistoryState.lastPage, purchaseHistoryState.page + 1);
                } else {
                    const parsedPage = parseInt(target, 10);
                    if (!isNaN(parsedPage)) {
                        nextPage = parsedPage;
                    }
                }

                if (nextPage !== purchaseHistoryState.page) {
                    purchaseHistoryState.page = nextPage;
                    cargarHistorial();
                }
            });
        }

        // Nuevo proveedor
        const btnNuevo = document.getElementById('btnNuevoProveedor');
        if (btnNuevo) btnNuevo.addEventListener('click', () => editarProveedor(null));

        // Nuevo proveedor (botón rápido en Nueva Compra)
        const btnNuevoRapido = document.getElementById('btnNuevoProveedorRapido');
        if (btnNuevoRapido) btnNuevoRapido.addEventListener('click', () => editarProveedor(null));

        // Guardar proveedor
        const btnGuardar = document.getElementById('btnGuardarProveedor');
        if (btnGuardar) btnGuardar.addEventListener('click', guardarProveedor);

        // Buscar proveedor
        const btnBuscarProv = document.getElementById('btnBuscarProveedor');
        if (btnBuscarProv) {
            btnBuscarProv.addEventListener('click', () => {
                const filtro = document.getElementById('buscarProveedorListado')?.value;
                cargarProveedores(filtro);
            });
        }
        const buscarProvInput = document.getElementById('buscarProveedorListado');
        if (buscarProvInput) {
            buscarProvInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') cargarProveedores(e.target.value);
            });
        }

        // Proveedor para pago
        const selProvPago = document.getElementById('selectProveedorPago');
        if (selProvPago) {
            selProvPago.addEventListener('change', (e) => cargarComprasPendientesPago(e.target.value));
        }

        // Métodos de pago
        const metodosBtns = document.querySelectorAll('#metodosPago .payment-method');
        metodosBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                metodosBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                metodoPagoSeleccionado = btn.dataset.metodo;
            });
        });

        // Registrar pago
        const btnPago = document.getElementById('btnRegistrarPago');
        if (btnPago) btnPago.addEventListener('click', registrarPago);

        // Filtrar historial pagos
        const filtrarPago = document.getElementById('filtrarProveedorPago');
        if (filtrarPago) filtrarPago.addEventListener('change', cargarHistorialPagos);

        const btnExportarHistorial = document.getElementById('btnExportarHistorial');
        if (btnExportarHistorial) {
            btnExportarHistorial.addEventListener('click', exportarHistorialCompras);
        }

        // Imprimir compra
        const btnImprimir = document.getElementById('btnImprimirCompra');
        if (btnImprimir) {
            btnImprimir.addEventListener('click', () => {
                const body = document.getElementById('detalleCompraBody');
                if (!body) return;
                const win = window.open('', '_blank');
                if (!win) return;
                const doc = win.document;

                doc.title = 'Orden de Compra';
                const head = doc.head || doc.getElementsByTagName('head')[0] || doc.createElement('head');
                if (!doc.head) doc.documentElement.insertBefore(head, doc.body || null);

                const link = doc.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css';
                head.appendChild(link);

                const style = doc.createElement('style');
                style.textContent = 'body{padding:20px;}';
                head.appendChild(style);

                const bodyEl = doc.body || doc.createElement('body');
                if (!doc.body) doc.documentElement.appendChild(bodyEl);
                setSafeHtml(bodyEl, body.innerHTML || '');

                const script = doc.createElement('script');
                script.textContent = 'setTimeout(()=>window.print(),500);';
                bodyEl.appendChild(script);
            });
        }



        // Tabs: recargar datos al cambiar
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const target = e.target.getAttribute('href');
                if (target === '#purchase-history' || target === '#suppliers' || target === '#payments') {
                    refreshActivePurchaseView();
                }
            });
        });
    }

    // --- Utilidades ---
    function parseNumber(value) {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number') return value;
        try {
            var str = String(value).trim();
            // Quitar símbolos de moneda y espacios
            str = str.replace(/[^0-9.,\-]/g, '');

            // Si contiene ambos separadores, asumimos: puntos = miles, coma = decimal
            if (str.indexOf('.') !== -1 && str.indexOf(',') !== -1) {
                str = str.replace(/\./g, ''); // eliminar miles
                str = str.replace(/,/g, '.'); // coma -> decimal
            } else if (str.indexOf(',') !== -1) {
                // Solo coma presente -> coma es decimal
                str = str.replace(/,/g, '.');
            } else {
                // Solo punto o ninguno -> punto es decimal (no eliminar)
                // dejar tal cual
            }

            var num = parseFloat(str);
            return isNaN(num) ? 0 : num;
        } catch (e) {
            return 0;
        }
    }

    function formatMoney(amount) {
        return '$' + (amount || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function setTextSafe(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    // Mostrar modal grande tras registro exitoso con opciones Aceptar/Cancelar
    function showSuccessModal(numeroOrden, purchaseData) {
        try {
            const modalEl = document.getElementById('modalSuccessPurchase');
            const messageEl = document.getElementById('successPurchaseMessage');
            const detailsEl = document.getElementById('successPurchaseDetails');
            const btnConfirm = document.getElementById('btnConfirmSuccess');
            const btnCancel = document.getElementById('btnCancelSuccess');

            if (!modalEl) {
                // Fallback: usar alerta si el modal no existe
                mostrarAlerta(`Orden ${numeroOrden} registrada exitosamente.`, 'success');
                limpiarFormularioCompra();
                cargarHistorial();
                actualizarKPIs();
                return;
            }

            // Mensaje y detalles
            if (messageEl) messageEl.textContent = `La orden ${numeroOrden} ha sido registrada correctamente.`;
            if (detailsEl) {
                const html = `
                    <div><strong>Resumen:</strong></div>
                    <div>N° Orden: <strong>${numeroOrden}</strong></div>
                    <div>Total: <strong>${formatMoney(purchaseData && purchaseData.total ? purchaseData.total : 0)}</strong></div>
                    <div class="mt-2"><em>Puede aceptar para limpiar el formulario y actualizar la información, o cancelar para permanecer en la vista.</em></div>
                `;
                setSafeHtml(detailsEl, html);
            }

            const bsModal = new bootstrap.Modal(modalEl, { keyboard: true });

            // Aceptar → cerrar + acciones finales
            const onConfirm = function () {
                bsModal.hide();
                mostrarAlerta(`Orden ${numeroOrden} registrada exitosamente. El stock ha sido aumentado.`, 'success');
                limpiarFormularioCompra();
                cargarHistorial();
                actualizarKPIs();
                removeHandlers();
            };

            // Cancelar → solo cerrar
            const onCancel = function () {
                bsModal.hide();
                removeHandlers();
            };

            function removeHandlers() {
                if (btnConfirm) btnConfirm.removeEventListener('click', onConfirm);
                if (btnCancel) btnCancel.removeEventListener('click', onCancel);
            }

            if (btnConfirm) btnConfirm.addEventListener('click', onConfirm);
            if (btnCancel) btnCancel.addEventListener('click', onCancel);

            bsModal.show();
        } catch (e) {
            console.error('showSuccessModal error:', e);
            mostrarAlerta(`Orden ${numeroOrden} registrada exitosamente.`, 'success');
            limpiarFormularioCompra();
            cargarHistorial();
            actualizarKPIs();
        }
    }

    function mostrarAlerta(mensaje, tipo) {
        const main = document.getElementById('mainContent');
        if (!main) return;

        // Eliminar alertas anteriores
        main.querySelectorAll('.alert-auto').forEach(a => a.remove());

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo} alert-dismissible fade show alert-auto`;
        alertDiv.setAttribute('role', 'alert');
        const messageSpan = document.createElement('span');
        messageSpan.textContent = String(mensaje || '');

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close';
        closeButton.setAttribute('data-bs-dismiss', 'alert');
        closeButton.setAttribute('aria-label', 'Cerrar');

        alertDiv.appendChild(messageSpan);
        alertDiv.appendChild(closeButton);
        main.insertBefore(alertDiv, main.firstChild);

        setTimeout(() => {
            if (alertDiv.parentNode) alertDiv.remove();
        }, 5000);
    }
})();