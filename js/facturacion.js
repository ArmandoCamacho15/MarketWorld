
// --- Carrito de productos ---
let carrito = [];
let nextInvoiceId = 128;
let metodoPagoSeleccionado = 'efectivo';

document.addEventListener('DOMContentLoaded', function() {
    console.log(' Sistema de facturación iniciado');
    
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
    const inputBuscarProducto = document.getElementById('buscarProducto');
    const inputCantidadProducto = document.getElementById('cantidadProducto');
    
    if (btnBuscarProducto) {
        btnBuscarProducto.addEventListener('click', function() {
            console.log(' Botón buscar clickeado');
            buscarYAgregarProducto();
        });
    }
    
    if (inputBuscarProducto) {
        inputBuscarProducto.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                console.log('⌨️ Enter presionado');
                buscarYAgregarProducto();
            }
        });
    }
    
    function buscarYAgregarProducto() {
        const termino = inputBuscarProducto.value.trim().toLowerCase();
        const cantidad = parseInt(inputCantidadProducto.value) || 1;
        
        console.log('📦 Buscando:', termino, '| Cantidad:', cantidad);
        
        if (!termino) {
            alert('⚠️ Por favor ingresa un código o nombre de producto');
            return;
        }
        
        // ======= BUSCAR PRODUCTO EN BASE DE DATOS =======
        const productos = MarketWorld.data.getProducts();
        const producto = productos.find(p => 
            p.codigo.toLowerCase().includes(termino) || 
            p.nombre.toLowerCase().includes(termino)
        );
        
        if (!producto) {
            alert('❌ Producto no encontrado. Verifica el código o nombre del producto.');
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
        
        // ======= AGREGAR AL CARRITO =======
        agregarAlCarrito(producto, cantidad);
        
        // ======= LIMPIAR CAMPOS =======
        inputBuscarProducto.value = '';
        inputCantidadProducto.value = 1;
        inputBuscarProducto.focus();
        
        console.log(' Producto agregado:', producto.nombre);
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
        btnGenerarFactura.addEventListener('click', function() {
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
            
            const items = carrito.map(item => {
                const itemTotal = item.precio * item.cantidad;
                const itemBase = Math.round(itemTotal / 1.19);
                const itemIVA = itemTotal - itemBase;
                totalConIVA += itemTotal;
                subtotalBase += itemBase;
                totalIVA += itemIVA;
                
                return {
                    productoId: item.id,
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precioUnitario: item.precio,
                    subtotal: itemTotal,
                    iva: item.iva
                };
            });
            
            const descuentoPct = parseFloat(document.getElementById('descuentoInput')?.value || 0);
            const descuentoMonto = totalConIVA * (descuentoPct / 100);
            const total = totalConIVA - descuentoMonto;
            
            // ======= OBTENER USUARIO ACTUAL =======
            const currentUser = MarketWorld.data.getCurrentUser();
            
            // Obtener observaciones del modo completo
            const observacionesEl = document.getElementById('observacionesFactura');
            const observaciones = observacionesEl ? observacionesEl.value.trim() : '';
            
            try {
                // Crear factura en la base de datos
                const factura = MarketWorld.data.createInvoice({
                    clienteNombre: clienteNombre,
                    clienteDocumento: clienteDocumento,
                    clienteId: null,
                    items: items,
                    subtotal: subtotalBase,
                    iva: totalIVA,
                    descuento: descuentoMonto,
                    total: total,
                    metodoPago: metodoPagoSeleccionado,
                    estado: 'Pagada',
                    observaciones: observaciones,
                    vendedor: currentUser ? currentUser.nombre : 'Sistema'
                });
                
                console.log('📄 Factura generada:', factura);
                
                // Crear notificación de factura generada
                MarketWorld.data.createNotification({
                    tipo: 'success',
                    titulo: 'Factura Generada',
                    mensaje: `Factura ${factura.numeroFactura} creada - Total: $${total.toLocaleString('es-CO')}`,
                    enlace: 'facturacion.html'
                });
                
                // Verificar productos con bajo stock
                items.forEach(item => {
                    const producto = MarketWorld.data.findProductById(item.productoId);
                    if (producto && producto.stock <= producto.stockMinimo) {
                        MarketWorld.data.createNotification({
                            tipo: 'warning',
                            titulo: 'Stock Bajo',
                            mensaje: `${producto.nombre} tiene stock bajo (${producto.stock} unidades)`,
                            enlace: 'inventario.html'
                        });
                    }
                });
                
                // Actualizar badge de notificaciones
                if (typeof MarketWorld.notifications !== 'undefined' && MarketWorld.notifications.updateBadge) {
                    MarketWorld.notifications.updateBadge();
                }
                
                mostrarNotificacion(`✅ Factura ${factura.numeroFactura} generada exitosamente`, 'success');
                
                alert(`✅ Factura ${factura.numeroFactura} generada\n\nCliente: ${clienteNombre}\nMétodo de pago: ${metodoPagoSeleccionado}\nTotal: $${total.toLocaleString('es-CO')}\n\n¡Stock actualizado automáticamente!`);
                
                // Limpiar formulario
                carrito = [];
                renderizarCarrito();
                calcularTotales();
                
                // Limpiar campos de cliente (ambos modos)
                if (clienteNombreRapido) clienteNombreRapido.value = '';
                if (clienteDocumentoRapido) clienteDocumentoRapido.value = '';
                if (clienteNombreCompleto) clienteNombreCompleto.value = '';
                if (clienteDocumentoCompleto) clienteDocumentoCompleto.value = '';
                
                // Limpiar campos adicionales del modo completo
                const direccionEl = document.getElementById('clienteDireccion');
                const telefonoEl = document.getElementById('clienteTelefono');
                const emailEl = document.getElementById('clienteEmail');
                const ciudadEl = document.getElementById('clienteCiudad');
                if (observacionesEl) observacionesEl.value = '';
                if (direccionEl) direccionEl.value = '';
                if (telefonoEl) telefonoEl.value = '';
                if (emailEl) emailEl.value = '';
                if (ciudadEl) ciudadEl.value = '';
                
                const descuentoInput = document.getElementById('descuentoInput');
                if (descuentoInput) {
                    descuentoInput.value = 0;
                }
                
                // Actualizar productos mostrados (ambos modos)
                mostrarProductosDisponibles();
                mostrarProductosDisponiblesCompleto();
                actualizarDatosFacturaCompleta();
                
                // Actualizar historial
                cargarHistorial();
                
            } catch (error) {
                console.error('Error al generar factura:', error);
                alert(`❌ Error al generar factura: ${error.message}`);
            }
        });
    }
    
    // Mostrar productos
    function mostrarProductosDisponibles() {
        const container = document.getElementById('productosDisponibles');
        if (!container) return;
        
        container.innerHTML = '<h5 class="mb-3">🔥 Productos Más Vendidos</h5>';
        
        // Obtener productos activos y mostrar los primeros 6
        const productos = MarketWorld.data.getProducts();
        const productosActivos = productos.filter(p => p.activo);
        const productosDestacados = productosActivos.slice(0, 6);
        
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
                p.activo && (
                    p.nombre.toLowerCase().includes(termino) ||
                    p.codigo.toLowerCase().includes(termino)
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
                
                // Al hacer clic, agregar al carrito
                suggestionItem.addEventListener('click', function() {
                    agregarAlCarrito(producto, 1);
                    inputBuscar.value = '';
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

    if (btnBuscarCompleto) {
        btnBuscarCompleto.addEventListener('click', buscarYAgregarProductoCompleto);
    }
    if (inputBuscarCompleto) {
        inputBuscarCompleto.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarYAgregarProductoCompleto();
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
                p.activo && (
                    p.nombre.toLowerCase().includes(termino) ||
                    p.codigo.toLowerCase().includes(termino)
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
                    agregarAlCarrito(producto, 1);
                    inputBuscarCompleto.value = '';
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

        const productos = MarketWorld.data.getProducts();
        const productosActivos = productos.filter(p => p.activo);
        const productosDestacados = productosActivos.slice(0, 6);

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
    
    // Historial de facturas
    cargarHistorial();
    
    // Botón filtrar historial
    const btnFiltrar = document.getElementById('btnFiltrarHistorial');
    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', cargarHistorial);
    }
    
    // Escuchar cambio en pestaña historial para refrescar
    const historyTab = document.querySelector('a[href="#history"], button[data-bs-target="#history"]');
    if (historyTab) {
        historyTab.addEventListener('click', function() {
            setTimeout(cargarHistorial, 100);
        });
    }
    
    // Init
    renderizarCarrito();
    calcularTotales();
    
    const productos = MarketWorld.data.getProducts();
    console.log(' Sistema de facturación listo. Productos disponibles:', productos.length);
});

// Resaltar texto
function resaltarTexto(texto, busqueda) {
    const regex = new RegExp(`(${busqueda})`, 'gi');
    return texto.replace(regex, '<span class="highlight">$1</span>');
}

// Cargar historial de facturas
function cargarHistorial() {
    const tbody = document.getElementById('tablaHistorial');
    const sinFacturas = document.getElementById('sinFacturas');
    if (!tbody) return;
    
    // Obtener facturas
    let facturas = MarketWorld.data.getInvoices();
    
    // Aplicar filtros
    const filtroEstado = document.getElementById('filtroEstado')?.value;
    const filtroCliente = document.getElementById('filtroCliente')?.value?.trim().toLowerCase();
    const filtroFechaInicio = document.getElementById('filtroFechaInicio')?.value;
    const filtroFechaFin = document.getElementById('filtroFechaFin')?.value;
    
    if (filtroEstado && filtroEstado !== 'todos') {
        facturas = facturas.filter(f => f.estado === filtroEstado);
    }
    
    if (filtroCliente) {
        facturas = facturas.filter(f => 
            f.clienteNombre.toLowerCase().includes(filtroCliente) ||
            f.clienteDocumento.toLowerCase().includes(filtroCliente)
        );
    }
    
    if (filtroFechaInicio) {
        facturas = facturas.filter(f => f.fechaCreacion.split('T')[0] >= filtroFechaInicio);
    }
    
    if (filtroFechaFin) {
        facturas = facturas.filter(f => f.fechaCreacion.split('T')[0] <= filtroFechaFin);
    }
    
    // Ordenar por fecha más reciente
    facturas.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
    
    // Actualizar KPIs
    actualizarKPIs();
    
    // Renderizar tabla
    tbody.innerHTML = '';
    
    if (facturas.length === 0) {
        if (sinFacturas) sinFacturas.style.display = 'block';
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4 text-muted">
                    <i class="bi bi-receipt-cutoff fs-1"></i>
                    <p class="mt-2">No se encontraron facturas</p>
                </td>
            </tr>
        `;
        return;
    }
    
    if (sinFacturas) sinFacturas.style.display = 'none';
    
    facturas.forEach(factura => {
        const fecha = new Date(factura.fechaCreacion);
        const fechaStr = fecha.toLocaleDateString('es-CO');
        
        // Iconos de método de pago
        const metodoPagoIconos = {
            'efectivo': '<i class="bi bi-cash-coin me-1"></i> Efectivo',
            'tarjeta': '<i class="bi bi-credit-card me-1"></i> Tarjeta',
            'transferencia': '<i class="bi bi-bank me-1"></i> Transferencia'
        };
        
        // Colores de estado
        const estadoClases = {
            'Pagada': 'bg-success',
            'Pendiente': 'bg-warning text-dark',
            'Cancelada': 'bg-danger'
        };
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${factura.numeroFactura}</strong></td>
            <td>${fechaStr}</td>
            <td>
                <div>${factura.clienteNombre}</div>
                <div class="text-muted small">${factura.clienteDocumento}</div>
            </td>
            <td class="fw-bold">$${Math.round(factura.total).toLocaleString('es-CO')}</td>
            <td><span class="badge ${estadoClases[factura.estado] || 'bg-secondary'}">${factura.estado}</span></td>
            <td>${metodoPagoIconos[factura.metodoPago] || factura.metodoPago}</td>
            <td>${factura.vendedor || '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary me-1" title="Ver detalle" onclick="verDetalleFactura(${factura.id})">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary me-1" title="Imprimir" onclick="verDetalleFactura(${factura.id}); setTimeout(imprimirFactura, 500);">
                    <i class="bi bi-printer"></i>
                </button>
                ${factura.estado !== 'Cancelada' ? `
                <button class="btn btn-sm btn-outline-danger" title="Anular factura" onclick="anularFactura(${factura.id})">
                    <i class="bi bi-x-circle"></i>
                </button>` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Actualizar KPIs del historial
function actualizarKPIs() {
    const facturas = MarketWorld.data.getInvoices();
    
    const totalFacturado = facturas.reduce((sum, f) => sum + (f.total || 0), 0);
    const pagadas = facturas.filter(f => f.estado === 'Pagada').length;
    const pendientes = facturas.filter(f => f.estado === 'Pendiente').length;
    const canceladas = facturas.filter(f => f.estado === 'Cancelada').length;
    
    const kpiTotal = document.getElementById('kpiTotalFacturado');
    const kpiPagadas = document.getElementById('kpiFacturasPagadas');
    const kpiPendientes = document.getElementById('kpiFacturasPendientes');
    const kpiCanceladas = document.getElementById('kpiFacturasCanceladas');
    
    if (kpiTotal) kpiTotal.textContent = '$' + Math.round(totalFacturado).toLocaleString('es-CO');
    if (kpiPagadas) kpiPagadas.textContent = pagadas;
    if (kpiPendientes) kpiPendientes.textContent = pendientes;
    if (kpiCanceladas) kpiCanceladas.textContent = canceladas;
}

// Ver detalle de factura
function verDetalleFactura(facturaId) {
    const factura = MarketWorld.data.findInvoiceById(facturaId);
    if (!factura) {
        alert('Factura no encontrada');
        return;
    }
    
    const fecha = new Date(factura.fechaCreacion).toLocaleDateString('es-CO');
    
    let itemsHTML = '';
    factura.items.forEach(item => {
        const itemTotal = item.precioUnitario * item.cantidad;
        itemsHTML += `
            <tr>
                <td>${item.nombre}</td>
                <td class="text-center">${item.cantidad}</td>
                <td class="text-end">$${item.precioUnitario.toLocaleString('es-CO')}</td>
                <td class="text-center">${item.iva}% <small class="text-muted">(inc.)</small></td>
                <td class="text-end">$${Math.round(itemTotal).toLocaleString('es-CO')}</td>
            </tr>
        `;
    });
    
    const descuento = factura.descuento || 0;
    
    const title = document.getElementById('modalDetalleTitle');
    const body = document.getElementById('modalDetalleBody');
    
    if (title) title.textContent = `Factura ${factura.numeroFactura}`;
    if (body) {
        body.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <h6 class="text-muted">Datos del Cliente</h6>
                    <p class="mb-1"><strong>${factura.clienteNombre}</strong></p>
                    <p class="mb-1">Documento: ${factura.clienteDocumento}</p>
                </div>
                <div class="col-md-6 text-end">
                    <h6 class="text-muted">Datos de la Factura</h6>
                    <p class="mb-1"><strong>${factura.numeroFactura}</strong></p>
                    <p class="mb-1">Fecha: ${fecha}</p>
                    <p class="mb-1">Estado: <span class="badge ${factura.estado === 'Pagada' ? 'bg-success' : factura.estado === 'Pendiente' ? 'bg-warning' : 'bg-danger'}">${factura.estado}</span></p>
                    <p class="mb-0">Vendedor: ${factura.vendedor || '-'}</p>
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
                        <strong>$${Math.round(factura.subtotal).toLocaleString('es-CO')}</strong>
                    </div>
                    <div class="d-flex justify-content-between mb-1">
                        <span>IVA:</span>
                        <strong>$${Math.round(factura.iva).toLocaleString('es-CO')}</strong>
                    </div>
                    ${descuento > 0 ? `
                    <div class="d-flex justify-content-between mb-1 text-danger">
                        <span>Descuento:</span>
                        <strong>-$${Math.round(descuento).toLocaleString('es-CO')}</strong>
                    </div>` : ''}
                    <hr>
                    <div class="d-flex justify-content-between">
                        <span class="fs-5 fw-bold">TOTAL:</span>
                        <span class="fs-5 fw-bold text-primary">$${Math.round(factura.total).toLocaleString('es-CO')}</span>
                    </div>
                    <div class="mt-2 text-muted small">
                        Método de pago: ${factura.metodoPago}
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
