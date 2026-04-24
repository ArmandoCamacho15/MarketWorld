
// --- Carrito de productos ---
let carrito = [];
let nextInvoiceId = 128;
let metodoPagoSeleccionado = 'efectivo';
const PRODUCTS_STORAGE_KEY = 'marketworld_products';
let facturasHistorialCache = [];
let deepLinkInvoiceRef = null;
let selectedCliente = null; // cliente seleccionado desde búsqueda rápida
const invoiceHistoryState = {
    page: 1,
    perPage: 10,
    lastPage: 1,
    total: 0,
};

// Helper: escape HTML para mostrar nombres seguros (local a este módulo)
function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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

function ensureInvoiceHistoryPagination() {
    const table = document.getElementById('tablaHistorial');
    if (!table) return null;

    const tableResponsive = table.closest('.table-responsive');
    if (!tableResponsive || !tableResponsive.parentNode) return null;

    let container = document.getElementById('invoiceHistoryPagination');
    if (container) return container;

    container = document.createElement('nav');
    container.id = 'invoiceHistoryPagination';
    container.className = 'mt-3 d-flex justify-content-center';
    container.setAttribute('aria-label', 'Paginación historial de facturas');
    tableResponsive.parentNode.appendChild(container);

    return container;
}

function renderInvoiceHistoryPagination() {
    const container = ensureInvoiceHistoryPagination();
    if (!container) return;

    const current = invoiceHistoryState.page;
    const last = Math.max(1, invoiceHistoryState.lastPage);

    if (last <= 1) {
        container.innerHTML = '';
        return;
    }

    const startPage = Math.max(1, current - 2);
    const endPage = Math.min(last, current + 2);
    const items = [];

    items.push('<li class="page-item' + (current <= 1 ? ' disabled' : '') + '"><a class="page-link" href="#" data-invoice-page="prev">Anterior</a></li>');

    for (let i = startPage; i <= endPage; i++) {
        items.push('<li class="page-item' + (i === current ? ' active' : '') + '"><a class="page-link" href="#" data-invoice-page="' + i + '">' + i + '</a></li>');
    }

    items.push('<li class="page-item' + (current >= last ? ' disabled' : '') + '"><a class="page-link" href="#" data-invoice-page="next">Siguiente</a></li>');
    container.innerHTML = '<ul class="pagination mb-0">' + items.join('') + '</ul>';
}

function initInvoiceHistoryEvents() {
    const btnFiltrarHistorial = document.getElementById('btnFiltrarHistorial');
    const filtroEstado = document.getElementById('filtroEstado');
    const filtroCliente = document.getElementById('filtroCliente');

    if (btnFiltrarHistorial) {
        btnFiltrarHistorial.addEventListener('click', function() {
            invoiceHistoryState.page = 1;
            cargarHistorial();
        });
    }

    if (filtroEstado) {
        filtroEstado.addEventListener('change', function() {
            invoiceHistoryState.page = 1;
            cargarHistorial();
        });
    }

    if (filtroCliente) {
        filtroCliente.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                invoiceHistoryState.page = 1;
                cargarHistorial();
            }
        });
    }

    const pagination = ensureInvoiceHistoryPagination();
    if (pagination) {
        pagination.addEventListener('click', function(event) {
            const link = event.target.closest('[data-invoice-page]');
            if (!link) return;

            event.preventDefault();
            const target = link.getAttribute('data-invoice-page');
            let nextPage = invoiceHistoryState.page;

            if (target === 'prev') {
                nextPage = Math.max(1, invoiceHistoryState.page - 1);
            } else if (target === 'next') {
                nextPage = Math.min(invoiceHistoryState.lastPage, invoiceHistoryState.page + 1);
            } else {
                const parsedPage = parseInt(target, 10);
                if (!isNaN(parsedPage)) {
                    nextPage = parsedPage;
                }
            }

            if (nextPage !== invoiceHistoryState.page) {
                invoiceHistoryState.page = nextPage;
                cargarHistorial();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    console.log(' Sistema de facturación iniciado');

    const params = new URLSearchParams(window.location.search);
    const deepLinkTab = params.get('tab');
    const deepLinkInvoice = params.get('invoice');
    const deepLinkInvoiceId = params.get('invoiceId');
    if (deepLinkTab === 'history' || deepLinkInvoice || deepLinkInvoiceId) {
        activarPestanaHistorial();
    }
    deepLinkInvoiceRef = deepLinkInvoiceId || deepLinkInvoice || null;

    await sincronizarProductosFacturacionConApi();
    
    // --- Inicializar notificaciones ---
    if (MarketWorld.notifications && MarketWorld.notifications.init) {
        MarketWorld.notifications.init();
    }
    
    // --- Modo rápido vs completo ---
    const modoRapido = document.getElementById('modoRapido');
    const modoCompleto = document.getElementById('modoCompleto');
    const contenidoRapido = document.getElementById('contenidoRapido');
    const contenidoCompleto = document.getElementById('contenidoCompleto');
    const clienteQuickNote = document.getElementById('clienteQuickNote');
    
    if (modoRapido && modoCompleto) {
        modoRapido.addEventListener('change', function() {
            if (this.checked) {
                contenidoRapido.style.display = 'block';
                contenidoCompleto.style.display = 'none';
                if (clienteQuickNote) clienteQuickNote.style.display = 'block';
                console.log('📱 Modo Rápido activado');
            }
        });
        
        modoCompleto.addEventListener('change', function() {
            if (this.checked) {
                contenidoRapido.style.display = 'none';
                contenidoCompleto.style.display = 'block';
                if (clienteQuickNote) clienteQuickNote.style.display = 'none';
                mostrarProductosDisponiblesCompleto();
                actualizarDatosFacturaCompleta();
                console.log('📄 Modo Completo activado');
            }
        });
    }

    // Ajustar visibilidad inicial del helper del cliente rápido
    if (clienteQuickNote) {
        clienteQuickNote.style.display = (modoRapido && modoRapido.checked) ? 'block' : 'none';
    }
    
    // --- Mostrar productos disponibles ---
    mostrarProductosDisponibles();
    
    // --- Buscar y agregar productos ---
    const btnBuscarProducto = document.getElementById('btnBuscarProducto');
    const btnAgregarProducto = document.getElementById('btnAgregarProducto');
    const inputBuscarProducto = document.getElementById('buscarProducto');
    const inputCantidadProducto = document.getElementById('cantidadProducto');
    let productoBuscadoRapido = null;
    let terminoBuscadoRapido = '';
    
    if (btnBuscarProducto) {
        btnBuscarProducto.addEventListener('click', function() {
            console.log(' Botón buscar clickeado');
            buscarProductoRapido();
        });
    }

    if (btnAgregarProducto) {
        btnAgregarProducto.addEventListener('click', function() {
            console.log(' Botón agregar clickeado');
            agregarProductoDesdeBusquedaRapida();
        });
    }
    
    if (inputBuscarProducto) {
        inputBuscarProducto.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('⌨️ Enter presionado');
                buscarProductoRapido();
            }
        });

        inputBuscarProducto.addEventListener('input', function() {
            // Evita agregar un producto que no coincide con el texto actual.
            productoBuscadoRapido = null;
            terminoBuscadoRapido = '';
        });
    }
    
    function buscarProductoLocal(termino) {
        const productos = MarketWorld.data.getProducts();
        const coincidencias = productos.filter(function(p) {
            return p && p.activo && (
                String(p.codigo || '').toLowerCase() === termino ||
                String(p.codigo || '').toLowerCase().includes(termino) ||
                String(p.nombre || '').toLowerCase().includes(termino)
            );
        });

        if (coincidencias.length === 0) {
            return null;
        }

        const exacto = coincidencias.find(function(p) {
            return String(p.codigo || '').toLowerCase() === termino;
        });

        return exacto || coincidencias[0];
    }

    async function buscarProductoRapido() {
        const termino = inputBuscarProducto.value.trim().toLowerCase();
        
        console.log('📦 Buscando producto:', termino);
        
        if (!termino) {
            alert('⚠️ Por favor ingresa un código o nombre de producto');
            return null;
        }

        const productoLocal = buscarProductoLocal(termino);
        if (productoLocal) {
            productoBuscadoRapido = productoLocal;
            terminoBuscadoRapido = termino;
            mostrarNotificacion(`Producto encontrado: ${productoLocal.nombre}. Presiona Agregar para continuar.`, 'info');
            return productoLocal;
        }
        
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.products) {
                throw new Error('Adaptador API no disponible');
            }

            const result = await MarketWorld.api.products.getAll({ search: termino });
            console.log('Result API:', result);

            let products = [];
            if (Array.isArray(result.data)) {
                products = result.data;
            } else if (result.data && Array.isArray(result.data.data)) {
                products = result.data.data;
            }

            // Buscar coincidencia exacta por SKU o nombre en los resultados
            const apiProduct = products.find(p =>
                String(p.sku || '').toLowerCase() === termino ||
                String(p.nombre || '').toLowerCase().includes(termino)
            );
            
            if (!apiProduct) {
                alert('❌ Producto no encontrado en el servidor.');
                productoBuscadoRapido = null;
                terminoBuscadoRapido = '';
                return null;
            }

            const producto = {
                id: apiProduct.id,
                codigo: apiProduct.sku,
                nombre: apiProduct.nombre,
                precio: parseFloat(apiProduct.precio_venta),
                stock: apiProduct.stock,
                activo: apiProduct.estado === 'Activo'
            };
            
            if (!producto.activo) {
                alert('⚠️ Este producto está inactivo.');
                productoBuscadoRapido = null;
                terminoBuscadoRapido = '';
                return null;
            }

            productoBuscadoRapido = producto;
            terminoBuscadoRapido = termino;
            mostrarNotificacion(`Producto encontrado: ${producto.nombre}. Presiona Agregar para continuar.`, 'info');
            return producto;
            
        } catch (error) {
            console.error('Error API:', error);
            alert('❌ Error de conexión con la base de datos.');
            return null;
        }
    }

    async function agregarProductoDesdeBusquedaRapida() {
        let producto = productoBuscadoRapido;

        if (!producto) {
            producto = await buscarProductoRapido();
        }

        if (!producto) {
            return;
        }

        const cantidad = parseInt(inputCantidadProducto.value) || 1;
        if (cantidad > producto.stock) {
            alert(`⚠️ Stock insuficiente. Solo hay ${producto.stock} en servidor.`);
            return;
        }

        agregarAlCarrito(producto, cantidad);

        inputBuscarProducto.value = '';
        inputCantidadProducto.value = 1;
        inputBuscarProducto.focus();
        productoBuscadoRapido = null;
        terminoBuscadoRapido = '';
    }
    
    // ======= AGREGAR PRODUCTO AL CARRITO =======
    function agregarAlCarrito(producto, cantidad) {
        const itemExistente = carrito.find(item => item.id === producto.id);
        
        if (itemExistente) {
            const nuevaCantidad = itemExistente.cantidad + cantidad;
            
            if (nuevaCantidad > producto.stock) {
                alert(`⚠️ No puedes agregar más. Stock disponible: ${producto.stock}`);
                return;
            }
            
            itemExistente.cantidad = nuevaCantidad;
            console.log('📦 Cantidad actualizada:', itemExistente.nombre, '->', nuevaCantidad);
        } else {
            // ======= IVA 19% INCLUIDO EN PRECIO =======
            const ivaRate = 19;
            
            carrito.push({
                id: producto.id,
                codigo: producto.codigo,
                nombre: producto.nombre,
                precio: producto.precio,
                cantidad: cantidad,
                iva: ivaRate,
                stock: producto.stock
            });
            console.log('➕ Nuevo producto en carrito:', producto.nombre);
        }
        
        renderizarCarrito();
        calcularTotales();
        mostrarNotificacion(`✅ ${producto.nombre} agregado al carrito`, 'success');
    }
    
    // ======= RENDERIZAR CARRITO =======
    window.renderizarCarrito = function() {
        const tbody = document.querySelector('#tablaCarrito tbody');
        
        if (!tbody) {
            console.error('❌ No se encontró tbody de la tabla');
            return;
        }
        
        tbody.innerHTML = '';
        
        if (carrito.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-muted">
                        <i class="bi bi-cart-x fs-1"></i>
                        <p class="mt-2">No hay productos en el carrito</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        carrito.forEach((item, index) => {
            const totalItem = item.precio * item.cantidad;
            const baseItem = Math.round(totalItem / 1.19);
            const ivaItem = totalItem - baseItem;
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <i class="bi bi-box-seam me-2 text-primary fs-5"></i>
                        <div>
                            <div class="fw-bold">${item.nombre}</div>
                            <div class="text-muted small">Código: ${item.codigo}</div>
                        </div>
                    </div>
                </td>
                <td class="fw-semibold">$${item.precio.toLocaleString('es-CO')}</td>
                <td>
                    <div class="input-group" style="max-width: 130px;">
                        <button class="btn btn-sm btn-outline-secondary" onclick="cambiarCantidad(${index}, -1)" type="button">
                            <i class="bi bi-dash"></i>
                        </button>
                        <input type="number" class="form-control form-control-sm text-center" 
                               value="${item.cantidad}" min="1" max="${item.stock}"
                               onchange="actualizarCantidad(${index}, this.value)" style="width: 60px;">
                        <button class="btn btn-sm btn-outline-secondary" onclick="cambiarCantidad(${index}, 1)" type="button">
                            <i class="bi bi-plus"></i>
                        </button>
                    </div>
                </td>
                <td>${item.iva}% <small class="text-muted">(inc.)</small></td>
                <td class="fw-bold text-primary">$${totalItem.toLocaleString('es-CO')}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarDelCarrito(${index})" title="Eliminar" type="button">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        console.log('🔄 Carrito renderizado. Items:', carrito.length);
    };
    
    // ======= CAMBIAR CANTIDAD =======
    window.cambiarCantidad = function(index, cambio) {
        const item = carrito[index];
        const nuevaCantidad = item.cantidad + cambio;
        
        console.log('🔢 Cambiar cantidad:', item.nombre, 'de', item.cantidad, 'a', nuevaCantidad);
        
        if (nuevaCantidad < 1) {
            alert('⚠️ La cantidad mínima es 1');
            return;
        }
        
        if (nuevaCantidad > item.stock) {
            alert(`⚠️ Stock máximo disponible: ${item.stock}`);
            return;
        }
        
        item.cantidad = nuevaCantidad;
        renderizarCarrito();
        calcularTotales();
    };
    
    // ======= ACTUALIZAR CANTIDAD =======
    window.actualizarCantidad = function(index, nuevaCantidad) {
        nuevaCantidad = parseInt(nuevaCantidad);
        
        if (isNaN(nuevaCantidad) || nuevaCantidad < 1) {
            alert('⚠️ Cantidad inválida');
            renderizarCarrito();
            return;
        }
        
        const item = carrito[index];
        
        if (nuevaCantidad > item.stock) {
            alert(`⚠️ Stock máximo disponible: ${item.stock}`);
            renderizarCarrito();
            return;
        }
        
        item.cantidad = nuevaCantidad;
        renderizarCarrito();
        calcularTotales();
    };
    
    // ======= ELIMINAR DEL CARRITO =======
    window.eliminarDelCarrito = function(index) {
        const item = carrito[index];
        const confirmar = confirm(`¿Eliminar ${item.nombre} del carrito?`);
        
        if (confirmar) {
            console.log('🗑️ Eliminando:', item.nombre);
            carrito.splice(index, 1);
            renderizarCarrito();
            calcularTotales();
            mostrarNotificacion('Producto eliminado del carrito', 'info');
        }
    };
    
    // ======= CALCULAR TOTALES (IVA 19% INCLUIDO) =======
    function calcularTotales() {
        let totalConIVA = 0;
        let subtotalBase = 0;
        let totalIVA = 0;
        
        carrito.forEach(item => {
            const itemTotal = item.precio * item.cantidad;
            const itemBase = Math.round(itemTotal / 1.19);
            const itemIVA = itemTotal - itemBase;
            totalConIVA += itemTotal;
            subtotalBase += itemBase;
            totalIVA += itemIVA;
        });
        
        const descuentoInput = document.getElementById('descuentoInput');
        const descuentoPct = descuentoInput ? parseFloat(descuentoInput.value || 0) : 0;
        const descuentoMonto = totalConIVA * (descuentoPct / 100);
        const total = totalConIVA - descuentoMonto;
        
        const subtotalEl = document.getElementById('subtotalFactura');
        const ivaEl = document.getElementById('ivaFactura');
        const totalEl = document.getElementById('totalFactura');
        const descAplicadoEl = document.getElementById('descuentoAplicado');
        
        if (subtotalEl) subtotalEl.textContent = `$${subtotalBase.toLocaleString('es-CO')}`;
        if (ivaEl) ivaEl.textContent = `$${totalIVA.toLocaleString('es-CO')}`;
        if (descAplicadoEl) descAplicadoEl.textContent = `-$${Math.round(descuentoMonto).toLocaleString('es-CO')}`;
        if (totalEl) totalEl.textContent = `$${Math.round(total).toLocaleString('es-CO')}`;
        
        console.log('💰 Totales - Base:', subtotalBase, 'IVA incluido:', totalIVA, 'Total:', total);
    }
    
    // ======= APLICAR DESCUENTO =======
    const inputDescuento = document.getElementById('descuentoInput');
    if (inputDescuento) {
        inputDescuento.addEventListener('input', calcularTotales);
    }
    
    // ======= VACIAR CARRITO =======
    const btnVaciarCarrito = document.getElementById('btnVaciarCarrito');
    if (btnVaciarCarrito) {
        btnVaciarCarrito.addEventListener('click', function() {
            if (carrito.length === 0) {
                alert('⚠️ El carrito ya está vacío');
                return;
            }
            
            const confirmar = confirm('¿Vaciar todo el carrito?');
            if (confirmar) {
                carrito = [];
                renderizarCarrito();
                calcularTotales();
                mostrarNotificacion('Carrito vaciado', 'info');
                console.log('🗑️ Carrito vaciado');
            }
        });
    }
    
    // ======= GENERAR FACTURA =======
    const btnGenerarFactura = document.getElementById('btnGenerarFactura');
    // --- Búsqueda de clientes (modo rápido) ---
    const inputClienteNombre = document.getElementById('clienteNombre');
    const inputClienteDocumento = document.getElementById('clienteDocumento');
    const suggestionsCliente = document.getElementById('suggestionsCliente');
    const btnBuscarClienteRapido = document.getElementById('btnBuscarClienteRapido');

    function renderClienteSuggestions(items, termino) {
        if (!suggestionsCliente) return;
        suggestionsCliente.innerHTML = '';
        if (!items || items.length === 0) {
            suggestionsCliente.innerHTML = `
                <div class="no-suggestions p-2">
                    <div>No se encontró el cliente.</div>
                    <div class="mt-2"><button class="btn btn-sm btn-link" id="irCrearCliente">Crear cliente en Factura Completa</button></div>
                </div>`;
            suggestionsCliente.style.display = 'block';
            const botonCrear = document.getElementById('irCrearCliente');
            if (botonCrear) {
                botonCrear.addEventListener('click', function() {
                    const modoCompletoRadio = document.getElementById('modoCompleto');
                    if (modoCompletoRadio) {
                        modoCompletoRadio.checked = true;
                        modoCompletoRadio.dispatchEvent(new Event('change'));
                        // Prefill completo
                        const nombreC = document.getElementById('clienteNombreCompleto');
                        const docC = document.getElementById('clienteDocumentoCompleto');
                        if (nombreC) nombreC.value = termino || inputClienteNombre.value || '';
                        if (docC) docC.value = inputClienteDocumento.value || '';
                        const scrollTo = nombreC || docC;
                        if (scrollTo) scrollTo.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    suggestionsCliente.style.display = 'none';
                });
            }
            return;
        }

        items.slice(0,5).forEach(function(c) {
            const el = document.createElement('div');
            el.className = 'suggestion-item p-2';
            el.style.cursor = 'pointer';
            el.innerHTML = `<div class="fw-semibold">${c.nombre}</div><div class="small text-muted">${c.documento}${c.email ? ' · ' + c.email : ''}</div>`;
            el.addEventListener('click', function() {
                selectCliente(c);
                suggestionsCliente.style.display = 'none';
            });
            suggestionsCliente.appendChild(el);
        });
        suggestionsCliente.style.display = 'block';
    }

    function selectCliente(cliente) {
        selectedCliente = cliente;
        if (inputClienteNombre) inputClienteNombre.value = cliente.nombre || '';
        if (inputClienteDocumento) inputClienteDocumento.value = cliente.documento || '';
        mostrarNotificacion(`Cliente seleccionado: ${cliente.nombre}`, 'info');
    }

    function clearClienteSelection() {
        selectedCliente = null;
    }

    async function buscarCliente(term) {
        if (!term || typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.customers) return [];
        try {
            const res = await MarketWorld.api.customers.getAll({ search: term });
            if (!res) return [];
            if (Array.isArray(res.data)) return res.data;
            if (res.data && Array.isArray(res.data.data)) return res.data.data;
            return [];
        } catch (err) {
            console.warn('Error buscando cliente:', err.message || err);
            return [];
        }
    }

    // Eventos para inputs de cliente (rápido)
    if (inputClienteNombre && suggestionsCliente) {
        let tTimeout = null;
        inputClienteNombre.addEventListener('input', function() {
            clearClienteSelection();
            const term = this.value.trim();
            if (tTimeout) clearTimeout(tTimeout);
            if (term.length < 2) { suggestionsCliente.style.display = 'none'; suggestionsCliente.innerHTML = ''; return; }
            tTimeout = setTimeout(async function() {
                const items = await buscarCliente(term);
                renderClienteSuggestions(items, term);
            }, 300);
        });
    }

    if (inputClienteDocumento && suggestionsCliente) {
        let dTimeout = null;
        inputClienteDocumento.addEventListener('input', function() {
            clearClienteSelection();
            const term = this.value.trim();
            if (dTimeout) clearTimeout(dTimeout);
            if (term.length < 2) { suggestionsCliente.style.display = 'none'; suggestionsCliente.innerHTML = ''; return; }
            dTimeout = setTimeout(async function() {
                const items = await buscarCliente(term);
                renderClienteSuggestions(items, term);
            }, 300);
        });
    }

    if (btnBuscarClienteRapido) {
        btnBuscarClienteRapido.addEventListener('click', async function() {
            const term = (inputClienteDocumento && inputClienteDocumento.value.trim()) || (inputClienteNombre && inputClienteNombre.value.trim());
            if (!term) { alert('Ingresa nombre o documento para buscar'); return; }
            const items = await buscarCliente(term);
            renderClienteSuggestions(items, term);
        });
    }

    // Acciones rápidas visibles
    const btnAbrirBusquedaCliente = document.getElementById('btnAbrirBusquedaCliente');
    const btnCrearClienteRapido = document.getElementById('btnCrearClienteRapido');
    const clienteSelectedBadge = document.getElementById('clienteSelectedBadge');

    function updateClienteBadge() {
        if (!clienteSelectedBadge) return;
        if (selectedCliente) {
            clienteSelectedBadge.innerHTML = `<span class="badge bg-primary">ID ${selectedCliente.id}</span> <strong class="ms-2">${selectedCliente.nombre}</strong> <div class="small text-muted">${selectedCliente.documento || ''}</div>`;
        } else {
            clienteSelectedBadge.innerHTML = '<small class="text-muted">Ningún cliente seleccionado</small>';
        }
    }

    // Implementación: guardar cliente en modo Completo (API primero, fallback a local)
    async function saveClienteCompleto() {
        const nombreEl = document.getElementById('clienteNombreCompleto');
        const docEl = document.getElementById('clienteDocumentoCompleto');
        const dirEl = document.getElementById('clienteDireccion');
        const telEl = document.getElementById('clienteTelefono');
        const emailEl = document.getElementById('clienteEmail');
        const ciudadEl = document.getElementById('clienteCiudad');

        const nombre = nombreEl ? nombreEl.value.trim() : '';
        const documento = docEl ? docEl.value.trim() : '';
        const direccion = dirEl ? dirEl.value.trim() : '';
        const telefono = telEl ? telEl.value.trim() : '';
        const email = emailEl ? emailEl.value.trim() : '';
        const ciudad = ciudadEl ? ciudadEl.value.trim() : '';

        if (!nombre || !documento) {
            alert('Por favor completa Nombre y Documento del cliente');
            return;
        }

        try {
            // Intentar API
            if (typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.customers) {
                try {
                    // Buscar por documento
                    let found = null;
                    try {
                        const res = await MarketWorld.api.customers.getAll({ search: documento });
                        const list = Array.isArray(res.data) ? res.data : (res.data && Array.isArray(res.data.data) ? res.data.data : []);
                        found = (list && list.length > 0) ? (list.find(c => String(c.documento || '').trim() === documento) || list[0]) : null;
                    } catch (e) {
                        console.warn('API customers search falló:', e && e.message ? e.message : e);
                    }

                    if (found) {
                        // Actualizar
                        const upd = await MarketWorld.api.customers.update(found.id, {
                            nombre: nombre,
                            documento: documento,
                            direccion: direccion,
                            telefono: telefono,
                            email: email,
                            ciudad: ciudad
                        });
                        selectedCliente = (upd && (upd.data || upd)) ? (upd.data || upd) : found;
                        mostrarNotificacion('Cliente actualizado en servidor', 'success');
                    } else {
                        // Crear
                        const payload = {
                            nombre: nombre,
                            documento: documento,
                            tipo_documento: 'CC',
                            direccion: direccion,
                            telefono: telefono,
                            email: email,
                            ciudad: ciudad
                        };
                        const createRes = await MarketWorld.api.customers.create(payload);
                        selectedCliente = (createRes && (createRes.data || createRes)) ? (createRes.data || createRes) : null;
                        mostrarNotificacion('Cliente creado en servidor', 'success');
                    }
                } catch (apiErr) {
                    console.warn('API customers error, fallback local:', apiErr && apiErr.message ? apiErr.message : apiErr);
                    // Intentar fallback local
                    const localExisting = MarketWorld.data.findCustomerByDocument(documento);
                    if (localExisting) {
                        const updated = MarketWorld.data.updateCustomer(localExisting.id, { nombre: nombre, documento: documento, direccion: direccion, telefono: telefono, email: email, ciudad: ciudad });
                        selectedCliente = updated;
                        mostrarNotificacion('Cliente actualizado en cache local', 'success');
                    } else {
                        const created = MarketWorld.data.createCustomer({ nombre: nombre, documento: documento, tipoDocumento: 'CC', direccion: direccion, telefono: telefono, email: email, ciudad: ciudad });
                        selectedCliente = created;
                        mostrarNotificacion('Cliente creado en cache local', 'success');
                    }
                }
            } else {
                // No hay API: usar local
                const localExisting = MarketWorld.data.findCustomerByDocument(documento);
                if (localExisting) {
                    const updated = MarketWorld.data.updateCustomer(localExisting.id, { nombre: nombre, documento: documento, direccion: direccion, telefono: telefono, email: email, ciudad: ciudad });
                    selectedCliente = updated;
                    mostrarNotificacion('Cliente actualizado en cache local', 'success');
                } else {
                    const created = MarketWorld.data.createCustomer({ nombre: nombre, documento: documento, tipoDocumento: 'CC', direccion: direccion, telefono: telefono, email: email, ciudad: ciudad });
                    selectedCliente = created;
                    mostrarNotificacion('Cliente creado en cache local', 'success');
                }
            }

            // Actualizar badge y UI
            updateClienteBadge();
            // También rellenar campos rápidos si aplica
            if (document.getElementById('clienteNombre')) document.getElementById('clienteNombre').value = selectedCliente.nombre || '';
            if (document.getElementById('clienteDocumento')) document.getElementById('clienteDocumento').value = selectedCliente.documento || '';

        } catch (err) {
            console.error('Error guardando cliente completo:', err);
            alert('Error al guardar cliente: ' + (err && err.message ? err.message : err));
        }
    }

    if (btnAbrirBusquedaCliente) {
        btnAbrirBusquedaCliente.addEventListener('click', function() {
            // mostrar sugerencias enfocando el campo de nombre
            if (inputClienteNombre) {
                inputClienteNombre.focus();
                const event = new Event('input');
                inputClienteNombre.dispatchEvent(event);
            }
        });
    }

    if (btnCrearClienteRapido) {
        btnCrearClienteRapido.addEventListener('click', function() {
            const modoCompletoRadio = document.getElementById('modoCompleto');
            if (modoCompletoRadio) {
                modoCompletoRadio.checked = true;
                modoCompletoRadio.dispatchEvent(new Event('change'));

                // prefill fields in completo with current quick values
                const nombreC = document.getElementById('clienteNombreCompleto');
                const docC = document.getElementById('clienteDocumentoCompleto');
                if (nombreC && inputClienteNombre) nombreC.value = inputClienteNombre.value || '';
                if (docC && inputClienteDocumento) docC.value = inputClienteDocumento.value || '';
                if (nombreC) nombreC.focus();
            }
        });
    }

    // Botón: Guardar cliente (Factura Completa)
    const btnGuardarClienteCompleto = document.getElementById('btnGuardarClienteCompleto');
    if (btnGuardarClienteCompleto) {
        btnGuardarClienteCompleto.addEventListener('click', async function() {
            await saveClienteCompleto();
        });
    }

    // Botón: Limpiar cliente (modo rápido)
    const btnLimpiarCliente = document.getElementById('btnLimpiarCliente');
    if (btnLimpiarCliente) {
        btnLimpiarCliente.addEventListener('click', function() {
            if (inputClienteNombre) inputClienteNombre.value = '';
            if (inputClienteDocumento) inputClienteDocumento.value = '';
            if (suggestionsCliente) { suggestionsCliente.style.display = 'none'; suggestionsCliente.innerHTML = ''; }
            clearClienteSelection();
            updateClienteBadge();
            mostrarNotificacion('Campos de cliente limpiados', 'info');
        });
    }

    // Botón: Limpiar cliente (Factura Completa)
    const btnLimpiarClienteCompleto = document.getElementById('btnLimpiarClienteCompleto');
    if (btnLimpiarClienteCompleto) {
        btnLimpiarClienteCompleto.addEventListener('click', function() {
            // Campos completos
            const nombreC = document.getElementById('clienteNombreCompleto');
            const docC = document.getElementById('clienteDocumentoCompleto');
            const dirC = document.getElementById('clienteDireccion');
            const telC = document.getElementById('clienteTelefono');
            const emailC = document.getElementById('clienteEmail');
            const ciudadC = document.getElementById('clienteCiudad');
            if (nombreC) nombreC.value = '';
            if (docC) docC.value = '';
            if (dirC) dirC.value = '';
            if (telC) telC.value = '';
            if (emailC) emailC.value = '';
            if (ciudadC) ciudadC.value = '';

            // También limpiar campos rápidos y selección
            if (inputClienteNombre) inputClienteNombre.value = '';
            if (inputClienteDocumento) inputClienteDocumento.value = '';
            if (suggestionsCliente) { suggestionsCliente.style.display = 'none'; suggestionsCliente.innerHTML = ''; }
            clearClienteSelection();
            updateClienteBadge();
            mostrarNotificacion('Formulario de cliente limpiado', 'info');
        });
    }

    // Mantener badge actualizado en cambios de selección
    const observerClienteInputs = [inputClienteNombre, inputClienteDocumento];
    observerClienteInputs.forEach(function(inp) {
        if (!inp) return;
        inp.addEventListener('input', function() {
            if (!this.value) {
                clearClienteSelection();
                updateClienteBadge();
            }
        });
    });

    // Inicializar badge
    updateClienteBadge();
    if (btnGenerarFactura) {
        btnGenerarFactura.addEventListener('click', async function() {
            if (carrito.length === 0) {
                alert('⚠️ Agrega productos al carrito para generar la factura');
                return;
            }
            
            // ======= OBTENER DATOS DEL CLIENTE =======
            const clienteNombreRapido = document.getElementById('clienteNombre');
            const clienteDocumentoRapido = document.getElementById('clienteDocumento');
            const clienteNombreCompleto = document.getElementById('clienteNombreCompleto');
            const clienteDocumentoCompleto = document.getElementById('clienteDocumentoCompleto');
            
            const clienteNombre = clienteNombreRapido?.value || clienteNombreCompleto?.value || '';
            const clienteDocumento = clienteDocumentoRapido?.value || clienteDocumentoCompleto?.value || '';

            // Validación cliente según modo: en Rápido cliente debe existir y estar seleccionado.
            const modoRapidoEl = document.getElementById('modoRapido');
            const modoCompletoEl = document.getElementById('modoCompleto');

            if (modoRapidoEl && modoRapidoEl.checked) {
                if (!selectedCliente) {
                    alert('⚠️ En Facturación Rápida debe seleccionar un cliente existente. Si no existe, usa Factura Completa para crearlo.');
                    return;
                }
            }

            if (!clienteNombre || !clienteDocumento) {
                alert('⚠️ Por favor completa los datos del cliente');
                return;
            }
            
            // ======= CALCULAR TOTALES (IVA 19% INCLUIDO EN PRECIO) =======
            let totalConIVA = 0;
            let subtotalBase = 0;
            let totalIVA = 0;
            
            const invoiceItems = carrito.map(item => {
                const itemTotal = item.precio * item.cantidad;
                const itemBase = Math.round(itemTotal / 1.19);
                const itemIVA = itemTotal - itemBase;
                totalConIVA += itemTotal;
                subtotalBase += itemBase;
                totalIVA += itemIVA;
                
                return {
                    product_id: item.id,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio,
                    subtotal: itemTotal
                };
            });
            
            const descuentoPct = parseFloat(document.getElementById('descuentoInput')?.value || 0);
            const descuentoMonto = totalConIVA * (descuentoPct / 100);
            const total = totalConIVA - descuentoMonto;
            
            // Obtener observaciones del modo completo
            const observacionesEl = document.getElementById('observacionesFactura');
            const observaciones = observacionesEl ? observacionesEl.value.trim() : '';
            
            try {
                // Determinar customer_id: si modo rápido -> selectedCliente.id
                // si modo completo -> intentar buscar por documento, si no existe crear
                let customerId = 1;
                if (modoRapidoEl && modoRapidoEl.checked) {
                    customerId = selectedCliente ? selectedCliente.id : 1;
                } else if (modoCompletoEl && modoCompletoEl.checked) {
                    // intentar encontrar cliente por documento exacto
                    try {
                        let found = null;
                        if (typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.customers) {
                            const searchTerm = clienteDocumentoCompleto?.value?.trim() || clienteNombreCompleto?.value?.trim();
                            if (searchTerm) {
                                const res = await MarketWorld.api.customers.getAll({ search: searchTerm });
                                const list = Array.isArray(res.data) ? res.data : (res.data && Array.isArray(res.data.data) ? res.data.data : []);
                                if (list && list.length > 0) {
                                    // prefer exact documento match
                                    found = list.find(c => String(c.documento || '').trim() === String(clienteDocumentoCompleto?.value || '').trim()) || list[0];
                                }
                            }
                        }

                        if (found) {
                            customerId = found.id;
                        } else {
                            // crear cliente en backend
                            const payload = {
                                nombre: clienteNombreCompleto?.value || clienteNombre || 'Cliente',
                                documento: clienteDocumentoCompleto?.value || clienteDocumento || '',
                                tipo_documento: 'CC',
                                email: document.getElementById('clienteEmail')?.value || null,
                                telefono: document.getElementById('clienteTelefono')?.value || null,
                                direccion: document.getElementById('clienteDireccion')?.value || null,
                                ciudad: document.getElementById('clienteCiudad')?.value || null
                            };

                            if (!payload.documento) {
                                throw new Error('Documento del cliente requerido para crear en Factura Completa');
                            }

                            const createRes = await MarketWorld.api.customers.create(payload);
                            if (createRes && createRes.success && createRes.data) {
                                customerId = createRes.data.id;
                                mostrarNotificacion('Cliente creado y asignado a la factura', 'success');
                            } else {
                                throw new Error((createRes && createRes.message) || 'No se pudo crear el cliente');
                            }
                        }
                    } catch (errCliente) {
                        console.error('Error al resolver/crear cliente:', errCliente);
                        alert('❌ Error al crear o buscar cliente: ' + (errCliente.message || errCliente));
                        return;
                    }
                }

                // Mapear método y solicitar referencia si aplica
                const mappedMetodoPago = mapPaymentMethod(metodoPagoSeleccionado);
                let paymentReference = null;
                if (mappedMetodoPago === 'Tarjeta') {
                    paymentReference = prompt('Ingrese referencia de la tarjeta (p.ej. últimos 4 dígitos o id transacción). No almacene datos sensibles.');
                } else if (mappedMetodoPago === 'Transferencia') {
                    paymentReference = prompt('Ingrese número o referencia de la transferencia:');
                }

                const invoiceData = {
                    numero_factura: 'FAC-' + Date.now(),
                    customer_id: customerId,
                    fecha: new Date().toISOString().slice(0, 19).replace('T', ' '),
                    subtotal: subtotalBase,
                    impuestos: totalIVA,
                    total: total,
                    metodo_pago: mappedMetodoPago,
                    estado: 'Pagada',
                    notas: observaciones,
                    payment_reference: paymentReference || null,
                    items: invoiceItems
                };

                if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.invoices) {
                    throw new Error('Adaptador de API no disponible');
                }

                const result = await MarketWorld.api.invoices.create(invoiceData);

                if (!result.success) {
                    throw new Error(result.message || 'Error al guardar en el servidor.');
                }

                const factura = result.data;
                console.log('📄 Factura generada por API:', factura);
                
                mostrarNotificacion(`✅ Factura ${factura.numero_factura} generada exitosamente`, 'success');
                
                // NOTIFICAR STOCK BAJO POST-VENTA
                if (factura.items && Array.isArray(factura.items)) {
                    factura.items.forEach(item => {
                        // Accedemos a product (relación cargada en el backend)
                        if (item.product && item.product.stock <= item.product.stock_minimo) {
                            mostrarNotificacion(`⚠️ Stock bajo: ${item.product.nombre} (${item.product.stock} restantes)`, 'danger');
                        }
                    });
                }

                alert(`✅ VENTA EXITOSA\nFactura: ${factura.numero_factura}\nTotal: $${total.toLocaleString('es-CO')}\n\nEl stock ha sido actualizado en la base de datos.`);
                
                // Limpiar formulario e interfaz
                carrito = [];
                renderizarCarrito();
                calcularTotales();
                
                if (clienteNombreRapido) clienteNombreRapido.value = '';
                if (clienteDocumentoRapido) clienteDocumentoRapido.value = '';
                if (clienteNombreCompleto) clienteNombreCompleto.value = '';
                if (clienteDocumentoCompleto) clienteDocumentoCompleto.value = '';

                if (observacionesEl) observacionesEl.value = '';
                const descInput = document.getElementById('descuentoInput');
                if (descInput) descInput.value = 0;
                
                // Actualizar productos mostrados (ambos modos)
                mostrarProductosDisponibles();
                mostrarProductosDisponiblesCompleto();
                actualizarDatosFacturaCompleta();
                
                // Actualizar historial
                cargarHistorial();
                
            } catch (error) {
                console.error('Error al generar factura:', error);
                alert(`❌ Error de Producción: ${error.message}`);
            }
        });
    }
    
    // Mostrar productos
    async function mostrarProductosDisponibles() {
        const container = document.getElementById('productosDisponibles');
        if (!container) return;

        container.innerHTML = '<h5 class="mb-3">🔥 Productos Más Vendidos</h5>';

        // CORRECCIÓN: Intentar cargar productos frescos desde API primero; fallback a localStorage
        var productosList = [];
        if (typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.products && MarketWorld.api.products.getAll) {
            try {
                const res = await MarketWorld.api.products.getAll();
                var apiProducts = res && (res.data || Array.isArray(res)) ? (res.data || res) : [];
                // Mapear a formato frontend (similar a inventario.js)
                productosList = (apiProducts || []).map(function(p) {
                    return {
                        id: p.id,
                        codigo: p.sku || p.codigo || '',
                        nombre: p.nombre || p.name || '',
                        descripcion: p.descripcion || p.description || '',
                        categoria: p.categoria || p.category || 'Sin categoría',
                        precio: parseFloat(p.precio_venta || p.precio || 0) || 0,
                        costo: parseFloat(p.precio_compra || p.costo || 0) || 0,
                        stock: parseInt(p.stock || p.stock_actual || 0, 10) || 0,
                        stockMinimo: parseInt(p.stock_minimo || p.stockMinimo || 0, 10) || 0,
                        unidad: p.unidad || 'Unidad',
                        proveedor: p.proveedor || '',
                        activo: (p.estado || 'Activo') === 'Activo',
                        origin: 'api'
                    };
                });

                // Actualizar cache local para mantener consistencia
                try {
                    localStorage.setItem('marketworld_products', JSON.stringify(productosList));
                } catch (e) { console.warn('No se pudo actualizar localStorage con productos API:', e && e.message ? e.message : e); }
            } catch (err) {
                console.warn('Error cargando productos desde API, usando localStorage:', err && err.message ? err.message : err);
                productosList = MarketWorld.data.getProducts();
            }
        } else {
            productosList = MarketWorld.data.getProducts();
        }

        // Mostrar solo productos activos (no filtrar por origin para permitir fallback local)
        const productosActivos = (productosList || []).filter(function(p) { return p && p.activo; });
        const productosDestacados = productosActivos
            .slice()
            .sort(function(a, b) { return (b.id || 0) - (a.id || 0); })
            .slice(0, 6);

        const grid = document.createElement('div');
        grid.className = 'row g-2';

        productosDestacados.forEach(producto => {
            const col = document.createElement('div');
            col.className = 'col-md-4 col-6';

            col.innerHTML = `
                <div class="card h-100 producto-card" style="cursor: pointer;" onclick="agregarProductoRapido(${producto.id})">
                    <div class="card-body text-center p-2">
                        <i class="bi bi-box-seam text-primary fs-2"></i>
                        <h6 class="card-title small mt-2 mb-1">${escapeHtml(producto.nombre)}</h6>
                        <p class="text-muted small mb-1">${escapeHtml(producto.codigo)}</p>
                        <p class="fw-bold text-primary mb-1">$${producto.precio.toLocaleString('es-CO')}</p>
                        <span class="badge ${producto.stock > 20 ? 'bg-success' : producto.stock > 5 ? 'bg-warning' : 'bg-danger'} small">Stock: ${producto.stock}</span>
                    </div>
                </div>
            `;

            grid.appendChild(col);
        });

        container.appendChild(grid);
    }
    
    // Agregar producto rápido
    // CORRECCIÓN: Revalidar producto por ID antes de agregar al carrito.
    // - Si la entrada local está ausente o parece ser un mock/genérico, solicitar al API por ID
    // - Actualizar cache local si se obtiene un producto desde el API
    window.agregarProductoRapido = async function(id) {
        // Intentar resolver desde la cache local primero
        var producto = MarketWorld.data.findProductById(id);

        function isLikelyMockName(name) {
            if (!name) return true;
            var n = String(name).toLowerCase();
            return /\b(qa|test|mock|producto qa)\b/.test(n);
        }

        // Si no existe localmente o el nombre parece mock/genérico, intentar pedir al API
        if (!producto || !producto.nombre || isLikelyMockName(producto.nombre)) {
            if (typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.products && MarketWorld.api.products.getById) {
                try {
                    const res = await MarketWorld.api.products.getById(id);
                    var apiP = res && (res.data || res) ? (res.data || res) : null;
                    if (apiP) {
                        producto = {
                            id: apiP.id,
                            codigo: apiP.sku || apiP.codigo || '',
                            nombre: apiP.nombre || apiP.name || '',
                            descripcion: apiP.descripcion || apiP.description || '',
                            categoria: apiP.categoria || apiP.category || 'Sin categoría',
                            precio: parseFloat(apiP.precio_venta || apiP.precio || 0) || 0,
                            costo: parseFloat(apiP.precio_compra || apiP.costo || 0) || 0,
                            stock: parseInt(apiP.stock || apiP.stock_actual || 0, 10) || 0,
                            stockMinimo: parseInt(apiP.stock_minimo || apiP.stockMinimo || 0, 10) || 0,
                            unidad: apiP.unidad || 'Unidad',
                            proveedor: apiP.proveedor || '',
                            activo: (apiP.estado || 'Activo') === 'Activo',
                            origin: 'api'
                        };

                        // Actualizar cache local con el producto fresco
                        try {
                            var locals = MarketWorld.data.getProducts();
                            var idx = locals.findIndex(function(p) {
                                return String(p.id) === String(producto.id) || (p.codigo && String(p.codigo).toLowerCase() === String(producto.codigo).toLowerCase());
                            });
                            if (idx === -1) {
                                locals.push(producto);
                            } else {
                                locals[idx] = Object.assign({}, locals[idx], producto);
                            }
                            localStorage.setItem('marketworld_products', JSON.stringify(locals));
                        } catch (e) {
                            console.warn('No se pudo actualizar cache local con producto API', e && e.message ? e.message : e);
                        }
                    }
                } catch (err) {
                    console.warn('No se pudo obtener producto por ID desde API:', err && err.message ? err.message : err);
                }
            }
        }

        if (producto && producto.activo) {
            agregarAlCarrito(producto, 1);
        } else {
            alert('Producto no disponible o inactivo');
        }
    };
    
    // Notificaciones
    function mostrarNotificacion(mensaje, tipo = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 150);
        }, 3000);
    }

    function escapeRegExp(text) {
        return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function resaltarTexto(texto, termino) {
        const text = String(texto || '');
        const term = String(termino || '').trim();
        if (!term) return text;

        const regex = new RegExp('(' + escapeRegExp(term) + ')', 'ig');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }
    
    // Autocompletado de productos
    const inputBuscar = document.getElementById('buscarProducto');
    const suggestionsContainer = document.getElementById('suggestions');
    
    if (inputBuscar && suggestionsContainer) {
        // Escuchar cada tecla presionada
        inputBuscar.addEventListener('input', async function() {
            const termino = this.value.trim().toLowerCase();
            
            console.log(' Buscando:', termino);
            
            // Si hay menos de 2 caracteres, ocultar sugerencias
            if (termino.length < 2) {
                suggestionsContainer.style.display = 'none';
                suggestionsContainer.innerHTML = '';
                return;
            }
            
            // CORRECCIÓN: Intentar buscar en API primero (debounce ya maneja carga)
            var productosFiltrados = [];
            if (typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.products && MarketWorld.api.products.getAll) {
                try {
                    const res = await MarketWorld.api.products.getAll({ search: termino });
                    var apiProducts = res && (res.data || Array.isArray(res)) ? (res.data || res) : [];
                    // Mapear
                    var mapped = (apiProducts || []).map(function(p) {
                        return {
                            id: p.id,
                            codigo: p.sku || p.codigo || '',
                            nombre: p.nombre || p.name || '',
                            precio: parseFloat(p.precio_venta || p.precio || 0) || 0,
                            stock: parseInt(p.stock || p.stock_actual || 0, 10) || 0,
                            origin: 'api',
                            activo: (p.estado || 'Activo') === 'Activo'
                        };
                    });

                    // Actualizar cache local con los resultados (mejora consistencia)
                    try {
                        var locals = MarketWorld.data.getProducts();
                        mapped.forEach(function(mp) {
                            var idx = locals.findIndex(function(lp) { return String(lp.id) === String(mp.id) || (lp.codigo && String(lp.codigo).toLowerCase() === String(mp.codigo).toLowerCase()); });
                            if (idx === -1) locals.push(mp); else locals[idx] = Object.assign({}, locals[idx], mp);
                        });
                        localStorage.setItem('marketworld_products', JSON.stringify(locals));
                    } catch (e) { console.warn('No se pudo actualizar cache local con resultados de búsqueda', e && e.message ? e.message : e); }

                    productosFiltrados = mapped.filter(function(p) { return p && p.activo && (String(p.nombre || '').toLowerCase().includes(termino) || String(p.codigo || '').toLowerCase().includes(termino)); });
                } catch (err) {
                    console.warn('API búsqueda falló, usando cache local:', err && err.message ? err.message : err);
                    const productos = MarketWorld.data.getProducts();
                    productosFiltrados = productos.filter(p => 
                        p && p.activo && (
                            String(p.nombre || '').toLowerCase().includes(termino) ||
                            String(p.codigo || '').toLowerCase().includes(termino)
                        )
                    );
                }
            } else {
                const productos = MarketWorld.data.getProducts();
                productosFiltrados = productos.filter(p => 
                    p && p.activo && (
                        String(p.nombre || '').toLowerCase().includes(termino) ||
                        String(p.codigo || '').toLowerCase().includes(termino)
                    )
                );
            }
            
            console.log('📦 Productos encontrados:', productosFiltrados.length);
            
            // Si no hay resultados
            if (productosFiltrados.length === 0) {
                suggestionsContainer.innerHTML = '<div class="no-suggestions">No se encontraron productos</div>';
                suggestionsContainer.style.display = 'block';
                return;
            }
            
            // Mostrar sugerencias
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'block';
            
            productosFiltrados.slice(0, 5).forEach(producto => {
                const suggestionItem = document.createElement('div');
                suggestionItem.className = 'suggestion-item';
                
                // Resaltar texto coincidente
                const nombreResaltado = resaltarTexto(producto.nombre, termino);
                const codigoResaltado = resaltarTexto(producto.codigo, termino);
                
                suggestionItem.innerHTML = `
                    <div class="suggestion-name">${nombreResaltado}</div>
                    <div class="suggestion-details">
                        <span class="suggestion-sku">Código: ${codigoResaltado}</span>
                        <span class="suggestion-price">$${producto.precio.toLocaleString('es-CO')}</span>
                        <span class="suggestion-stock ${producto.stock <= producto.stockMinimo ? 'low' : ''}">
                            Stock: ${producto.stock}
                        </span>
                    </div>
                `;
                
                // Al hacer clic, seleccionar el producto sin agregarlo aún.
                suggestionItem.addEventListener('click', function() {
                    productoBuscadoRapido = producto;
                    terminoBuscadoRapido = String(producto.codigo || producto.nombre || '').trim().toLowerCase();
                    inputBuscar.value = `${String(producto.codigo || '').trim()} - ${String(producto.nombre || '').trim()}`;
                    inputCantidadProducto.value = inputCantidadProducto.value || 1;
                    mostrarNotificacion(`Seleccionado: ${producto.nombre}. Ahora presiona Agregar.`, 'info');
                    suggestionsContainer.style.display = 'none';
                    suggestionsContainer.innerHTML = '';
                });
                
                suggestionsContainer.appendChild(suggestionItem);
            });
        });
        
        // Ocultar sugerencias al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (!inputBuscar.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
            }
        });
    }
    
    // ===== MODO COMPLETO: Buscar y agregar productos =====
    const btnBuscarCompleto = document.getElementById('btnBuscarProductoCompleto');
    const btnAgregarCompleto = document.getElementById('btnAgregarProductoCompleto');
    const inputBuscarCompleto = document.getElementById('buscarProductoCompleto');
    const inputCantidadCompleto = document.getElementById('cantidadProductoCompleto');

    function buscarYAgregarProductoCompleto() {
        const termino = inputBuscarCompleto.value.trim().toLowerCase();
        const cantidad = parseInt(inputCantidadCompleto.value) || 1;

        if (!termino) {
            alert('⚠️ Por favor ingresa un código o nombre de producto');
            return;
        }

        const productos = MarketWorld.data.getProducts();
        const producto = productos.find(p =>
            p.codigo.toLowerCase().includes(termino) ||
            p.nombre.toLowerCase().includes(termino)
        );

        if (!producto) {
            alert('❌ Producto no encontrado. Verifica el código o nombre.');
            return;
        }
        if (!producto.activo) {
            alert('⚠️ Este producto está inactivo y no puede ser facturado.');
            return;
        }
        if (cantidad > producto.stock) {
            alert(`⚠️ Stock insuficiente. Solo hay ${producto.stock} unidades disponibles.`);
            return;
        }

        agregarAlCarrito(producto, cantidad);
        inputBuscarCompleto.value = '';
        inputCantidadCompleto.value = 1;
        inputBuscarCompleto.focus();
    }

    let productoBuscadoCompleto = null;

    function buscarProductoCompleto() {
        const termino = inputBuscarCompleto.value.trim().toLowerCase();
        if (!termino) {
            alert('⚠️ Por favor ingresa un código o nombre de producto');
            return;
        }

        const productos = MarketWorld.data.getProducts();
        const producto = productos.find(function(p) {
            return p && p.activo && (
                String(p.codigo || '').toLowerCase() === termino ||
                String(p.codigo || '').toLowerCase().includes(termino) ||
                String(p.nombre || '').toLowerCase().includes(termino)
            );
        });

        if (!producto) {
            alert('❌ Producto no encontrado. Verifica el código o nombre.');
            productoBuscadoCompleto = null;
            return;
        }

        productoBuscadoCompleto = producto;
        mostrarNotificacion(`Producto encontrado: ${producto.nombre}. Presiona Agregar para continuar.`, 'info');
    }

    function agregarProductoCompleto() {
        if (!productoBuscadoCompleto) {
            buscarProductoCompleto();
        }

        if (!productoBuscadoCompleto) return;

        const cantidad = parseInt(inputCantidadCompleto.value) || 1;
        if (cantidad > productoBuscadoCompleto.stock) {
            alert(`⚠️ Stock insuficiente. Solo hay ${productoBuscadoCompleto.stock} unidades disponibles.`);
            return;
        }

        agregarAlCarrito(productoBuscadoCompleto, cantidad);
        inputBuscarCompleto.value = '';
        inputCantidadCompleto.value = 1;
        inputBuscarCompleto.focus();
        productoBuscadoCompleto = null;
    }

    if (btnBuscarCompleto) {
        btnBuscarCompleto.addEventListener('click', buscarProductoCompleto);
    }
    if (btnAgregarCompleto) {
        btnAgregarCompleto.addEventListener('click', agregarProductoCompleto);
    }
    if (inputBuscarCompleto) {
        inputBuscarCompleto.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarProductoCompleto();
            }
        });
    }

    // Autocompletado modo completo
    const suggestionsCompleto = document.getElementById('suggestionsCompleto');
    if (inputBuscarCompleto && suggestionsCompleto) {
        inputBuscarCompleto.addEventListener('input', function() {
            const termino = this.value.trim().toLowerCase();
            if (termino.length < 2) {
                suggestionsCompleto.style.display = 'none';
                suggestionsCompleto.innerHTML = '';
                return;
            }

            const productos = MarketWorld.data.getProducts();
            const productosFiltrados = productos.filter(p =>
                p && p.activo && (
                    String(p.nombre || '').toLowerCase().includes(termino) ||
                    String(p.codigo || '').toLowerCase().includes(termino)
                )
            );

            if (productosFiltrados.length === 0) {
                suggestionsCompleto.innerHTML = '<div class="no-suggestions">No se encontraron productos</div>';
                suggestionsCompleto.style.display = 'block';
                return;
            }

            suggestionsCompleto.innerHTML = '';
            suggestionsCompleto.style.display = 'block';

            productosFiltrados.slice(0, 5).forEach(producto => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                const nombreRes = resaltarTexto(producto.nombre, termino);
                const codigoRes = resaltarTexto(producto.codigo, termino);
                item.innerHTML = `
                    <div class="suggestion-name">${nombreRes}</div>
                    <div class="suggestion-details">
                        <span class="suggestion-sku">Código: ${codigoRes}</span>
                        <span class="suggestion-price">$${producto.precio.toLocaleString('es-CO')}</span>
                        <span class="suggestion-stock ${producto.stock <= producto.stockMinimo ? 'low' : ''}">Stock: ${producto.stock}</span>
                    </div>
                `;
                item.addEventListener('click', function() {
                    productoBuscadoCompleto = producto;
                    inputBuscarCompleto.value = `${String(producto.codigo || '').trim()} - ${String(producto.nombre || '').trim()}`;
                    mostrarNotificacion(`Seleccionado: ${producto.nombre}. Ahora presiona Agregar.`, 'info');
                    suggestionsCompleto.style.display = 'none';
                    suggestionsCompleto.innerHTML = '';
                });
                suggestionsCompleto.appendChild(item);
            });
        });

        document.addEventListener('click', function(e) {
            if (!inputBuscarCompleto.contains(e.target) && !suggestionsCompleto.contains(e.target)) {
                suggestionsCompleto.style.display = 'none';
            }
        });
    }

    // Productos destacados modo completo
    async function mostrarProductosDisponiblesCompleto() {
        const container = document.getElementById('productosDisponiblesCompleto');
        if (!container) return;

        container.innerHTML = '<h5 class="mb-3">🔥 Productos Más Vendidos</h5>';

        // Intentar cargar desde API primero; si falla, usar localStorage
        var productosList = [];
        var apiLoaded = false;
        if (typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.products && MarketWorld.api.products.getAll) {
            try {
                const res = await MarketWorld.api.products.getAll();
                var apiProducts = res && (res.data || Array.isArray(res)) ? (res.data || res) : [];
                productosList = (apiProducts || []).map(function(p) {
                    return {
                        id: p.id,
                        codigo: p.sku || p.codigo || '',
                        nombre: p.nombre || p.name || '',
                        precio: parseFloat(p.precio_venta || p.precio || 0) || 0,
                        stock: parseInt(p.stock || p.stock_actual || 0, 10) || 0,
                        origin: 'api',
                        activo: (p.estado || 'Activo') === 'Activo'
                    };
                });
                apiLoaded = true;
                try { localStorage.setItem('marketworld_products', JSON.stringify(productosList)); } catch (e) { /* ignore */ }
            } catch (err) {
                console.warn('mostrarProductosDisponiblesCompleto: API falla, usando cache local', err && err.message ? err.message : err);
                productosList = MarketWorld.data.getProducts();
            }
        } else {
            productosList = MarketWorld.data.getProducts();
        }

        // Si cargamos desde API, priorizar productos origin:'api'; si no, mostrar los locales disponibles
        var productosActivos = [];
        if (apiLoaded) {
            productosActivos = (productosList || []).filter(function(p) { return p && p.activo && p.origin === 'api'; });
            // Si API respondió pero no devolvió api products, fallback a locales activos
            if (!productosActivos || productosActivos.length === 0) {
                productosActivos = (MarketWorld.data.getProducts() || []).filter(function(p) { return p && p.activo; });
            }
        } else {
            productosActivos = (productosList || []).filter(function(p) { return p && p.activo; });
        }

        const productosDestacados = productosActivos
            .slice()
            .sort(function(a, b) { return (b.id || 0) - (a.id || 0); })
            .slice(0, 6);

        const grid = document.createElement('div');
        grid.className = 'row g-2';

        productosDestacados.forEach(producto => {
            const col = document.createElement('div');
            col.className = 'col-md-4 col-6';
            col.innerHTML = `
                <div class="card h-100 producto-card" style="cursor: pointer;" onclick="seleccionarProductoCompleto(${producto.id})">
                    <div class="card-body text-center p-2">
                        <i class="bi bi-box-seam text-primary fs-2"></i>
                        <h6 class="card-title small mt-2 mb-1">${escapeHtml(producto.nombre)}</h6>
                        <p class="text-muted small mb-1">${escapeHtml(producto.codigo)}</p>
                        <p class="fw-bold text-primary mb-1">$${producto.precio.toLocaleString('es-CO')}</p>
                        <span class="badge ${producto.stock > 20 ? 'bg-success' : producto.stock > 5 ? 'bg-warning' : 'bg-danger'} small">Stock: ${producto.stock}</span>
                    </div>
                </div>
            `;
            grid.appendChild(col);
        });

        container.appendChild(grid);
    }

    window.seleccionarProductoCompleto = function(id) {
        const producto = MarketWorld.data.findProductById(id);
        if (!producto || !producto.activo) return;

        productoBuscadoCompleto = producto;
        if (inputBuscarCompleto) {
            inputBuscarCompleto.value = `${String(producto.codigo || '').trim()} - ${String(producto.nombre || '').trim()}`;
        }
        mostrarNotificacion(`Seleccionado: ${producto.nombre}. Ahora presiona Agregar.`, 'info');
    };

    function getProductosActivos() {
        const productos = MarketWorld.data.getProducts();
        return productos.filter(function(p) {
            return p && p.activo;
        });
    }

    async function sincronizarProductosFacturacionConApi() {
        try {
            const hasApi = typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.products;
            const token = localStorage.getItem('marketworld_auth_token');
            if (!hasApi || !token) return;

            const response = await MarketWorld.api.products.getAll();
            let apiProducts = [];
            if (Array.isArray(response && response.data)) {
                apiProducts = response.data;
            } else if (response && response.data && Array.isArray(response.data.data)) {
                apiProducts = response.data.data;
            }
            if (apiProducts.length === 0) return;

            const localProducts = MarketWorld.data.getProducts();
            const byCode = new Map();

            localProducts.forEach(function(product) {
                if (product && product.codigo) {
                    byCode.set(String(product.codigo).toLowerCase(), product);
                }
            });

            apiProducts.forEach(function(apiProduct) {
                const mapped = {
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
                    activo: (apiProduct.estado || 'Activo') === 'Activo',
                    origin: 'api'
                };

                if (mapped.codigo) {
                    byCode.set(String(mapped.codigo).toLowerCase(), mapped);
                }
            });

            localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(Array.from(byCode.values())));
            // Asegurar categoría 'Alimentos' existe en el front local si aparece en productos API
            try {
                const localCats = MarketWorld.data.getCategories ? MarketWorld.data.getCategories() : [];
                const hasAlimentos = localCats.some(function(c) { return String(c.nombre || '').toLowerCase() === 'alimentos'; });
                const anyApiHasAlimentos = apiProducts.some(function(p) { return String(p.categoria || '').toLowerCase() === 'alimentos'; });
                if (anyApiHasAlimentos && !hasAlimentos && MarketWorld.data.createCategory) {
                    MarketWorld.data.createCategory({ nombre: 'Alimentos', descripcion: 'Productos alimenticios', activa: true });
                    console.log('Categoría "Alimentos" creada localmente por sincronización.');
                }
            } catch (e) {
                console.warn('No se pudo asegurar categoría Alimentos:', e && e.message ? e.message : e);
            }
        } catch (error) {
            console.warn('No se pudieron sincronizar productos desde API en facturación:', error.message || error);
        }
    }

    // Actualizar número de factura y fechas en modo completo
    function actualizarDatosFacturaCompleta() {
        const numFacturaEl = document.getElementById('numeroFacturaCompleta');
        const fechaEmisionEl = document.getElementById('fechaFacturaCompleta');
        const fechaVencimientoEl = document.getElementById('fechaVencimientoCompleta');

        if (numFacturaEl) {
            const nextNum = MarketWorld.data.generateInvoiceNumber();
            numFacturaEl.value = nextNum;
        }

        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = String(hoy.getMonth() + 1).padStart(2, '0');
        const dd = String(hoy.getDate()).padStart(2, '0');
        const fechaHoy = `${yyyy}-${mm}-${dd}`;

        const vencimiento = new Date(hoy);
        vencimiento.setDate(vencimiento.getDate() + 30);
        const vyyyy = vencimiento.getFullYear();
        const vmm = String(vencimiento.getMonth() + 1).padStart(2, '0');
        const vdd = String(vencimiento.getDate()).padStart(2, '0');
        const fechaVenc = `${vyyyy}-${vmm}-${vdd}`;

        if (fechaEmisionEl) fechaEmisionEl.value = fechaHoy;
        if (fechaVencimientoEl) fechaVencimientoEl.value = fechaVenc;
    }

// Métodos de pago
    const paymentButtons = document.querySelectorAll('.payment-method');
    
    paymentButtons.forEach(button => {
        button.addEventListener('click', function() {
            paymentButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            metodoPagoSeleccionado = this.getAttribute('data-method');
            console.log('💳 Método de pago seleccionado:', metodoPagoSeleccionado);
        });
    });

    // Mapear valor interno a etiqueta amigable/esperada por backend
    function mapPaymentMethod(method) {
        if (!method) return 'Efectivo';
        const m = String(method).toLowerCase();
        if (m === 'tarjeta' || m === 'card') return 'Tarjeta';
        if (m === 'transferencia' || m === 'bank' || m === 'transfer') return 'Transferencia';
        if (m === 'efectivo' || m === 'cash') return 'Efectivo';
        // valor por defecto
        return method.charAt(0).toUpperCase() + method.slice(1);
    }
    
    // Cargar historial de facturas al iniciar
    initInvoiceHistoryEvents();
    cargarHistorial();

    function activarPestanaHistorial() {
        const historyTab = document.querySelector('.nav-link[href="#history"]');
        if (!historyTab || typeof bootstrap === 'undefined' || !bootstrap.Tab) return;
        const tabInstance = bootstrap.Tab.getOrCreateInstance(historyTab);
        tabInstance.show();
    }

    async function cargarHistorial() {
        const tbody = document.getElementById('tablaHistorial');
        if (!tbody) return;
        
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.invoices) {
                return;
            }

            const filtroEstado = document.getElementById('filtroEstado');
            const filtroCliente = document.getElementById('filtroCliente');
            const requestFilters = {
                page: invoiceHistoryState.page,
                per_page: invoiceHistoryState.perPage,
            };

            if (filtroEstado && filtroEstado.value && filtroEstado.value !== 'todos') {
                requestFilters.estado = filtroEstado.value;
            }

            if (filtroCliente && filtroCliente.value.trim()) {
                requestFilters.search = filtroCliente.value.trim();
            }

            const result = await MarketWorld.api.invoices.getAll(requestFilters);
            const parsed = normalizeApiListResponse(result, {
                current_page: invoiceHistoryState.page,
                per_page: invoiceHistoryState.perPage,
            });

            if (!parsed.success) return;

            invoiceHistoryState.page = parsed.meta.current_page;
            invoiceHistoryState.perPage = parsed.meta.per_page;
            invoiceHistoryState.lastPage = parsed.meta.last_page;
            invoiceHistoryState.total = parsed.meta.total;

            const facturas = parsed.items;
            facturasHistorialCache = facturas;
            
            // Renderizar tabla
            tbody.innerHTML = '';
            
            if (facturas.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center">No hay facturas registradas</td></tr>`;
                renderInvoiceHistoryPagination();
                return;
            }
            
            facturas.forEach(factura => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${factura.numero_factura}</strong></td>
                    <td>${new Date(factura.fecha).toLocaleDateString()}</td>
                    <td>${factura.customer_id ? 'Cliente #' + factura.customer_id : 'Venta General'}</td>
                    <td class="fw-bold">$${parseFloat(factura.total).toLocaleString('es-CO')}</td>
                    <td><span class="badge bg-success">${factura.estado}</span></td>
                    <td>${factura.metodo_pago}</td>
                    <td>${factura.seller?.name || 'Sistema'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary btn-ver-factura" data-factura-id="${factura.id}" type="button">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            const botonesVer = tbody.querySelectorAll('.btn-ver-factura');
            botonesVer.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    const id = parseInt(btn.getAttribute('data-factura-id'), 10);
                    if (!isNaN(id)) {
                        verDetalleFactura(id);
                    }
                });
            });

            // Actualizar KPIs de facturación
            actualizarKPIs(facturas);
            renderInvoiceHistoryPagination();

            if (deepLinkInvoiceRef) {
                const match = facturas.find(function(f) {
                    return String(f.id) === String(deepLinkInvoiceRef)
                        || String(f.numero_factura || '').toLowerCase() === String(deepLinkInvoiceRef).toLowerCase();
                });
                if (match) {
                    verDetalleFactura(match.id);
                    deepLinkInvoiceRef = null;
                }
            }

        } catch (error) {
            console.error('Error al cargar historial:', error);
        }
    }

    function actualizarKPIs(facturas) {
        const total = facturas.reduce((sum, f) => sum + parseFloat(f.total), 0);
        const kpiTotal = document.getElementById('kpiTotalFacturado');
        if (kpiTotal) kpiTotal.textContent = '$' + total.toLocaleString('es-CO');
    }

    // Actualizar KPIs adicionales: contadores por estado
    // Muestra número de facturas Pagadas / Pendientes / Canceladas
    (function actualizarKPIsEstados() {
        const orig = actualizarKPIs;
        actualizarKPIs = function(facturas) {
            try {
                // Llamada original para total
                orig(facturas);

                const pagadasEl = document.getElementById('kpiFacturasPagadas');
                const pendientesEl = document.getElementById('kpiFacturasPendientes');
                const canceladasEl = document.getElementById('kpiFacturasCanceladas');

                let pagadas = 0, pendientes = 0, canceladas = 0;
                (facturas || []).forEach(function(f) {
                    const est = String((f.estado || f.status || '').toString()).trim().toLowerCase();
                    if (est === 'pagada' || est === 'paid') pagadas++;
                    else if (est === 'pendiente' || est === 'pending') pendientes++;
                    else if (est === 'cancelada' || est === 'cancelled' || est === 'canceled') canceladas++;
                });

                if (pagadasEl) pagadasEl.textContent = String(pagadas);
                if (pendientesEl) pendientesEl.textContent = String(pendientes);
                if (canceladasEl) canceladasEl.textContent = String(canceladas);
            } catch (e) {
                console.warn('Error actualizando KPIs por estado:', e && e.message ? e.message : e);
                // Fallback a comportamiento original
                const kpiTotal = document.getElementById('kpiTotalFacturado');
                const total = facturas.reduce((sum, f) => sum + parseFloat(f.total || 0), 0);
                if (kpiTotal) kpiTotal.textContent = '$' + total.toLocaleString('es-CO');
            }
        };
    })();


// Ver detalle de factura
async function verDetalleFactura(facturaId) {
    let factura = null;

    try {
        const token = localStorage.getItem('marketworld_auth_token');
        if (token) {
            const response = await fetch(`http://127.0.0.1:8000/api/v1/invoices/${facturaId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            if (result && result.success && result.data) {
                factura = result.data;
            }
        }
    } catch (error) {
        console.warn('No se pudo obtener detalle por API, usando cache:', error.message || error);
    }

    if (!factura) {
        factura = facturasHistorialCache.find(function(f) {
            return String(f.id) === String(facturaId);
        });
    }

    if (!factura) {
        alert('Factura no encontrada');
        return;
    }

    const numeroFactura = factura.numero_factura || factura.numeroFactura || factura.numero || `FAC-${factura.id || ''}`;
    const fechaRaw = factura.fecha || factura.created_at || factura.fechaCreacion || new Date().toISOString();
    const fecha = new Date(fechaRaw).toLocaleDateString('es-CO');
    const estado = factura.estado || 'Pagada';
    const metodoPago = factura.metodo_pago || factura.metodoPago || '-';
    const vendedor = factura.seller?.name || factura.vendedor || 'Sistema';
    const clienteNombre = factura.customer?.nombre || factura.clienteNombre || (factura.customer_id ? `Cliente #${factura.customer_id}` : 'Venta General');
    const clienteDocumento = factura.customer?.documento || factura.clienteDocumento || '-';
    const subtotal = parseFloat(factura.subtotal || 0) || 0;
    const iva = parseFloat(factura.impuestos || factura.iva || 0) || 0;
    const total = parseFloat(factura.total || 0) || 0;
    const descuento = parseFloat(factura.descuento || 0) || 0;

    const items = Array.isArray(factura.items)
        ? factura.items
        : (Array.isArray(factura.detalles) ? factura.detalles : []);

    let itemsHTML = '';
    if (items.length === 0) {
        itemsHTML = '<tr><td colspan="5" class="text-center text-muted">No hay detalles de productos disponibles.</td></tr>';
    } else {
        items.forEach(function(item) {
            const nombre = item.producto?.nombre || item.nombre || item.product_name || `Producto #${item.product_id || ''}`;
            const cantidad = parseFloat(item.cantidad || item.quantity || 0) || 0;
            const precio = parseFloat(item.precio_unitario || item.precioUnitario || item.price || 0) || 0;
            const itemIva = parseFloat(item.iva || 19) || 19;
            const itemTotal = parseFloat(item.subtotal || (precio * cantidad)) || 0;

            itemsHTML += `
                <tr>
                    <td>${nombre}</td>
                    <td class="text-center">${cantidad}</td>
                    <td class="text-end">$${Math.round(precio).toLocaleString('es-CO')}</td>
                    <td class="text-center">${itemIva}% <small class="text-muted">(inc.)</small></td>
                    <td class="text-end">$${Math.round(itemTotal).toLocaleString('es-CO')}</td>
                </tr>
            `;
        });
    }

    const title = document.getElementById('modalDetalleTitle');
    const body = document.getElementById('modalDetalleBody');

    if (title) title.textContent = `Factura ${numeroFactura}`;
    if (body) {
        if (window.MarketWorld && MarketWorld.utils && typeof MarketWorld.utils.renderInvoiceHTML === 'function') {
            body.innerHTML = MarketWorld.utils.renderInvoiceHTML(factura);
        } else {
            // Fallback al HTML previo si no existe el renderer
            body.innerHTML = `
                <div class="row mb-3">
                    <div class="col-md-6">
                        <h6 class="text-muted">Datos del Cliente</h6>
                        <p class="mb-1"><strong>${clienteNombre}</strong></p>
                        <p class="mb-1">Documento: ${clienteDocumento}</p>
                    </div>
                    <div class="col-md-6 text-end">
                        <h6 class="text-muted">Datos de la Factura</h6>
                        <p class="mb-1"><strong>${numeroFactura}</strong></p>
                        <p class="mb-1">Fecha: ${fecha}</p>
                        <p class="mb-1">Estado: <span class="badge ${estado === 'Pagada' ? 'bg-success' : estado === 'Pendiente' ? 'bg-warning' : 'bg-danger'}">${estado}</span></p>
                        <p class="mb-0">Vendedor: ${vendedor}</p>
                    </div>
                </div>
                <hr>
                <table class="table table-sm">
                    <thead class="table-light">
                        <tr>
                            <th>Producto</th>
                            <th class="text-center">Cant.</th>
                            <th class="text-end">Precio</th>
                            <th class="text-center">IVA</th>
                            <th class="text-end">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHTML}</tbody>
                </table>
                <div class="row justify-content-end">
                    <div class="col-md-5">
                        <div class="d-flex justify-content-between mb-1">
                            <span>Subtotal:</span>
                            <strong>$${Math.round(subtotal).toLocaleString('es-CO')}</strong>
                        </div>
                        <div class="d-flex justify-content-between mb-1">
                            <span>IVA:</span>
                            <strong>$${Math.round(iva).toLocaleString('es-CO')}</strong>
                        </div>
                        ${descuento > 0 ? `
                        <div class="d-flex justify-content-between mb-1 text-danger">
                            <span>Descuento:</span>
                            <strong>-$${Math.round(descuento).toLocaleString('es-CO')}</strong>
                        </div>` : ''}
                        <hr>
                        <div class="d-flex justify-content-between">
                            <span class="fs-5 fw-bold">TOTAL:</span>
                            <span class="fs-5 fw-bold text-primary">$${Math.round(total).toLocaleString('es-CO')}</span>
                        </div>
                        <div class="mt-2 text-muted small">
                            Método de pago: ${metodoPago}
                        </div>
                    </div>
                </div>
            `;
        }
    }

    const modal = new bootstrap.Modal(document.getElementById('modalDetalleFactura'));
    modal.show();
}

// Anular factura
function anularFactura(facturaId) {
    const factura = MarketWorld.data.findInvoiceById(facturaId);
    if (!factura) return;
    
    if (!confirm(`¿Anular la factura ${factura.numeroFactura}?\n\nEsta acción devolverá el stock de los productos.`)) {
        return;
    }
    
    MarketWorld.data.updateInvoice(facturaId, { estado: 'Cancelada' });
    
    MarketWorld.data.createNotification({
        tipo: 'danger',
        titulo: 'Factura Anulada',
        mensaje: `Factura ${factura.numeroFactura} fue anulada`,
        enlace: 'facturacion.html'
    });
    
    cargarHistorial();
    alert(`Factura ${factura.numeroFactura} anulada. Stock devuelto.`);
}

// Imprimir factura
function imprimirFactura() {
    const contenido = document.getElementById('modalDetalleBody');
    if (!contenido) return;
    
    const ventana = window.open('', '_blank', 'width=800,height=600');
    ventana.document.write(`
        <html>
        <head>
            <title>Imprimir Factura</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
            <style>
                body { padding: 20px; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="text-center mb-4">
                <h2>MarketWorld</h2>
                <p class="text-muted">Sistema de Facturación</p>
            </div>
            ${contenido.innerHTML}
            <div class="text-center mt-4 no-print">
                <button onclick="window.print()" class="btn btn-primary">Imprimir</button>
            </div>
        </body>
        </html>
    `);
    ventana.document.close();
}

window.verDetalleFactura = verDetalleFactura;
window.imprimirFactura = imprimirFactura;

});
