
// --- Carrito de productos ---
let carrito = [];
let nextInvoiceId = 128;
let metodoPagoSeleccionado = 'efectivo';
const PRODUCTS_STORAGE_KEY = 'marketworld_products';
let facturasHistorialCache = [];
let deepLinkInvoiceRef = null;

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
    
    if (modoRapido && modoCompleto) {
        modoRapido.addEventListener('change', function() {
            if (this.checked) {
                contenidoRapido.style.display = 'block';
                contenidoCompleto.style.display = 'none';
                console.log('📱 Modo Rápido activado');
            }
        });
        
        modoCompleto.addEventListener('change', function() {
            if (this.checked) {
                contenidoRapido.style.display = 'none';
                contenidoCompleto.style.display = 'block';
                mostrarProductosDisponiblesCompleto();
                actualizarDatosFacturaCompleta();
                console.log('📄 Modo Completo activado');
            }
        });
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
            const token = localStorage.getItem('marketworld_auth_token');
            const url = `http://127.0.0.1:8000/api/v1/products?search=${encodeURIComponent(termino)}`;
            
            const response = await fetch(url, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            const result = await response.json();
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
                const token = localStorage.getItem('marketworld_auth_token');
                if (!token) throw new Error('No hay sesión activa.');

                const invoiceData = {
                    numero_factura: 'FAC-' + Date.now(),
                    customer_id: null,
                    fecha: new Date().toISOString().slice(0, 19).replace('T', ' '),
                    subtotal: subtotalBase,
                    impuestos: totalIVA,
                    total: total,
                    metodo_pago: metodoPagoSeleccionado,
                    estado: 'Pagada',
                    notas: observaciones,
                    items: invoiceItems
                };

                const response = await fetch('http://127.0.0.1:8000/api/v1/invoices', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(invoiceData)
                });

                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.message || 'Error al guardar en el servidor.');
                }

                const factura = result.data;
                console.log('📄 Factura generada por API:', factura);
                
                mostrarNotificacion(`✅ Factura ${factura.numero_factura} generada exitosamente`, 'success');
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
    function mostrarProductosDisponibles() {
        const container = document.getElementById('productosDisponibles');
        if (!container) return;
        
        container.innerHTML = '<h5 class="mb-3">🔥 Productos Más Vendidos</h5>';
        
        // Mostrar primero productos más recientes para reflejar altas nuevas.
        const productos = MarketWorld.data.getProducts();
        const productosActivos = productos.filter(p => p.activo);
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
                        <h6 class="card-title small mt-2 mb-1">${producto.nombre}</h6>
                        <p class="text-muted small mb-1">${producto.codigo}</p>
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
    window.agregarProductoRapido = function(id) {
        const producto = MarketWorld.data.findProductById(id);
        if (producto && producto.activo) {
            agregarAlCarrito(producto, 1);
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
        inputBuscar.addEventListener('input', function() {
            const termino = this.value.trim().toLowerCase();
            
            console.log(' Buscando:', termino);
            
            // Si hay menos de 2 caracteres, ocultar sugerencias
            if (termino.length < 2) {
                suggestionsContainer.style.display = 'none';
                suggestionsContainer.innerHTML = '';
                return;
            }
            
            // Buscar productos que coincidan
            const productos = MarketWorld.data.getProducts();
            const productosFiltrados = productos.filter(p => 
                p && p.activo && (
                    String(p.nombre || '').toLowerCase().includes(termino) ||
                    String(p.codigo || '').toLowerCase().includes(termino)
                )
            );
            
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
    function mostrarProductosDisponiblesCompleto() {
        const container = document.getElementById('productosDisponiblesCompleto');
        if (!container) return;

        container.innerHTML = '<h5 class="mb-3">🔥 Productos Más Vendidos</h5>';

        const productosActivos = getProductosActivos();
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
                        <h6 class="card-title small mt-2 mb-1">${producto.nombre}</h6>
                        <p class="text-muted small mb-1">${producto.codigo}</p>
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
                    activo: (apiProduct.estado || 'Activo') === 'Activo'
                };

                if (mapped.codigo) {
                    byCode.set(String(mapped.codigo).toLowerCase(), mapped);
                }
            });

            localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(Array.from(byCode.values())));
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
    
    // Cargar historial de facturas al iniciar
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
            const token = localStorage.getItem('marketworld_auth_token');
            const response = await fetch('http://127.0.0.1:8000/api/v1/invoices', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();
            
            if (!result.success) return;

            const facturas = Array.isArray(result.data) ? result.data : [];
            facturasHistorialCache = facturas;
            
            // Renderizar tabla
            tbody.innerHTML = '';
            
            if (facturas.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center">No hay facturas registradas</td></tr>`;
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
