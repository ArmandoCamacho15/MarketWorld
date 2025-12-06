
(function() {
    'use strict';

    // ===========================
    // VARIABLES GLOBALES
    // ===========================
    // base de datos de productos
    let productos = [
        {
            id: 1,
            sku: 'ELEC-1001',
            nombre: 'Laptop HP ProBook',
            categoria: 'Electrónica',
            precio: 1250000,
            stock: 15,
            minStock: 5,
            imagen: 'laptop.jpg'
        },
        {
            id: 2,
            sku: 'ALIM-2001',
            nombre: 'Arroz Diana 500g',
            categoria: 'Alimentos',
            precio: 3500,
            stock: 120,
            minStock: 50,
            imagen: 'arroz.jpg'
        },
        {
            id: 3,
            sku: 'ELEC-1002',
            nombre: 'Mouse Logitech',
            categoria: 'Electrónica',
            precio: 45000,
            stock: 3,
            minStock: 10,
            imagen: 'mouse.jpg'
        }
    ];

    let nextId = 4; // ID para nuevos productos

    document.addEventListener('DOMContentLoaded', () => {
        console.log('Módulo Inventario Profesional cargado');
        
        // Inicializar
        initSearchAndFilters();
        initCharts();
        initBarcodeScanner();
        initProductForm();
        checkLowStock();
        cargarProductos();
    });

    // Búsqueda avanzada con debounce
    function initSearchAndFilters() {
        const searchInput = document.getElementById('searchProduct');
        const btnApplyFilters = document.getElementById('btnApplyFilters');
        
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                const query = e.target.value.trim();
                if (query.length > 2) {
                    console.log('Buscando producto:', query);
                    
                }
            }, 300));
        }
        
        if (btnApplyFilters) {
            btnApplyFilters.addEventListener('click', applyAdvancedFilters);
        }
    }

    function applyAdvancedFilters() {
        const category = document.getElementById('filterCategory').value;
        const stock = document.getElementById('filterStock').value;
        const price = document.getElementById('filterPrice').value;
        
        console.log('Aplicando filtros:', { category, stock, price });
        
    }

    // Inicializar gráficos con Chart.js
    function initCharts() {
        // Gráfico de rotación de inventario
        const rotationCtx = document.getElementById('rotationChart');
        if (rotationCtx && typeof Chart !== 'undefined') {
            new Chart(rotationCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Alta Rotación', 'Media Rotación', 'Baja Rotación'],
                    datasets: [{
                        data: [45, 35, 20],
                        backgroundColor: ['#2ecc71', '#f39c12', '#e74c3c']
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }

        // Gráfico de valorización
        const valuationCtx = document.getElementById('valuationChart');
        if (valuationCtx && typeof Chart !== 'undefined') {
            new Chart(valuationCtx, {
                type: 'bar',
                data: {
                    labels: ['Electrónicos', 'Alimentos', 'Oficina', 'Hogar'],
                    datasets: [{
                        label: 'Valor en Inventario',
                        data: [185450, 75200, 42800, 38500],
                        backgroundColor: '#0d6ef0'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
        }

        // Gráfico de movimientos
        const movementsCtx = document.getElementById('movementsChart');
        if (movementsCtx && typeof Chart !== 'undefined') {
            new Chart(movementsCtx, {
                type: 'line',
                data: {
                    labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
                    datasets: [
                        {
                            label: 'Entradas',
                            data: [320, 285, 410, 390],
                            borderColor: '#2ecc71',
                            backgroundColor: 'rgba(46, 204, 113, 0.1)',
                            fill: true
                        },
                        {
                            label: 'Salidas',
                            data: [280, 310, 350, 375],
                            borderColor: '#e74c3c',
                            backgroundColor: 'rgba(231, 76, 60, 0.1)',
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    }
                }
            });
        }
    }

    // Simulador de escáner de código de barras
    function initBarcodeScanner() {
        let barcodeBuffer = '';
        let lastKeyTime = Date.now();

        document.addEventListener('keypress', (e) => {
            const currentTime = Date.now();
            
            // Si pasan más de 50ms entre teclas, resetear buffer
            if (currentTime - lastKeyTime > 50) {
                barcodeBuffer = '';
            }
            
            lastKeyTime = currentTime;
            
            if (e.key === 'Enter' && barcodeBuffer.length >= 8) {
                console.log('Código de barras escaneado:', barcodeBuffer);
                searchProductByBarcode(barcodeBuffer);
                barcodeBuffer = '';
            } else if (e.key !== 'Enter') {
                barcodeBuffer += e.key;
            }
        });
    }

    function searchProductByBarcode(barcode) {
        console.log('Buscando producto con código:', barcode);
        
        alert(`Buscando producto con código: ${barcode}`);
    }

    // Formulario de productos
    function initProductForm() {
        const btnSaveProduct = document.getElementById('btnSaveProduct');
        
        if (btnSaveProduct) {
            btnSaveProduct.addEventListener('click', saveProduct);
        }

        // Select all checkbox
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('.row-select');
                checkboxes.forEach(cb => cb.checked = e.target.checked);
            });
        }
    }

    function saveProduct() {
        const formData = {
            name: document.getElementById('productName').value,
            sku: document.getElementById('productSKU').value,
            category: document.getElementById('productCategory').value,
            barcode: document.getElementById('productBarcode').value,
            purchasePrice: document.getElementById('productPurchasePrice').value,
            salePrice: document.getElementById('productSalePrice').value,
            stock: document.getElementById('productStock').value,
            minStock: document.getElementById('productMinStock').value,
            location: document.getElementById('productLocation').value,
            description: document.getElementById('productDescription').value
        };

        console.log('Guardando producto:', formData);
        

        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
        if (modal) modal.hide();

        alert('Producto guardado exitosamente');
    }

    // Alertas de stock bajo
    function checkLowStock() {
        const stockCells = document.querySelectorAll('.stock-low');
        if (stockCells.length > 0) {
            console.warn(`⚠️ ${stockCells.length} productos con stock bajo`);
        }
    }

    // Cargar productos en la tabla
    function cargarProductos(listaProductos = productos) {
        const tbody = document.querySelector('.product-table tbody');
        
        if (!tbody) return;
        
        // Limpiar tabla
        tbody.innerHTML = '';
        
        // Verificar si hay productos
        if (listaProductos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <i class="bi bi-inbox fs-1 text-muted"></i>
                        <p class="text-muted mt-2">No se encontraron productos</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Agregar productos a la tabla
        listaProductos.forEach(producto => {
            const tr = document.createElement('tr');
            
            // Determinar color de stock
            const stockClass = producto.stock <= producto.minStock ? 'stock-low' : 'stock-ok';
            const stockIcon = producto.stock <= producto.minStock ? 'bi-exclamation-triangle-fill' : 'bi-check-circle-fill';
            
            tr.innerHTML = `
                <td>
                    <div class="product-img">
                        <i class="bi bi-box-seam fs-4"></i>
                    </div>
                </td>
                <td>
                    <div class="fw-bold">${producto.nombre}</div>
                    <div class="text-muted small">SKU: ${producto.sku}</div>
                </td>
                <td>
                    <span class="badge bg-primary">${producto.categoria}</span>
                </td>
                <td>$${producto.precio.toLocaleString('es-CO')}</td>
                <td>
                    <div class="d-flex align-items-center ${stockClass}">
                        <i class="bi ${stockIcon} me-2"></i>
                        ${producto.stock}
                    </div>
                </td>
                <td>${producto.minStock}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-primary" onclick="verDetalle(${producto.id})" title="Ver detalle">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="editarProducto(${producto.id})" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="eliminarProducto(${producto.id})" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(tr);
        });
        
        // Actualizar contador
        actualizarContadores();
    }

    // ===========================
    // FUNCIONES AUXILIARES
    // ===========================

    function verDetalle(id) {
        const producto = productos.find(p => p.id === id);
        
        if (!producto) return;
        
        alert(`
Detalle del Producto:
━━━━━━━━━━━━━━━━━━━━━
SKU: ${producto.sku}
Nombre: ${producto.nombre}
Categoría: ${producto.categoria}
Precio: $${producto.precio.toLocaleString('es-CO')}
Stock: ${producto.stock} unidades
Stock Mínimo: ${producto.minStock} unidades
Estado: ${producto.stock <= producto.minStock ? '⚠️ STOCK BAJO' : '✅ Stock suficiente'}
        `);
    }

    function editarProducto(id) {
        const producto = productos.find(p => p.id === id);
        
        if (!producto) return;
        
        // Llenar formulario con datos del producto
        document.getElementById('productSKU').value = producto.sku;
        document.getElementById('productName').value = producto.nombre;
        document.getElementById('productCategory').value = producto.categoria;
        document.getElementById('productPrice').value = producto.precio;
        document.getElementById('productStock').value = producto.stock;
        document.getElementById('productMinStock').value = producto.minStock;
        
        // Cambiar título del modal
        const modalTitle = document.querySelector('#productModal .modal-title');
        if (modalTitle) modalTitle.textContent = 'Editar Producto';
        
        // Guardar ID para edición
        const form = document.getElementById('productForm');
        if (form) form.setAttribute('data-edit-id', id);
        
        // Abrir modal
        const productModal = document.getElementById('productModal');
        if (productModal) {
            const modal = new bootstrap.Modal(productModal);
            modal.show();
        }
    }

    function eliminarProducto(id) {
        const producto = productos.find(p => p.id === id);
        
        if (!producto) return;
        
        // Confirmar eliminación
        const confirmar = confirm(`¿Estás seguro de eliminar el producto?\n\n${producto.nombre} (${producto.sku})\n\nEsta acción no se puede deshacer.`);
        
        if (confirmar) {
            // Eliminar producto del array
            productos = productos.filter(p => p.id !== id);
            
            // Recargar tabla
            cargarProductos();
            
            // Mostrar notificación
            mostrarNotificacion('Producto eliminado exitosamente', 'success');
        }
    }

    function limpiarFormulario() {
        const form = document.getElementById('productForm');
        if (form) {
            form.reset();
            form.classList.remove('was-validated');
            form.removeAttribute('data-edit-id');
        }
    }

    function actualizarContadores() {
        const totalProductos = productos.length;
        const stockBajo = productos.filter(p => p.stock <= p.minStock).length;
        const valorTotal = productos.reduce((sum, p) => sum + (p.precio * p.stock), 0);
        
        // Actualizar KPIs si existen
        const kpiTotal = document.querySelector('.kpi-total .kpi-value');
        const kpiAlert = document.querySelector('.kpi-alert .kpi-value');
        const kpiValue = document.querySelector('.kpi-value-amount .kpi-value');
        
        if (kpiTotal) kpiTotal.textContent = totalProductos;
        if (kpiAlert) kpiAlert.textContent = stockBajo;
        if (kpiValue) kpiValue.textContent = `$${valorTotal.toLocaleString('es-CO')}`;
    }

    function mostrarNotificacion(mensaje, tipo = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Agregar al body
        document.body.appendChild(notification);
        
        // Eliminar después de 3 segundos
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 150);
        }, 3000);
    }

    // Utilidad: debounce
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // ===========================
    // EXPORTAR FUNCIONES GLOBALES
    // ===========================
    window.verDetalle = verDetalle;
    window.editarProducto = editarProducto;
    window.eliminarProducto = eliminarProducto;

})();
