// inventario.js - Gestion de inventario y productos

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        console.log('Modulo Inventario cargado');
        initInventory();
    });

    // Inicializar inventario
    function initInventory() {
        loadProducts();
        loadCategories();
        initNewProductButton();
        initProductForm();
        initProductActions();
        initFilters();
        showLowStockAlerts();
        updateDashboardKPIs();
        
        // Inicializar sistema de notificaciones
        if (typeof MarketWorld.notifications !== 'undefined') {
            MarketWorld.notifications.init();
            MarketWorld.notifications.checkLowStock();
        }
    }

    // Cargar productos
    function loadProducts() {
        var products = MarketWorld.data.getProducts();
        displayProducts(products);
    }

    // Mostrar productos
    function displayProducts(products) {
        var container = document.getElementById('productsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (products.length === 0) {
            container.innerHTML = '<div class="col-12"><div class="alert alert-info">No hay productos registrados</div></div>';
            return;
        }
        
        products.forEach(function(product) {
            var productCard = createProductCard(product);
            container.appendChild(productCard);
        });
    }

    // Crear tarjeta de producto
    function createProductCard(product) {
        var col = document.createElement('div');
        col.className = 'col-md-4 mb-3';
        
        var stockClass = product.stock <= product.stockMinimo ? 'stock-low' : 
                         product.stock <= product.stockMinimo * 2 ? 'stock-medium' : 'stock-ok';
        
        var statusBadge = product.activo ? 
            '<span class="badge bg-success">Activo</span>' : 
            '<span class="badge bg-secondary">Inactivo</span>';
        
        var stockAlert = product.stock <= product.stockMinimo ? 
            '<div class="alert alert-warning alert-sm mb-2"><i class="bi bi-exclamation-triangle me-1"></i> Stock bajo</div>' : '';
        
        var margen = product.precio > 0 ? ((product.precio - product.costo) / product.precio * 100).toFixed(1) : 0;
        
        col.innerHTML = `
            <div class="card product-card h-100">
                <div class="card-body">
                    <div class="d-flex justify-content-between mb-2">
                        <small class="text-muted">${product.codigo}</small>
                        ${statusBadge}
                    </div>
                    <h5 class="card-title">${product.nombre}</h5>
                    <p class="text-muted small mb-2">${product.categoria}</p>
                    <p class="card-text small text-truncate">${product.descripcion || 'Sin descripción'}</p>
                    
                    ${stockAlert}
                    
                    <div class="product-info">
                        <div class="d-flex justify-content-between mb-2">
                            <span><i class="bi bi-tag me-1"></i> Precio:</span>
                            <strong>$${formatCurrency(product.precio)}</strong>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span><i class="bi bi-cash me-1"></i> Costo:</span>
                            <span>$${formatCurrency(product.costo)}</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span><i class="bi bi-graph-up me-1"></i> Margen:</span>
                            <span class="text-success">${margen}%</span>
                        </div>
                        <div class="d-flex justify-content-between mb-2">
                            <span><i class="bi bi-box me-1"></i> Stock:</span>
                            <span class="${stockClass}"><strong>${product.stock}</strong> ${product.unidad}</span>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span class="small text-muted">Mínimo:</span>
                            <span class="small text-muted">${product.stockMinimo}</span>
                        </div>
                    </div>
                    
                    <div class="btn-group w-100 mt-3" role="group">
                        <button class="btn btn-sm btn-outline-primary btn-adjust-stock" data-product-id="${product.id}">
                            <i class="bi bi-plus-minus"></i> Stock
                        </button>
                        <button class="btn btn-sm btn-outline-warning btn-edit-product" data-product-id="${product.id}">
                            <i class="bi bi-pencil"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete-product" data-product-id="${product.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return col;
    }

    // Formatear moneda
    function formatCurrency(value) {
        return new Intl.NumberFormat('es-CO').format(value);
    }

    // Botón nuevo producto
    function initNewProductButton() {
        var btnNew = document.querySelector('[data-bs-target="#productModal"]');
        if (btnNew) {
            btnNew.addEventListener('click', function() {
                resetProductForm();
                document.getElementById('productModalLabel').textContent = 'Nuevo Producto';
                document.getElementById('productId').value = '';
            });
        }
    }

    // Formulario de producto
    function initProductForm() {
        var form = document.getElementById('productForm');
        if (!form) return;
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            saveProduct();
        });
        
        // Calcular margen automáticamente
        var precioInput = document.getElementById('productPrecio');
        var costoInput = document.getElementById('productCosto');
        
        if (precioInput && costoInput) {
            var calculateMargin = function() {
                var precio = parseFloat(precioInput.value) || 0;
                var costo = parseFloat(costoInput.value) || 0;
                var margen = precio > 0 ? ((precio - costo) / precio * 100).toFixed(1) : 0;
                var margenSpan = document.getElementById('margenCalculado');
                if (margenSpan) {
                    margenSpan.textContent = margen + '%';
                    margenSpan.className = margen > 0 ? 'text-success' : 'text-danger';
                }
            };
            
            precioInput.addEventListener('input', calculateMargin);
            costoInput.addEventListener('input', calculateMargin);
        }
    }

    // Inicializar acciones de productos
    function initProductActions() {
        var container = document.getElementById('productsList');
        if (!container) return;
        
        container.addEventListener('click', function(e) {
            var target = e.target.closest('button');
            if (!target) return;
            
            var productId = target.getAttribute('data-product-id');
            if (!productId) return;
            
            if (target.classList.contains('btn-edit-product')) {
                editProduct(parseInt(productId));
            } else if (target.classList.contains('btn-delete-product')) {
                deleteProductConfirm(parseInt(productId));
            } else if (target.classList.contains('btn-adjust-stock')) {
                showStockModal(parseInt(productId));
            }
        });
    }

    // Guardar producto
    function saveProduct() {
        var productId = document.getElementById('productId').value;
        var codigo = document.getElementById('productCodigo').value.trim();
        var nombre = document.getElementById('productNombre').value.trim();
        var descripcion = document.getElementById('productDescripcion').value.trim();
        var categoria = document.getElementById('productCategoria').value;
        var precio = document.getElementById('productPrecio').value;
        var costo = document.getElementById('productCosto').value;
        var stock = document.getElementById('productStock').value;
        var stockMinimo = document.getElementById('productStockMinimo').value;
        var unidad = document.getElementById('productUnidad').value;
        var proveedor = document.getElementById('productProveedor').value.trim();
        var activo = document.getElementById('productActivo').checked;
        
        if (!codigo || !nombre || !categoria || !precio) {
            alert('Por favor completa los campos obligatorios (Código, Nombre, Categoría, Precio)');
            return;
        }
        
        var productData = {
            codigo: codigo,
            nombre: nombre,
            descripcion: descripcion,
            categoria: categoria,
            precio: precio,
            costo: costo || 0,
            stock: stock || 0,
            stockMinimo: stockMinimo || 0,
            unidad: unidad,
            proveedor: proveedor,
            activo: activo
        };
        
        var result;
        if (productId) {
            result = MarketWorld.data.updateProduct(productId, productData);
        } else {
            result = MarketWorld.data.createProduct(productData);
            // Notificar creación de producto
            if (result.success && typeof MarketWorld.notifications !== 'undefined') {
                MarketWorld.notifications.notifyProductCreated(nombre);
            }
        }
        
        if (result.success) {
            alert(result.message);
            loadProducts();
            showLowStockAlerts();
            updateDashboardKPIs();
            
            // Verificar stock bajo después de guardar
            if (typeof MarketWorld.notifications !== 'undefined') {
                MarketWorld.notifications.checkLowStock();
            }
            
            var modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
            if (modal) modal.hide();
        } else {
            alert('Error: ' + result.message);
        }
    }

    // Editar producto
    function editProduct(id) {
        var product = MarketWorld.data.findProductById(id);
        if (!product) {
            alert('Producto no encontrado');
            return;
        }
        
        document.getElementById('productId').value = product.id;
        document.getElementById('productCodigo').value = product.codigo;
        document.getElementById('productNombre').value = product.nombre;
        document.getElementById('productDescripcion').value = product.descripcion;
        document.getElementById('productCategoria').value = product.categoria;
        document.getElementById('productPrecio').value = product.precio;
        document.getElementById('productCosto').value = product.costo;
        document.getElementById('productStock').value = product.stock;
        document.getElementById('productStockMinimo').value = product.stockMinimo;
        document.getElementById('productUnidad').value = product.unidad;
        document.getElementById('productProveedor').value = product.proveedor;
        document.getElementById('productActivo').checked = product.activo;
        
        document.getElementById('productModalLabel').textContent = 'Editar Producto';
        
        // Calcular margen
        var margen = product.precio > 0 ? ((product.precio - product.costo) / product.precio * 100).toFixed(1) : 0;
        var margenSpan = document.getElementById('margenCalculado');
        if (margenSpan) {
            margenSpan.textContent = margen + '%';
        }
        
        var modal = new bootstrap.Modal(document.getElementById('productModal'));
        modal.show();
    }

    // Eliminar producto
    function deleteProductConfirm(id) {
        var product = MarketWorld.data.findProductById(id);
        if (!product) return;
        
        if (confirm('¿ELIMINAR el producto "' + product.nombre + '"?\n\nEsta acción no se puede deshacer.')) {
            var productName = product.nombre;
            var result = MarketWorld.data.deleteProduct(id);
            if (result.success) {
                alert(result.message);
                loadProducts();
                showLowStockAlerts();
                updateDashboardKPIs();
                
                // Notificar eliminación de producto
                if (typeof MarketWorld.notifications !== 'undefined') {
                    MarketWorld.notifications.notifyProductDeleted(productName);
                }
            } else {
                alert('Error: ' + result.message);
            }
        }
    }

    // Mostrar modal de ajuste de stock
    function showStockModal(id) {
        var product = MarketWorld.data.findProductById(id);
        if (!product) return;
        
        var currentStock = product.stock;
        var operation = prompt(
            'Ajuste de Stock - ' + product.nombre + '\n\n' +
            'Stock actual: ' + currentStock + ' ' + product.unidad + '\n\n' +
            'Ingresa:\n' +
            '+10 para agregar 10 unidades\n' +
            '-5 para restar 5 unidades\n' +
            '50 para establecer stock en 50'
        );
        
        if (!operation) return;
        
        var trimmed = operation.trim();
        var quantity, opType;
        
        if (trimmed.startsWith('+')) {
            quantity = parseInt(trimmed.substring(1));
            opType = 'add';
        } else if (trimmed.startsWith('-')) {
            quantity = parseInt(trimmed.substring(1));
            opType = 'subtract';
        } else {
            quantity = parseInt(trimmed);
            opType = 'set';
        }
        
        if (isNaN(quantity)) {
            alert('Cantidad inválida');
            return;
        }
        
        var result = MarketWorld.data.updateStock(id, quantity, opType);
        if (result.success) {
            var newStock = MarketWorld.data.findProductById(id).stock;
            alert(result.message);
            loadProducts();
            showLowStockAlerts();
            updateDashboardKPIs();
            
            // Notificar cambio de stock
            if (typeof MarketWorld.notifications !== 'undefined') {
                MarketWorld.notifications.notifyStockUpdate(product.nombre, currentStock, newStock);
                MarketWorld.notifications.checkLowStock();
            }
        } else {
            alert('Error: ' + result.message);
        }
    }

    // Limpiar formulario
    function resetProductForm() {
        document.getElementById('productId').value = '';
        document.getElementById('productCodigo').value = '';
        document.getElementById('productNombre').value = '';
        document.getElementById('productDescripcion').value = '';
        document.getElementById('productCategoria').value = '';
        document.getElementById('productPrecio').value = '';
        document.getElementById('productCosto').value = '';
        document.getElementById('productStock').value = '0';
        document.getElementById('productStockMinimo').value = '0';
        document.getElementById('productUnidad').value = 'Unidad';
        document.getElementById('productProveedor').value = '';
        document.getElementById('productActivo').checked = true;
        
        var margenSpan = document.getElementById('margenCalculado');
        if (margenSpan) margenSpan.textContent = '0%';
    }

    // Cargar categorías en select
    function loadCategories() {
        var categories = MarketWorld.data.getCategories();
        var select = document.getElementById('productCategoria');
        var filterSelect = document.getElementById('filterCategoria');
        
        if (select) {
            select.innerHTML = '<option value="">Seleccionar categoría...</option>';
            categories.forEach(function(cat) {
                if (cat.activa) {
                    var option = document.createElement('option');
                    option.value = cat.nombre;
                    option.textContent = cat.nombre;
                    select.appendChild(option);
                }
            });
        }
        
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">Todas las categorías</option>';
            categories.forEach(function(cat) {
                if (cat.activa) {
                    var option = document.createElement('option');
                    option.value = cat.nombre;
                    option.textContent = cat.nombre;
                    filterSelect.appendChild(option);
                }
            });
        }
    }

    // Inicializar filtros
    function initFilters() {
        var btnFilter = document.getElementById('btnFilter');
        var searchInput = document.getElementById('filterSearch');
        
        if (btnFilter) {
            btnFilter.addEventListener('click', applyFilters);
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
        }
    }

    // Aplicar filtros
    function applyFilters() {
        var categoria = document.getElementById('filterCategoria').value.toLowerCase();
        var estado = document.getElementById('filterEstado').value;
        var stock = document.getElementById('filterStock').value;
        var search = document.getElementById('filterSearch').value.toLowerCase();
        
        var products = MarketWorld.data.getProducts();
        
        var filtered = products.filter(function(product) {
            var matchCategoria = !categoria || product.categoria.toLowerCase() === categoria;
            var matchEstado = !estado || (estado === 'activo' ? product.activo : !product.activo);
            var matchStock = !stock || 
                (stock === 'bajo' && product.stock <= product.stockMinimo) ||
                (stock === 'ok' && product.stock > product.stockMinimo);
            var matchSearch = !search || 
                product.nombre.toLowerCase().includes(search) ||
                product.codigo.toLowerCase().includes(search) ||
                product.descripcion.toLowerCase().includes(search);
            
            return matchCategoria && matchEstado && matchStock && matchSearch;
        });
        
        displayProducts(filtered);
    }

    // Mostrar alertas de stock bajo
    function showLowStockAlerts() {
        var lowStockProducts = MarketWorld.data.getLowStockProducts();
        var alertContainer = document.getElementById('lowStockAlerts');
        
        if (!alertContainer) return;
        
        if (lowStockProducts.length === 0) {
            alertContainer.innerHTML = '<div class="alert alert-success"><i class="bi bi-check-circle me-2"></i> Todos los productos tienen stock suficiente</div>';
            return;
        }
        
        var html = '<div class="alert alert-warning"><i class="bi bi-exclamation-triangle me-2"></i> <strong>' + lowStockProducts.length + ' producto(s) con stock bajo:</strong><ul class="mb-0 mt-2">';
        
        lowStockProducts.forEach(function(product) {
            html += '<li>' + product.nombre + ' (' + product.codigo + ') - Stock: ' + product.stock + ' (Mínimo: ' + product.stockMinimo + ')</li>';
        });
        
        html += '</ul></div>';
        alertContainer.innerHTML = html;
    }

    // Actualizar KPIs del dashboard
    function updateDashboardKPIs() {
        var products = MarketWorld.data.getProducts();
        var lowStockProducts = MarketWorld.data.getLowStockProducts();
        
        // Total de productos activos
        var activeProducts = products.filter(function(p) { return p.activo; });
        var totalProductos = activeProducts.length;
        
        // Valor total del inventario (precio * stock)
        var valorTotal = products.reduce(function(sum, product) {
            return sum + (product.precio * product.stock);
        }, 0);
        
        // Productos con stock bajo
        var stockBajo = lowStockProducts.length;
        
        // Actualizar los valores en el HTML
        var kpiTotal = document.getElementById('kpiTotalProductos');
        var kpiValor = document.getElementById('kpiValorTotal');
        var kpiStock = document.getElementById('kpiStockBajo');
        var kpiMovimientos = document.getElementById('kpiMovimientos');
        
        if (kpiTotal) {
            kpiTotal.textContent = totalProductos.toLocaleString('es-CO');
            var trendTotal = document.getElementById('kpiTrendProductos');
            if (trendTotal) {
                trendTotal.innerHTML = '<i class="bi bi-box-seam"></i> ' + products.length + ' total';
            }
        }
        
        if (kpiValor) {
            kpiValor.textContent = '$' + Math.round(valorTotal).toLocaleString('es-CO');
            var trendValor = document.getElementById('kpiTrendValor');
            if (trendValor) {
                var promedio = products.length > 0 ? Math.round(valorTotal / products.length) : 0;
                trendValor.innerHTML = '<i class="bi bi-graph-up"></i> Promedio: $' + promedio.toLocaleString('es-CO');
            }
        }
        
        if (kpiStock) {
            kpiStock.textContent = stockBajo;
            var trendStock = document.getElementById('kpiTrendStock');
            if (trendStock) {
                if (stockBajo > 0) {
                    trendStock.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Requiere atención';
                    trendStock.className = 'kpi-trend negative';
                } else {
                    trendStock.innerHTML = '<i class="bi bi-check-circle"></i> Todo en orden';
                    trendStock.className = 'kpi-trend positive';
                }
            }
        }
        
        if (kpiMovimientos) {
            // Por ahora, calcular movimientos basados en productos modificados hoy
            var hoy = new Date().toISOString().split('T')[0];
            var productosHoy = products.filter(function(p) {
                return p.fechaCreacion === hoy;
            }).length;
            
            kpiMovimientos.textContent = productosHoy;
            var trendMov = document.getElementById('kpiTrendMovimientos');
            if (trendMov) {
                if (productosHoy > 0) {
                    trendMov.textContent = productosHoy + ' productos agregados hoy';
                } else {
                    trendMov.textContent = 'Sin movimientos hoy';
                }
            }
        }
        
        console.log('KPIs actualizados:', {
            total: totalProductos,
            valor: valorTotal,
            stockBajo: stockBajo
        });
    }

})();
