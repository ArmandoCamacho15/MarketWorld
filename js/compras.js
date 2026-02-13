// compras.js - Módulo de compras y proveedores

(function() {
    'use strict';

    // --- Estado ---
    let carrito = [];
    let productoSeleccionado = null;
    let metodoPagoSeleccionado = 'Transferencia';

    // --- Inicialización ---
    document.addEventListener('DOMContentLoaded', function() {
        if (typeof MarketWorld !== 'undefined' && MarketWorld.notifications) {
            MarketWorld.notifications.init();
        }

        cargarUsuarioActual();
        initFechas();
        initNumeroOrden();
        cargarSelectProveedores();
        actualizarKPIs();
        cargarHistorial();
        cargarProveedores();
        cargarHistorialPagos(); // Cargar historial de pagos inicial
        initEventListeners();
        
        // Debug: verificar que data.js está cargado
        console.log('Compras.js inicializado. Pagos en localStorage:', MarketWorld.data.getPayments().length);
    });

    // --- Usuario ---
    function cargarUsuarioActual() {
        const user = MarketWorld.data.getCurrentUser();
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

    function initNumeroOrden() {
        const el = document.getElementById('numeroOrden');
        if (el) el.value = MarketWorld.data.generatePurchaseNumber();
    }

    // --- Select de proveedores ---
    function cargarSelectProveedores() {
        const suppliers = MarketWorld.data.getSuppliers().filter(s => s.activo);
        const selects = ['selectProveedor', 'selectProveedorPago', 'filtrarProveedorPago', 'proveedorFiltro'];

        selects.forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;

            const firstOpt = sel.querySelector('option');
            sel.innerHTML = '';
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
    function actualizarKPIs() {
        const purchases = MarketWorld.data.getPurchases();
        const payments = MarketWorld.data.getPayments();
        const suppliers = MarketWorld.data.getSuppliers().filter(s => s.activo);

        // Total a pagar (saldos pendientes de TODAS las compras)
        const totalPagar = purchases.filter(p => p.estado !== 'Cancelado').reduce((sum, p) => sum + (p.saldo || 0), 0);
        setTextSafe('kpiTotalPagar', formatMoney(totalPagar));

        // Compras este mes
        const now = new Date();
        const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
        const comprasMes = purchases.filter(p => new Date(p.fechaCreacion) >= inicioMes && p.estado !== 'Cancelado');
        const totalMes = comprasMes.reduce((sum, p) => sum + (p.total || 0), 0);
        setTextSafe('kpiComprasMes', formatMoney(totalMes));

        // Compras pendientes (cantidad de órdenes pendientes de recibir - estado Pendiente)
        const pendientes = purchases.filter(p => p.estado === 'Pendiente').length;
        setTextSafe('kpiComprasPendientes', pendientes);

        // Proveedores activos
        setTextSafe('kpiProveedoresActivos', suppliers.length);
    }

    // --- Buscar productos (autocomplete) ---
    function buscarProductos(query) {
        if (!query || query.length < 2) {
            document.getElementById('autocompleteProductos').style.display = 'none';
            return;
        }

        const products = MarketWorld.data.getProducts().filter(p => p.activo);
        const q = query.toLowerCase();
        const resultados = products.filter(p =>
            p.nombre.toLowerCase().includes(q) ||
            p.codigo.toLowerCase().includes(q)
        ).slice(0, 8);

        const container = document.getElementById('autocompleteProductos');
        if (resultados.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = resultados.map(p => `
            <div class="autocomplete-item" data-id="${p.id}" onclick="seleccionarProducto(${p.id})">
                <div class="fw-bold">${p.nombre}</div>
                <div class="small text-muted">SKU: ${p.codigo} | Precio: ${formatMoney(p.precio)} | Stock: ${p.stock}</div>
            </div>
        `).join('');
        container.style.display = 'block';
    }

    window.seleccionarProducto = function (id) {
        const product = MarketWorld.data.findProductById(id);
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
            tbody.innerHTML = `
                <tr id="emptyCartRow">
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="bi bi-cart-x fs-3"></i>
                        <p class="mb-0 mt-2">No hay productos agregados</p>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = carrito.map((item, idx) => `
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
                        min="0" step="0.01" style="width:100px;" onchange="actualizarPrecioCarrito(${idx}, this.value)">
                </td>
                <td>
                    <div class="d-flex align-items-center gap-1">
                        <button class="btn btn-sm btn-outline-secondary" onclick="cambiarCantidadCarrito(${idx}, -1)">-</button>
                        <input type="number" class="form-control form-control-sm text-center" value="${item.cantidad}" 
                            min="1" style="width:60px;" onchange="actualizarCantidadCarrito(${idx}, this.value)">
                        <button class="btn btn-sm btn-outline-secondary" onclick="cambiarCantidadCarrito(${idx}, 1)">+</button>
                    </div>
                </td>
                <td class="fw-bold">${formatMoney(item.subtotal)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarDelCarrito(${idx})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
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
    function registrarCompra() {
        // Validaciones
        const proveedorId = parseInt(document.getElementById('selectProveedor')?.value);
        if (!proveedorId) {
            mostrarAlerta('Seleccione un proveedor', 'warning');
            return;
        }

        if (carrito.length === 0) {
            mostrarAlerta('Agregue al menos un producto', 'warning');
            return;
        }

        const proveedor = MarketWorld.data.findSupplierById(proveedorId);
        if (!proveedor) {
            mostrarAlerta('Proveedor no encontrado', 'danger');
            return;
        }

        const subtotal = carrito.reduce((sum, item) => sum + item.subtotal, 0);
        const iva = subtotal * 0.19;
        const descPct = parseFloat(document.getElementById('descuentoPorcentaje')?.value) || 0;
        const descuento = (subtotal + iva) * (descPct / 100);
        const envio = parseFloat(document.getElementById('envioInput')?.value) || 0;
        const total = subtotal + iva - descuento + envio;

        const user = MarketWorld.data.getCurrentUser();

        const purchaseData = {
            numeroOrden: document.getElementById('numeroOrden')?.value || MarketWorld.data.generatePurchaseNumber(),
            proveedorId: proveedor.id,
            proveedorNombre: proveedor.nombre,
            proveedorNit: proveedor.nit,
            items: [...carrito],
            subtotal: subtotal,
            iva: iva,
            descuento: descuento,
            envio: envio,
            total: total,
            saldo: total,
            terminosPago: document.getElementById('terminosPago')?.value || 'Contado',
            estado: 'Pendiente',
            observaciones: document.getElementById('observacionesCompra')?.value || '',
            afectarInventario: document.getElementById('affectInventory')?.checked ?? true,
            usuario: user ? (user.nombre || user.username) : 'Sistema',
            fechaCreacion: document.getElementById('fechaCompra')?.value ? new Date(document.getElementById('fechaCompra').value).toISOString() : new Date().toISOString(),
            fechaVencimiento: document.getElementById('fechaVencimiento')?.value || ''
        };

        const purchase = MarketWorld.data.createPurchase(purchaseData);

        // Afectar inventario si está marcado
        if (purchaseData.afectarInventario) {
            carrito.forEach(item => {
                if (item.productoId) {
                    MarketWorld.data.updateStock(item.productoId, item.cantidad, 'add');
                }
            });
        }

        // Notificación
        if (typeof MarketWorld !== 'undefined' && MarketWorld.notifications) {
            MarketWorld.notifications.create(
                'success',
                'Compra Registrada',
                `Orden ${purchase.numeroOrden} por ${formatMoney(total)} registrada exitosamente`,
                'compras.html'
            );

            // Verificar stock bajo después de actualizar
            if (purchaseData.afectarInventario) {
                const lowStock = MarketWorld.data.getLowStockProducts();
                if (lowStock.length > 0) {
                    MarketWorld.notifications.create(
                        'warning',
                        'Stock Bajo',
                        `${lowStock.length} producto(s) con stock bajo después de la compra`,
                        'inventario.html'
                    );
                }
            }
        }

        // Limpiar
        limpiarFormularioCompra();
        actualizarKPIs();
        cargarHistorial();
        cargarSelectProveedores();

        mostrarAlerta(`Orden ${purchase.numeroOrden} registrada exitosamente por ${formatMoney(total)}`, 'success');
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
    function cargarHistorial() {
        let purchases = MarketWorld.data.getPurchases();
        console.log('Cargando historial. Total compras:', purchases.length);

        // Aplicar filtros
        const estado = document.getElementById('estadoFiltro')?.value;
        if (estado && estado !== 'Todos') {
            purchases = purchases.filter(p => p.estado === estado);
            console.log(`Filtrado por estado "${estado}":`, purchases.length);
        }

        const provId = document.getElementById('proveedorFiltro')?.value;
        if (provId) {
            purchases = purchases.filter(p => p.proveedorId === parseInt(provId));
            console.log('Filtrado por proveedor:', purchases.length);
        }

        const fechaInicio = document.getElementById('fechaInicio')?.value;
        const fechaFin = document.getElementById('fechaFin')?.value;
        if (fechaInicio && fechaFin) {
            purchases = purchases.filter(p => {
                const f = new Date(p.fechaCreacion);
                return f >= new Date(fechaInicio) && f <= new Date(fechaFin + 'T23:59:59');
            });
            console.log('Filtrado por fechas:', purchases.length);
        }

        // Ordenar por fecha desc
        purchases.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

        const tbody = document.getElementById('historialTbody');
        if (!tbody) {
            console.error('Elemento historialTbody no encontrado');
            return;
        }

        if (purchases.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No hay compras que coincidan con los filtros</td></tr>';
            return;
        }

        tbody.innerHTML = purchases.map(p => {
            const fecha = new Date(p.fechaCreacion).toLocaleDateString('es-CO');
            const venc = p.fechaVencimiento ? new Date(p.fechaVencimiento).toLocaleDateString('es-CO') : '-';
            const badgeClass = getBadgeClass(p.estado);
            const saldo = p.saldo || 0;
            const pagado = p.total - saldo;
            const porcentajePagado = p.total > 0 ? Math.round((pagado / p.total) * 100) : 0;
            
            // Indicador visual de pago
            let estadoPago = '';
            if (saldo <= 0) {
                estadoPago = '<span class="badge bg-success ms-1">100% Pagado</span>';
            } else if (pagado > 0) {
                estadoPago = `<span class="badge bg-warning text-dark ms-1">${porcentajePagado}% Pagado</span>`;
            }

            return `
                <tr>
                    <td><strong>${p.numeroOrden}</strong></td>
                    <td>${fecha}</td>
                    <td>${p.proveedorNombre}</td>
                    <td>${formatMoney(p.total)}</td>
                    <td>
                        <span class="badge ${badgeClass}">${p.estado}</span>
                        ${estadoPago}
                    </td>
                    <td>${venc}</td>
                    <td>
                        <div class="fw-bold ${saldo <= 0 ? 'text-success' : 'text-danger'}">
                            ${formatMoney(saldo)}
                        </div>
                        ${pagado > 0 ? `<small class="text-muted">Pagado: ${formatMoney(pagado)}</small>` : ''}
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" title="Ver detalle" onclick="verDetalleCompra(${p.id})">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${(p.estado === 'Pendiente' || p.estado === 'Pagado') ? `
                            <button class="btn btn-sm btn-outline-success me-1" title="Marcar recibido" onclick="marcarRecibido(${p.id})">
                                <i class="bi bi-check-circle"></i>
                            </button>
                        ` : ''}
                        ${p.estado === 'Pendiente' ? `
                            <button class="btn btn-sm btn-outline-danger" title="Cancelar" onclick="cancelarCompra(${p.id})">
                                <i class="bi bi-x-circle"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>`;
        }).join('');
    }

    function getBadgeClass(estado) {
        switch (estado) {
            case 'Pendiente': return 'bg-warning text-dark';
            case 'Recibido': return 'bg-info text-white';
            case 'Pagado': return 'bg-success';
            case 'Cancelado': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    window.verDetalleCompra = function (id) {
        const purchase = MarketWorld.data.findPurchaseById(id);
        if (!purchase) return;

        const fecha = new Date(purchase.fechaCreacion).toLocaleDateString('es-CO');
        const venc = purchase.fechaVencimiento ? new Date(purchase.fechaVencimiento).toLocaleDateString('es-CO') : '-';
        
        // Obtener pagos de esta compra
        const pagosCompra = MarketWorld.data.getPaymentsByPurchase(id);
        const totalPagado = pagosCompra.reduce((sum, p) => sum + (p.monto || 0), 0);

        const body = document.getElementById('detalleCompraBody');
        body.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <h6>Información de la Orden</h6>
                    <p><strong>N° Orden:</strong> ${purchase.numeroOrden}</p>
                    <p><strong>Fecha:</strong> ${fecha}</p>
                    <p><strong>Vencimiento:</strong> ${venc}</p>
                    <p><strong>Estado:</strong> <span class="badge ${getBadgeClass(purchase.estado)}">${purchase.estado}</span></p>
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
                    <div class="d-flex justify-content-between mt-1"><span>Saldo pendiente:</span><span class="fw-bold ${purchase.saldo <= 0 ? 'text-success' : 'text-danger'}">${formatMoney(purchase.saldo || 0)}</span></div>
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
        `;

        const modal = new bootstrap.Modal(document.getElementById('modalDetalleCompra'));
        modal.show();
    };

    window.marcarRecibido = function (id) {
        if (!confirm('¿Marcar esta orden como recibida?')) return;
        
        const purchase = MarketWorld.data.findPurchaseById(id);
        if (!purchase) {
            mostrarAlerta('Orden no encontrada', 'danger');
            return;
        }
        
        console.log('Marcando orden como recibida:', purchase.numeroOrden, 'Estado anterior:', purchase.estado);
        
        // Actualizar estado
        const updated = MarketWorld.data.updatePurchase(id, { estado: 'Recibido' });
        console.log('Estado actualizado a:', updated.estado);

        if (typeof MarketWorld !== 'undefined' && MarketWorld.notifications) {
            MarketWorld.notifications.create('info', 'Orden Recibida', `La orden ${purchase.numeroOrden} fue marcada como recibida`, 'compras.html');
        }

        // Limpiar filtro de estado para ver el cambio
        const filtroEstado = document.getElementById('estadoFiltro');
        if (filtroEstado && (filtroEstado.value === 'Pendiente' || filtroEstado.value === 'Pagado')) {
            filtroEstado.value = 'Todos';
            console.log('Filtro de estado cambiado a "Todos" para mostrar orden recibida');
        }

        // Actualizar inmediatamente los KPIs y el historial
        actualizarKPIs();
        cargarHistorial();
        console.log('Dashboard actualizado - KPIs y historial recargados');
        
        mostrarAlerta('Orden marcada como recibida', 'success');
    };

    window.cancelarCompra = function (id) {
        if (!confirm('¿Está seguro de cancelar esta orden de compra?')) return;

        const purchase = MarketWorld.data.findPurchaseById(id);
        if (!purchase) {
            mostrarAlerta('Orden no encontrada', 'danger');
            return;
        }

        console.log('Cancelando orden:', purchase.numeroOrden, 'Estado anterior:', purchase.estado);

        // Restaurar stock si se había afectado
        if (purchase.afectarInventario && purchase.items) {
            purchase.items.forEach(item => {
                if (item.productoId) {
                    MarketWorld.data.updateStock(item.productoId, item.cantidad, 'subtract');
                    console.log('Stock restaurado para producto ID:', item.productoId, 'Cantidad:', item.cantidad);
                }
            });
        }

        // Actualizar estado y saldo
        const updated = MarketWorld.data.updatePurchase(id, { estado: 'Cancelado', saldo: 0 });
        console.log('Estado actualizado a:', updated.estado, 'Saldo:', updated.saldo);

        if (typeof MarketWorld !== 'undefined' && MarketWorld.notifications) {
            MarketWorld.notifications.create('danger', 'Orden Cancelada', `La orden ${purchase.numeroOrden} fue cancelada`, 'compras.html');
        }

        // Limpiar filtro de estado para ver el cambio
        const filtroEstado = document.getElementById('estadoFiltro');
        if (filtroEstado && filtroEstado.value !== 'Todos' && filtroEstado.value !== 'Cancelado') {
            filtroEstado.value = 'Todos';
            console.log('Filtro de estado cambiado a "Todos" para mostrar orden cancelada');
        }

        // Actualizar inmediatamente los KPIs y el historial
        actualizarKPIs();
        cargarHistorial();
        console.log('Dashboard actualizado - KPIs y historial recargados');
        
        mostrarAlerta('Orden cancelada. Stock restaurado.', 'warning');
    };

    // --- Proveedores ---
    function cargarProveedores(filtro) {
        let suppliers = MarketWorld.data.getSuppliers();

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
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No se encontraron proveedores</td></tr>';
            return;
        }

        tbody.innerHTML = suppliers.map(s => {
            const compras = MarketWorld.data.getPurchasesBySupplier(s.id).length;
            const saldo = calcularSaldoProveedor(s.id);

            return `
                <tr style="cursor:pointer;" onclick="verDetalleProveedor(${s.id})">
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
                        <button class="btn btn-sm btn-outline-primary me-1" title="Ver detalle" onclick="event.stopPropagation(); verDetalleProveedor(${s.id})">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info me-1" title="Editar" onclick="event.stopPropagation(); editarProveedor(${s.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" title="Eliminar" onclick="event.stopPropagation(); eliminarProveedor(${s.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>`;
        }).join('');
    }

    function calcularSaldoProveedor(supplierId) {
        const purchases = MarketWorld.data.getPurchasesBySupplier(supplierId);
        return purchases.reduce((sum, p) => sum + (p.saldo || 0), 0);
    }

    function calcularTotalComprasProveedor(supplierId) {
        const purchases = MarketWorld.data.getPurchasesBySupplier(supplierId);
        return purchases.reduce((sum, p) => sum + (p.total || 0), 0);
    }

    function calcularTotalPagadoProveedor(supplierId) {
        const payments = MarketWorld.data.getPaymentsBySupplier(supplierId);
        return payments.reduce((sum, p) => sum + (p.monto || 0), 0);
    }

    window.verDetalleProveedor = function (id) {
        const supplier = MarketWorld.data.findSupplierById(id);
        if (!supplier) return;

        const totalCompras = calcularTotalComprasProveedor(id);
        const totalPagado = calcularTotalPagadoProveedor(id);
        const saldo = calcularSaldoProveedor(id);
        const numCompras = MarketWorld.data.getPurchasesBySupplier(id).length;

        const body = document.getElementById('detalleProveedorBody');
        body.innerHTML = `
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
                <button class="btn btn-outline-info btn-sm" onclick="editarProveedor(${id})">
                    <i class="bi bi-pencil me-1"></i> Editar
                </button>
            </div>
        `;
    };

    window.editarProveedor = function (id) {
        const supplier = id ? MarketWorld.data.findSupplierById(id) : null;
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
            MarketWorld.data.updateSupplier(parseInt(editId), data);
            mostrarAlerta('Proveedor actualizado exitosamente', 'success');
        } else {
            // Verificar NIT único
            if (MarketWorld.data.findSupplierByNit(nit)) {
                mostrarAlerta('Ya existe un proveedor con ese NIT', 'danger');
                return;
            }
            MarketWorld.data.createSupplier(data);

            if (typeof MarketWorld !== 'undefined' && MarketWorld.notifications) {
                MarketWorld.notifications.create('success', 'Nuevo Proveedor', `Proveedor "${nombre}" registrado exitosamente`, 'compras.html');
            }

            mostrarAlerta('Proveedor creado exitosamente', 'success');
        }

        bootstrap.Modal.getInstance(document.getElementById('modalProveedor')).hide();
        cargarProveedores();
        cargarSelectProveedores();
    }

    window.eliminarProveedor = function (id) {
        const supplier = MarketWorld.data.findSupplierById(id);
        if (!supplier) return;

        const compras = MarketWorld.data.getPurchasesBySupplier(id);
        if (compras.length > 0) {
            mostrarAlerta('No se puede eliminar un proveedor con compras asociadas. Puede desactivarlo.', 'warning');
            return;
        }

        if (!confirm(`¿Eliminar el proveedor "${supplier.nombre}"?`)) return;

        MarketWorld.data.deleteSupplier(id);
        cargarProveedores();
        cargarSelectProveedores();
        mostrarAlerta('Proveedor eliminado', 'success');
    };

    // --- Pagos ---
    function cargarComprasPendientesPago(proveedorId) {
        const container = document.getElementById('listaComprasPendientes');
        if (!container) return;

        if (!proveedorId) {
            container.innerHTML = '<p class="text-muted small mb-0">Seleccione un proveedor</p>';
            return;
        }

        const compras = MarketWorld.data.getPurchasesBySupplier(parseInt(proveedorId))
            .filter(p => p.saldo > 0 && p.estado !== 'Cancelado');

        if (compras.length === 0) {
            container.innerHTML = '<p class="text-muted small mb-0">No hay compras pendientes de pago</p>';
            return;
        }

        container.innerHTML = compras.map(p => {
            const venc = p.fechaVencimiento ? new Date(p.fechaVencimiento).toLocaleDateString('es-CO') : '-';
            return `
                <div class="form-check mb-1">
                    <input class="form-check-input compra-pago-check" type="checkbox" value="${p.id}" id="compraPago${p.id}" data-saldo="${p.saldo}">
                    <label class="form-check-label small" for="compraPago${p.id}">
                        ${p.numeroOrden} - ${formatMoney(p.saldo)} (Vence: ${venc})
                    </label>
                </div>`;
        }).join('');

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

    function registrarPago() {
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

        const proveedor = MarketWorld.data.findSupplierById(proveedorId);
        if (!proveedor) {
            mostrarAlerta('Proveedor no encontrado', 'danger');
            return;
        }

        const referencia = document.getElementById('referenciaPago')?.value || '';
        const fechaPago = document.getElementById('fechaPago')?.value || new Date().toISOString();
        const user = MarketWorld.data.getCurrentUser();

        // Obtener compras seleccionadas
        const checksSeleccionados = document.querySelectorAll('.compra-pago-check:checked');
        let montoRestante = monto;

        checksSeleccionados.forEach(cb => {
            if (montoRestante <= 0) return;
            const compraId = parseInt(cb.value);
            const purchase = MarketWorld.data.findPurchaseById(compraId);
            if (!purchase) return;

            const pagoAplicado = Math.min(montoRestante, purchase.saldo);
            const nuevoSaldo = purchase.saldo - pagoAplicado;

            MarketWorld.data.updatePurchase(compraId, {
                saldo: nuevoSaldo,
                estado: nuevoSaldo <= 0 ? 'Pagado' : purchase.estado
            });

            MarketWorld.data.createPayment({
                proveedorId: proveedorId,
                proveedorNombre: proveedor.nombre,
                compraId: compraId,
                numeroOrden: purchase.numeroOrden,
                monto: pagoAplicado,
                metodoPago: metodoPagoSeleccionado,
                referenciaTransaccion: referencia,
                tipo: nuevoSaldo <= 0 ? 'Completo' : 'Parcial',
                fechaPago: new Date(fechaPago).toISOString(),
                usuario: user ? (user.nombre || user.username) : 'Sistema'
            });

            montoRestante -= pagoAplicado;
        });

        // Si no seleccionó compras específicas, crear pago general
        if (checksSeleccionados.length === 0) {
            MarketWorld.data.createPayment({
                proveedorId: proveedorId,
                proveedorNombre: proveedor.nombre,
                monto: monto,
                metodoPago: metodoPagoSeleccionado,
                referenciaTransaccion: referencia,
                tipo: 'General',
                fechaPago: new Date(fechaPago).toISOString(),
                usuario: user ? (user.nombre || user.username) : 'Sistema'
            });
        }

        if (typeof MarketWorld !== 'undefined' && MarketWorld.notifications) {
            MarketWorld.notifications.create('success', 'Pago Registrado', `Pago de ${formatMoney(monto)} a ${proveedor.nombre} registrado`, 'compras.html');
        }

        // Debug: verificar que se guardó
        console.log('Pago registrado. Total pagos:', MarketWorld.data.getPayments().length);

        // Limpiar formulario
        document.getElementById('montoPagar').value = '0';
        document.getElementById('referenciaPago').value = '';
        document.getElementById('selectProveedorPago').value = '';
        cargarComprasPendientesPago(null);

        // Recargar TODOS los datos para reflejar cambios
        setTimeout(() => {
            cargarHistorialPagos();
            cargarHistorial();
            actualizarKPIs();
            cargarSelectProveedores();
            cargarProveedores();
        }, 100);

        mostrarAlerta(`Pago de ${formatMoney(monto)} registrado exitosamente`, 'success');
    }

    function cargarHistorialPagos() {
        let payments = MarketWorld.data.getPayments();
        console.log('Cargando historial de pagos. Total:', payments.length);

        // Filtrar por proveedor
        const filtroProvId = document.getElementById('filtrarProveedorPago')?.value;
        if (filtroProvId) {
            payments = payments.filter(p => p.proveedorId === parseInt(filtroProvId));
        }

        // Ordenar por fecha desc
        payments.sort((a, b) => new Date(b.fechaPago) - new Date(a.fechaPago));

        const container = document.getElementById('historialPagosContainer');
        if (!container) {
            console.error('Container historialPagosContainer no encontrado');
            return;
        }

        if (payments.length === 0) {
            container.innerHTML = '<p class="text-center text-muted py-4">No hay pagos registrados</p>';
        } else {
            container.innerHTML = payments.map(p => {
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
            }).join('');
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
        const comprasPend = MarketWorld.data.getPurchasesBySupplier(parseInt(proveedorId))
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

    // --- Event listeners ---
    function initEventListeners() {
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
                    const prov = MarketWorld.data.findSupplierById(provId);
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
            if (el) el.addEventListener('change', cargarHistorial);
        });

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

        // Imprimir compra
        const btnImprimir = document.getElementById('btnImprimirCompra');
        if (btnImprimir) {
            btnImprimir.addEventListener('click', () => {
                const body = document.getElementById('detalleCompraBody');
                if (!body) return;
                const win = window.open('', '_blank');
                win.document.write(`
                    <html><head><title>Orden de Compra</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>body{padding:20px;}</style></head>
                    <body>${body.innerHTML}<script>setTimeout(()=>window.print(),500);<\/script></body></html>
                `);
                win.document.close();
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                MarketWorld.data.logout();
                window.location.href = 'Login.html';
            });
        }

        // Tabs: recargar datos al cambiar
        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const target = e.target.getAttribute('href');
                if (target === '#purchase-history') cargarHistorial();
                if (target === '#suppliers') cargarProveedores();
                if (target === '#payments') {
                    cargarHistorialPagos();
                    cargarSelectProveedores();
                }
            });
        });
    }

    // --- Utilidades ---
    function formatMoney(amount) {
        return '$' + (amount || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function setTextSafe(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function mostrarAlerta(mensaje, tipo) {
        const main = document.getElementById('mainContent');
        if (!main) return;

        // Eliminar alertas anteriores
        main.querySelectorAll('.alert-auto').forEach(a => a.remove());

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${tipo} alert-dismissible fade show alert-auto`;
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = `
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
        `;
        main.insertBefore(alertDiv, main.firstChild);

        setTimeout(() => {
            if (alertDiv.parentNode) alertDiv.remove();
        }, 5000);
    }
})();