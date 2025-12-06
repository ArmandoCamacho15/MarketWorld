/**
 * ===========================
 * FACTURACION.JS - VERSIÓN COMPLETA CON AUTOCOMPLETADO
 * ===========================
 */

// Carrito de productos
let carrito = [];
let nextInvoiceId = 128;
let metodoPagoSeleccionado = 'efectivo'; // ✅ CORREGIDO (era "metodoP seleccionado")

// Base de datos simulada de productos MÁS AMPLIA
const productosDB = [
    // ELECTRÓNICA
    { id: 1, sku: 'ELEC-1001', nombre: 'Laptop HP ProBook', precio: 1250000, stock: 15, iva: 19, categoria: 'Electrónica' },
    { id: 2, sku: 'ELEC-1002', nombre: 'Mouse Logitech', precio: 45000, stock: 25, iva: 19, categoria: 'Electrónica' },
    { id: 3, sku: 'ELEC-1003', nombre: 'Teclado Mecánico', precio: 120000, stock: 10, iva: 19, categoria: 'Electrónica' },
    { id: 4, sku: 'ELEC-1004', nombre: 'Monitor Samsung 24"', precio: 450000, stock: 8, iva: 19, categoria: 'Electrónica' },
    { id: 5, sku: 'ELEC-1005', nombre: 'Impresora Epson L3210', precio: 650000, stock: 5, iva: 19, categoria: 'Electrónica' },
    
    // ALIMENTOS
    { id: 6, sku: 'ALIM-2001', nombre: 'Arroz Diana 500g', precio: 3500, stock: 120, iva: 0, categoria: 'Alimentos' },
    { id: 7, sku: 'ALIM-2002', nombre: 'Aceite Girasol 1L', precio: 8500, stock: 80, iva: 0, categoria: 'Alimentos' },
    { id: 8, sku: 'ALIM-2003', nombre: 'Azúcar Blanca 1Kg', precio: 4200, stock: 150, iva: 0, categoria: 'Alimentos' },
    { id: 9, sku: 'ALIM-2004', nombre: 'Café Juan Valdez 250g', precio: 12500, stock: 60, iva: 0, categoria: 'Alimentos' },
    { id: 10, sku: 'ALIM-2005', nombre: 'Leche Entera 1L', precio: 3800, stock: 200, iva: 0, categoria: 'Alimentos' },
    
    // OFICINA
    { id: 11, sku: 'OFIC-3001', nombre: 'Cuaderno Universitario', precio: 5500, stock: 45, iva: 19, categoria: 'Oficina' },
    { id: 12, sku: 'OFIC-3002', nombre: 'Bolígrafos Pack x12', precio: 8000, stock: 30, iva: 19, categoria: 'Oficina' },
    { id: 13, sku: 'OFIC-3003', nombre: 'Carpeta Colgante x10', precio: 15000, stock: 20, iva: 19, categoria: 'Oficina' },
    { id: 14, sku: 'OFIC-3004', nombre: 'Resma Papel Carta', precio: 12000, stock: 50, iva: 19, categoria: 'Oficina' },
    { id: 15, sku: 'OFIC-3005', nombre: 'Calculadora Casio', precio: 35000, stock: 12, iva: 19, categoria: 'Oficina' }
];

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Sistema de facturación iniciado');
    
    // ===========================
    // CAMBIO ENTRE MODO RÁPIDO Y COMPLETO
    // ===========================
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
                console.log('📄 Modo Completo activado');
            }
        });
    }
    
    // ===========================
    // 1. MOSTRAR PRODUCTOS DISPONIBLES
    // ===========================
    mostrarProductosDisponibles();
    
    // ===========================
    // 2. BUSCAR Y AGREGAR PRODUCTOS
    // ===========================
    const btnBuscarProducto = document.getElementById('btnBuscarProducto');
    const inputBuscarProducto = document.getElementById('buscarProducto');
    const inputCantidadProducto = document.getElementById('cantidadProducto');
    
    if (btnBuscarProducto) {
        btnBuscarProducto.addEventListener('click', function() {
            console.log('🔍 Botón buscar clickeado');
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
            alert('⚠️ Por favor ingresa un SKU o nombre de producto');
            return;
        }
        
        // Buscar producto
        const producto = productosDB.find(p => 
            p.sku.toLowerCase().includes(termino) || 
            p.nombre.toLowerCase().includes(termino)
        );
        
        if (!producto) {
            alert('❌ Producto no encontrado. Intenta con:\n- ELEC-1001 (Laptop)\n- ALIM-2001 (Arroz)\n- OFIC-3001 (Cuaderno)');
            return;
        }
        
        if (cantidad > producto.stock) {
            alert(`⚠️ Stock insuficiente. Solo hay ${producto.stock} unidades disponibles.`);
            return;
        }
        
        // Agregar al carrito
        agregarAlCarrito(producto, cantidad);
        
        // Limpiar campos
        inputBuscarProducto.value = '';
        inputCantidadProducto.value = 1;
        inputBuscarProducto.focus();
        
        console.log('✅ Producto agregado:', producto.nombre);
    }
    
    // ===========================
    // 3. AGREGAR PRODUCTO AL CARRITO
    // ===========================
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
            carrito.push({
                id: producto.id,
                sku: producto.sku,
                nombre: producto.nombre,
                precio: producto.precio,
                cantidad: cantidad,
                iva: producto.iva,
                stock: producto.stock
            });
            console.log('➕ Nuevo producto en carrito:', producto.nombre);
        }
        
        renderizarCarrito();
        calcularTotales();
        mostrarNotificacion(`✅ ${producto.nombre} agregado al carrito`, 'success');
    }
    
    // ===========================
    // 4. RENDERIZAR CARRITO
    // ===========================
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
            const subtotal = item.precio * item.cantidad;
            const tr = document.createElement('tr');
            
            tr.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <i class="bi bi-box-seam me-2 text-primary fs-5"></i>
                        <div>
                            <div class="fw-bold">${item.nombre}</div>
                            <div class="text-muted small">SKU: ${item.sku}</div>
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
                <td>${item.iva}%</td>
                <td class="fw-bold text-primary">$${subtotal.toLocaleString('es-CO')}</td>
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
    
    // ===========================
    // 5. CAMBIAR CANTIDAD
    // ===========================
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
    
    // ===========================
    // 6. ACTUALIZAR CANTIDAD
    // ===========================
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
    
    // ===========================
    // 7. ELIMINAR DEL CARRITO
    // ===========================
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
    
    // ===========================
    // 8. CALCULAR TOTALES
    // ===========================
    function calcularTotales() {
        let subtotal = 0;
        let totalIVA = 0;
        
        carrito.forEach(item => {
            const itemSubtotal = item.precio * item.cantidad;
            subtotal += itemSubtotal;
            
            if (item.iva > 0) {
                totalIVA += itemSubtotal * (item.iva / 100);
            }
        });
        
        const descuento = parseFloat(document.getElementById('descuentoInput')?.value || 0);
        const total = subtotal + totalIVA - descuento;
        
        document.getElementById('subtotalFactura').textContent = `$${subtotal.toLocaleString('es-CO')}`;
        document.getElementById('ivaFactura').textContent = `$${totalIVA.toLocaleString('es-CO')}`;
        document.getElementById('totalFactura').textContent = `$${total.toLocaleString('es-CO')}`;
        
        console.log('💰 Totales calculados - Subtotal:', subtotal, 'IVA:', totalIVA, 'Total:', total);
    }
    
    // ===========================
    // 9. APLICAR DESCUENTO
    // ===========================
    const inputDescuento = document.getElementById('descuentoInput');
    if (inputDescuento) {
        inputDescuento.addEventListener('input', calcularTotales);
    }
    
    // ===========================
    // 10. VACIAR CARRITO
    // ===========================
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
    
    // ===========================
    // 11. GENERAR FACTURA
    // ===========================
    const btnGenerarFactura = document.getElementById('btnGenerarFactura');
    if (btnGenerarFactura) {
        btnGenerarFactura.addEventListener('click', function() {
            if (carrito.length === 0) {
                alert('⚠️ Agrega productos al carrito para generar la factura');
                return;
            }
            
            const clienteNombre = document.getElementById('clienteNombre')?.value;
            const clienteDocumento = document.getElementById('clienteDocumento')?.value;
            
            if (!clienteNombre || !clienteDocumento) {
                alert('⚠️ Por favor completa los datos del cliente');
                return;
            }
            
            let subtotal = 0;
            let totalIVA = 0;
            
            carrito.forEach(item => {
                const itemSubtotal = item.precio * item.cantidad;
                subtotal += itemSubtotal;
                if (item.iva > 0) {
                    totalIVA += itemSubtotal * (item.iva / 100);
                }
            });
            
            const descuento = parseFloat(document.getElementById('descuentoInput')?.value || 0);
            const total = subtotal + totalIVA - descuento;
            
            const factura = {
                numero: `FAC-2025-${String(nextInvoiceId).padStart(5, '0')}`,
                fecha: new Date().toLocaleDateString('es-CO'),
                cliente: { nombre: clienteNombre, documento: clienteDocumento },
                productos: [...carrito],
                metodoPago: metodoPagoSeleccionado,
                subtotal, iva: totalIVA, descuento, total
            };
            
            nextInvoiceId++;
            
            console.log('📄 Factura generada:', factura);
            
            mostrarNotificacion(`✅ Factura ${factura.numero} generada exitosamente`, 'success');
            
            alert(`✅ Factura ${factura.numero} generada exitosamente\n\nMétodo de pago: ${metodoPagoSeleccionado}\nTotal: $${total.toLocaleString('es-CO')}`);
            
            carrito = [];
            renderizarCarrito();
            calcularTotales();
            document.getElementById('clienteNombre').value = '';
            document.getElementById('clienteDocumento').value = '';
        });
    }
    
    // ===========================
    // 12. MOSTRAR PRODUCTOS DISPONIBLES
    // ===========================
    function mostrarProductosDisponibles() {
        const container = document.getElementById('productosDisponibles');
        if (!container) return;
        
        container.innerHTML = '<h5 class="mb-3">🔥 Productos Más Vendidos</h5>';
        
        // Mostrar los primeros 6 productos
        const productosDestacados = productosDB.slice(0, 6);
        
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
                        <p class="text-muted small mb-1">${producto.sku}</p>
                        <p class="fw-bold text-primary mb-1">$${producto.precio.toLocaleString('es-CO')}</p>
                        <span class="badge ${producto.stock > 20 ? 'bg-success' : 'bg-warning'} small">Stock: ${producto.stock}</span>
                    </div>
                </div>
            `;
            
            grid.appendChild(col);
        });
        
        container.appendChild(grid);
    }
    
    // ===========================
    // 13. AGREGAR PRODUCTO RÁPIDO
    // ===========================
    window.agregarProductoRapido = function(id) {
        const producto = productosDB.find(p => p.id === id);
        if (producto) {
            agregarAlCarrito(producto, 1);
        }
    };
    
    // ===========================
    // 14. NOTIFICACIONES
    // ===========================
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
    
    // ===========================
    // AUTOCOMPLETADO DE PRODUCTOS (NUEVO)
    // ===========================
    const inputBuscar = document.getElementById('buscarProducto');
    const suggestionsContainer = document.getElementById('suggestions');
    
    if (inputBuscar && suggestionsContainer) {
        // Escuchar cada tecla presionada
        inputBuscar.addEventListener('input', function() {
            const termino = this.value.trim().toLowerCase();
            
            console.log('🔍 Buscando:', termino);
            
            // Si hay menos de 3 caracteres, ocultar sugerencias
            if (termino.length < 3) {
                suggestionsContainer.style.display = 'none';
                suggestionsContainer.innerHTML = '';
                return;
            }
            
            // Buscar productos que coincidan
            const productosFiltrados = productosDB.filter(p => 
                p.nombre.toLowerCase().includes(termino) ||
                p.sku.toLowerCase().includes(termino)
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
                const skuResaltado = resaltarTexto(producto.sku, termino);
                
                suggestionItem.innerHTML = `
                    <div class="suggestion-name">${nombreResaltado}</div>
                    <div class="suggestion-details">
                        <span class="suggestion-sku">SKU: ${skuResaltado}</span>
                        <span class="suggestion-price">$${producto.precio.toLocaleString('es-CO')}</span>
                        <span class="suggestion-stock ${producto.stock <= 5 ? 'low' : ''}">
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
    
    // ===========================
    // MÉTODOS DE PAGO
    // ===========================
    const paymentButtons = document.querySelectorAll('.payment-method');
    
    paymentButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remover clase active de todos
            paymentButtons.forEach(btn => btn.classList.remove('active'));
            
            // Agregar clase active al clickeado
            this.classList.add('active');
            
            // Guardar método seleccionado
            metodoPagoSeleccionado = this.getAttribute('data-method');
            
            console.log('💳 Método de pago seleccionado:', metodoPagoSeleccionado);
        });
    });
    
    // ===========================
    // INICIALIZACIÓN
    // ===========================
    renderizarCarrito();
    calcularTotales();
    
    console.log('✅ Sistema de facturación listo. Productos disponibles:', productosDB.length);
});

// ===========================
// FUNCIÓN PARA RESALTAR TEXTO (NUEVA)
// ===========================
function resaltarTexto(texto, busqueda) {
    const regex = new RegExp(`(${busqueda})`, 'gi');
    return texto.replace(regex, '<span class="highlight">$1</span>');
}
