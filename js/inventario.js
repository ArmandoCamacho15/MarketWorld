// inventario.js - Gestion de inventario y productos

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        console.log('Modulo Inventario cargado');
        initInventory();
    });

    // --- Inicializar inventario ---
    function initInventory() {
        loadProducts();
        loadCategories();
        initNewProductButton();
        initProductForm();
        initProductActions();
        initFilters();
        initHeaderSearch();
        initImportExport();
        initPagination();
        initTabContent();
        initReportsCharts();
        initKeyboardNavigation();
        showLowStockAlerts();
        updateDashboardKPIs();
        
        // ======= INICIALIZAR SISTEMA DE NOTIFICACIONES =======
        if (typeof MarketWorld.notifications !== 'undefined') {
            MarketWorld.notifications.init();
            MarketWorld.notifications.checkLowStock();
        }
    }

    // --- Cargar productos ---
    function loadProducts() {
        var products = MarketWorld.data.getProducts();
        displayProducts(products);
    }

    // --- Mostrar productos ---
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

    // --- Crear tarjeta de producto ---
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

    // ======= FORMATEAR MONEDA =======
    function formatCurrency(value) {
        return new Intl.NumberFormat('es-CO').format(value);
    }

    // ======= BOTÓN NUEVO PRODUCTO =======
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

    // ======= FORMULARIO DE PRODUCTO =======
    function initProductForm() {
        var form = document.getElementById('productForm');
        if (!form) return;
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            saveProduct();
        });
        
        // ======= CALCULAR MARGEN AUTOMÁTICAMENTE =======
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

    // ======= INICIALIZAR ACCIONES DE PRODUCTOS =======
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

    // ======= GUARDAR PRODUCTO =======
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
            // ======= NOTIFICAR CREACIÓN DE PRODUCTO =======
            if (result.success && typeof MarketWorld.notifications !== 'undefined') {
                MarketWorld.notifications.notifyProductCreated(nombre);
            }
        }
        
        if (result.success) {
            alert(result.message);
            loadProducts();
            showLowStockAlerts();
            updateDashboardKPIs();
            
            // ======= VERIFICAR STOCK BAJO =======
            if (typeof MarketWorld.notifications !== 'undefined') {
                MarketWorld.notifications.checkLowStock();
            }
            
            var modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
            if (modal) modal.hide();
        } else {
            alert('Error: ' + result.message);
        }
    }

    // ======= EDITAR PRODUCTO =======
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
        
        // ======= CALCULAR MARGEN =======
        var margen = product.precio > 0 ? ((product.precio - product.costo) / product.precio * 100).toFixed(1) : 0;
        var margenSpan = document.getElementById('margenCalculado');
        if (margenSpan) {
            margenSpan.textContent = margen + '%';
        }
        
        var modal = new bootstrap.Modal(document.getElementById('productModal'));
        modal.show();
    }

    // ======= ELIMINAR PRODUCTO =======
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
                
                // ======= NOTIFICAR ELIMINACIÓN DE PRODUCTO =======
                if (typeof MarketWorld.notifications !== 'undefined') {
                    MarketWorld.notifications.notifyProductDeleted(productName);
                }
            } else {
                alert('Error: ' + result.message);
            }
        }
    }

    // ======= MOSTRAR MODAL DE AJUSTE DE STOCK =======
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
            
            // ======= NOTIFICAR CAMBIO DE STOCK =======
            if (typeof MarketWorld.notifications !== 'undefined') {
                MarketWorld.notifications.notifyStockUpdate(product.nombre, currentStock, newStock);
                MarketWorld.notifications.checkLowStock();
            }
        } else {
            alert('Error: ' + result.message);
        }
    }

    // ======= LIMPIAR FORMULARIO =======
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

    // ======= CARGAR CATEGORÍAS EN SELECT =======
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
        var filterCategoria = document.getElementById('filterCategoria');
        var filterEstado = document.getElementById('filterEstado');
        var filterStock = document.getElementById('filterStock');
        
        if (btnFilter) {
            btnFilter.addEventListener('click', applyFilters);
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
        }
        
        // Hacer filtros reactivos individualmente
        if (filterCategoria) {
            filterCategoria.addEventListener('change', applyFilters);
        }
        
        if (filterEstado) {
            filterEstado.addEventListener('change', applyFilters);
        }
        
        if (filterStock) {
            filterStock.addEventListener('change', applyFilters);
        }
        
        console.log('✅ Filtros inicializados (reactivos)');
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

    // ========================================
    // NUEVAS FUNCIONALIDADES IMPLEMENTADAS
    // ========================================

    // Inicializar búsqueda global del header
    function initHeaderSearch() {
        var headerSearch = document.getElementById('searchProduct');
        var filterSearch = document.getElementById('filterSearch');
        
        if (headerSearch && filterSearch) {
            headerSearch.addEventListener('input', function(e) {
                filterSearch.value = e.target.value;
                applyFilters();
            });
            
            // Sincronizar en sentido inverso
            filterSearch.addEventListener('input', function(e) {
                headerSearch.value = e.target.value;
            });
            
            console.log('✅ Búsqueda global del header conectada');
        }
    }

    // Inicializar importar/exportar
    function initImportExport() {
        var btnImport = document.getElementById('btnImportExcel');
        var btnExport = document.getElementById('btnExportExcel');
        
        if (btnImport) {
            btnImport.addEventListener('click', importFromExcel);
        }
        
        if (btnExport) {
            btnExport.addEventListener('click', exportToExcel);
        }
        
        console.log('✅ Botones Importar/Exportar inicializados');
    }

    // Importar desde Excel/CSV
    function importFromExcel() {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.xlsx,.xls';
        
        input.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (!file) return;
            
            showLoadingOverlay('Importando productos...');
            
            var reader = new FileReader();
            reader.onload = function(event) {
                try {
                    var content = event.target.result;
                    var products = parseCSV(content);
                    
                    if (products.length === 0) {
                        hideLoadingOverlay();
                        alert('No se encontraron productos válidos en el archivo');
                        return;
                    }
                    
                    var imported = 0;
                    var errors = 0;
                    
                    products.forEach(function(product) {
                        var result = MarketWorld.data.createProduct(product);
                        if (result.success) {
                            imported++;
                        } else {
                            errors++;
                        }
                    });
                    
                    hideLoadingOverlay();
                    alert('Importación completada\\n\\n' +
                          'Productos importados: ' + imported + '\\n' +
                          'Errores: ' + errors);
                    
                    loadProducts();
                    updateDashboardKPIs();
                    showLowStockAlerts();
                    
                } catch (error) {
                    hideLoadingOverlay();
                    alert('Error al procesar el archivo: ' + error.message);
                    console.error('Error importación:', error);
                }
            };
            
            reader.readAsText(file);
        });
        
        input.click();
    }

    // Parsear CSV
    function parseCSV(content) {
        var lines = content.split('\\n');
        var products = [];
        
        // Asumiendo formato: codigo,nombre,descripcion,categoria,precio,costo,stock,stockMinimo,unidad,proveedor
        for (var i = 1; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;
            
            var parts = line.split(',');
            if (parts.length < 5) continue;
            
            products.push({
                codigo: parts[0] || 'PROD-' + Date.now(),
                nombre: parts[1] || 'Sin nombre',
                descripcion: parts[2] || '',
                categoria: parts[3] || 'Electrónica',
                precio: parseFloat(parts[4]) || 0,
                costo: parseFloat(parts[5]) || 0,
                stock: parseInt(parts[6]) || 0,
                stockMinimo: parseInt(parts[7]) || 0,
                unidad: parts[8] || 'Unidad',
                proveedor: parts[9] || '',
                activo: true
            });
        }
        
        return products;
    }

    // Exportar a Excel/CSV
    function exportToExcel() {
        var products = MarketWorld.data.getProducts();
        
        if (products.length === 0) {
            alert('No hay productos para exportar');
            return;
        }
        
        showLoadingOverlay('Generando archivo...');
        
        // Generar CSV
        var csv = 'Código,Nombre,Descripción,Categoría,Precio,Costo,Stock,Stock Mínimo,Unidad,Proveedor,Activo\\n';
        
        products.forEach(function(product) {
            csv += [
                product.codigo,
                '"' + product.nombre + '"',
                '"' + (product.descripcion || '') + '"',
                product.categoria,
                product.precio,
                product.costo,
                product.stock,
                product.stockMinimo,
                product.unidad,
                '"' + (product.proveedor || '') + '"',
                product.activo ? 'Sí' : 'No'
            ].join(',') + '\\n';
        });
        
        // Descargar archivo
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        var url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', 'productos_' + new Date().toISOString().split('T')[0] + '.csv');
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        hideLoadingOverlay();
        
        if (typeof MarketWorld.notifications !== 'undefined') {
            MarketWorld.notifications.create({
                titulo: 'Exportación exitosa',
                mensaje: products.length + ' productos exportados correctamente',
                tipo: 'success'
            });
        }
    }

    // Variables de paginación
    var currentPage = 1;
    var itemsPerPage = 9; // 3x3 grid

    // Inicializar paginación
    function initPagination() {
        var paginationContainer = document.querySelector('.pagination');
        if (paginationContainer) {
            paginationContainer.addEventListener('click', handlePagination);
            console.log('✅ Paginación inicializada');
        }
    }

    // Manejar eventos de paginación
    function handlePagination(e) {
        e.preventDefault();
        var link = e.target.closest('.page-link');
        if (!link) return;
        
        var text = link.textContent.trim();
        var products = getFilteredProducts();
        var totalPages = Math.ceil(products.length / itemsPerPage);
        
        if (text === 'Anterior' && currentPage > 1) {
            currentPage--;
        } else if (text === 'Siguiente' && currentPage < totalPages) {
            currentPage++;
        } else if (!isNaN(parseInt(text))) {
            currentPage = parseInt(text);
        }
        
        displayProductsWithPagination(products);
        updatePaginationUI(totalPages);
    }

    // Obtener productos filtrados actuales
    function getFilteredProducts() {
        var categoria = document.getElementById('filterCategoria').value.toLowerCase();
        var estado = document.getElementById('filterEstado').value;
        var stock = document.getElementById('filterStock').value;
        var search = document.getElementById('filterSearch').value.toLowerCase();
        
        var products = MarketWorld.data.getProducts();
        
        return products.filter(function(product) {
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
    }

    // Mostrar productos con paginación
    function displayProductsWithPagination(products) {
        var start = (currentPage - 1) * itemsPerPage;
        var end = start + itemsPerPage;
        var pageProducts = products.slice(start, end);
        
        displayProducts(pageProducts);
    }

    // Actualizar UI de paginación
    function updatePaginationUI(totalPages) {
        var paginationContainer = document.querySelector('.pagination');
        if (!paginationContainer) return;
        
        paginationContainer.innerHTML = '';
        
        // Botón Anterior
        var prevLi = document.createElement('li');
        prevLi.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
        prevLi.innerHTML = '<a class=\"page-link\" href=\"#\" tabindex=\"' + (currentPage === 1 ? '-1' : '0') + '\">Anterior</a>';
        paginationContainer.appendChild(prevLi);
        
        // Números de página
        var startPage = Math.max(1, currentPage - 2);
        var endPage = Math.min(totalPages, currentPage + 2);
        
        for (var i = startPage; i <= endPage; i++) {
            var li = document.createElement('li');
            li.className = 'page-item' + (i === currentPage ? ' active' : '');
            if (i === currentPage) {
                li.innerHTML = '<a class=\"page-link\" href=\"#\" aria-current=\"page\">' + i + '</a>';
            } else {
                li.innerHTML = '<a class=\"page-link\" href=\"#\">' + i + '</a>';
            }
            paginationContainer.appendChild(li);
        }
        
        // Botón Siguiente
        var nextLi = document.createElement('li');
        nextLi.className = 'page-item' + (currentPage === totalPages ? ' disabled' : '');
        nextLi.innerHTML = '<a class=\"page-link\" href=\"#\" tabindex=\"' + (currentPage === totalPages ? '-1' : '0') + '\">Siguiente</a>';
        paginationContainer.appendChild(nextLi);
    }

    // Sobreescribir displayProducts para usar paginación
    var originalDisplayProducts = displayProducts;
    displayProducts = function(products) {
        if (!products || arguments.length === 0) {
            products = MarketWorld.data.getProducts();
        }
        
        var totalPages = Math.ceil(products.length / itemsPerPage);
        updatePaginationUI(totalPages);
        
        if (products.length <= itemsPerPage) {
            originalDisplayProducts(products);
        } else {
            displayProductsWithPagination(products);
        }
    };

    // Inicializar contenido de pestañas
    function initTabContent() {
        var tabs = document.querySelectorAll('.nav-tabs .nav-link');
        
        tabs.forEach(function(tab) {
            tab.addEventListener('shown.bs.tab', function(event) {
                var target = event.target.getAttribute('href');
                
                if (target === '#reportes') {
                    setTimeout(initReportsCharts, 100);
                } else if (target === '#categorias') {
                    loadCategoriesTab();
                } else if (target === '#movimientos') {
                    loadMovimientosTab();
                } else if (target === '#ajustes') {
                    loadAjustesTab();
                }
            });
        });
        
        console.log('✅ Tabs inicializados con contenido dinámico');
    }

    // Cargar tab de categorías
    function loadCategoriesTab() {
        console.log('📂 Cargando categorías...');
        displayCategories();
        initCategoryModal();
    }

    // Cargar tab de movimientos
    function loadMovimientosTab() {
        console.log('📊 Cargando movimientos...');
        displayMovements();
        initMovementModal();
        updateMovementsSummary();
    }

    // Cargar tab de ajustes
    function loadAjustesTab() {
        console.log('⚙️ Cargando ajustes...');
        // TODO: Implementar ajustes de inventario
    }

    // Variables para gráficos
    var rotationChart = null;
    var valuationChart = null;
    var movementsChart = null;

    // Inicializar gráficos de reportes
    function initReportsCharts() {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js no está cargado');
            return;
        }
        
        initRotationChart();
        initValuationChart();
        initMovementsChart();
        
        console.log('📊 Gráficos de reportes inicializados');
    }

    // Gráfico de rotación
    function initRotationChart() {
        var canvas = document.getElementById('rotationChart');
        if (!canvas) return;
        
        var ctx = canvas.getContext('2d');
        
        // Destruir gráfico anterior si existe
        if (rotationChart) {
            rotationChart.destroy();
        }
        
        var products = MarketWorld.data.getProducts();
        var topProducts = products.slice(0, 10);
        
        rotationChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: topProducts.map(function(p) { return p.nombre; }),
                datasets: [{
                    label: 'Stock Actual',
                    data: topProducts.map(function(p) { return p.stock; }),
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    title: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Gráfico de valorización por categoría
    function initValuationChart() {
        var canvas = document.getElementById('valuationChart');
        if (!canvas) return;
        
        var ctx = canvas.getContext('2d');
        
        // Destruir gráfico anterior si existe
        if (valuationChart) {
            valuationChart.destroy();
        }
        
        var products = MarketWorld.data.getProducts();
        var categories = {};
        
        products.forEach(function(product) {
            var cat = product.categoria;
            if (!categories[cat]) {
                categories[cat] = 0;
            }
            categories[cat] += product.precio * product.stock;
        });
        
        var labels = Object.keys(categories);
        var values = Object.values(categories);
        
        valuationChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'right'
                    }
                }
            }
        });
    }

    // Gráfico de movimientos
    function initMovementsChart() {
        var canvas = document.getElementById('movementsChart');
        if (!canvas) return;
        
        var ctx = canvas.getContext('2d');
        
        // Destruir gráfico anterior si existe
        if (movementsChart) {
            movementsChart.destroy();
        }
        
        // Obtener movimientos reales de localStorage
        var movements = MarketWorld.data.getInventoryMovements();
        
        // Preparar datos de últimos 30 días
        var days = [];
        var entradas = [];
        var salidas = [];
        var ajustes = [];
        
        for (var i = 29; i >= 0; i--) {
            var date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            
            var nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            days.push(date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }));
            
            // Calcular movimientos de ese día
            var entradasDia = 0;
            var salidasDia = 0;
            var ajustesDia = 0;
            
            movements.forEach(function(mov) {
                var movDate = new Date(mov.fecha);
                movDate.setHours(0, 0, 0, 0);
                
                if (movDate.getTime() === date.getTime()) {
                    if (mov.tipo === 'entrada') {
                        entradasDia += mov.cantidad;
                    } else if (mov.tipo === 'salida') {
                        salidasDia += mov.cantidad;
                    } else if (mov.tipo === 'ajuste') {
                        ajustesDia += Math.abs(mov.cantidad);
                    }
                }
            });
            
            entradas.push(entradasDia);
            salidas.push(salidasDia);
            ajustes.push(ajustesDia);
        }
        
        movementsChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: days,
                datasets: [
                    {
                        label: 'Entradas',
                        data: entradas,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.3
                    },
                    {
                        label: 'Salidas',
                        data: salidas,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            footer: function(tooltipItems) {
                                var index = tooltipItems[0].dataIndex;
                                return 'Ajustes: ' + ajustes[index];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // Navegación por teclado
    function initKeyboardNavigation() {
        document.addEventListener('keydown', function(e) {
            // Escape cierra modales
            if (e.key === 'Escape') {
                var modal = document.getElementById('productModal');
                if (modal && modal.classList.contains('show')) {
                    var bsModal = bootstrap.Modal.getInstance(modal);
                    if (bsModal) bsModal.hide();
                }
            }
            
            // Ctrl+N abre nuevo producto
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                var btnNew = document.querySelector('[data-bs-target=\"#productModal\"]');
                if (btnNew) btnNew.click();
            }
            
            // Ctrl+F enfoca búsqueda
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                var searchInput = document.getElementById('searchProduct');
                if (searchInput) searchInput.focus();
            }
        });
        
        console.log('⌨️ Navegación por teclado habilitada (Esc, Ctrl+N, Ctrl+F)');
    }

    // Overlay de loading
    function showLoadingOverlay(message) {
        var overlay = document.getElementById('loadingOverlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                color: white;
            `;
            overlay.innerHTML = `
                <div class=\"spinner-border text-light\" role=\"status\" style=\"width: 4rem; height: 4rem;\">
                    <span class=\"visually-hidden\">Cargando...</span>
                </div>
                <p class=\"mt-3 fs-5\" id=\"loadingMessage\">Cargando...</p>
            `;
            document.body.appendChild(overlay);
        }
        
        var messageEl = document.getElementById('loadingMessage');
        if (messageEl) messageEl.textContent = message || 'Cargando...';
        
        overlay.style.display = 'flex';
    }

    function hideLoadingOverlay() {
        var overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // Sobreescribir applyFilters para resetear paginación
    var originalApplyFilters = applyFilters;
    applyFilters = function() {
        currentPage = 1;
        originalApplyFilters();
    };

    // ========================================
    // GESTIÓN DE CATEGORÍAS
    // ========================================

    function displayCategories() {
        var categories = MarketWorld.data.getCategories();
        var container = document.getElementById('categoriesList');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        if (categories.length === 0) {
            container.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay categorías registradas</td></tr>';
            return;
        }
        
        categories.forEach(function(category) {
            var products = MarketWorld.data.getProducts().filter(function(p) {
                return p.categoria === category.nombre;
            });
            
            var row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${category.nombre}</strong></td>
                <td>${category.descripcion || '<span class="text-muted">Sin descripción</span>'}</td>
                <td><span class="badge bg-primary">${products.length} productos</span></td>
                <td>
                    ${category.activa ? 
                        '<span class="badge bg-success">Activa</span>' : 
                        '<span class="badge bg-secondary">Inactiva</span>'}
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-warning btn-edit-category" data-category-id="${category.id}" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger btn-delete-category" data-category-id="${category.id}" title="Eliminar" ${products.length > 0 ? 'disabled' : ''}>
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            container.appendChild(row);
        });
        
        // Event listeners para botones
        container.querySelectorAll('.btn-edit-category').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var id = parseInt(this.getAttribute('data-category-id'));
                editCategory(id);
            });
        });
        
        container.querySelectorAll('.btn-delete-category').forEach(function(btn) {
            btn.addEventListener('click', function() {
                var id = parseInt(this.getAttribute('data-category-id'));
                deleteCategory(id);
            });
        });
    }

    function initCategoryModal() {
        var btnNueva = document.getElementById('btnNuevaCategoria');
        var form = document.getElementById('categoryForm');
        
        if (btnNueva) {
            btnNueva.addEventListener('click', function() {
                resetCategoryForm();
                document.getElementById('categoryModalLabel').textContent = 'Nueva Categoría';
            });
        }
        
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                saveCategory();
            });
        }
    }

    function saveCategory() {
        var id = document.getElementById('categoryId').value;
        var nombre = document.getElementById('categoryNombre').value.trim();
        var descripcion = document.getElementById('categoryDescripcion').value.trim();
        var activa = document.getElementById('categoryActiva').checked;
        
        if (!nombre) {
            alert('Por favor ingresa el nombre de la categoría');
            return;
        }
        
        var categoryData = {
            nombre: nombre,
            descripcion: descripcion,
            activa: activa
        };
        
        var result;
        if (id) {
            result = MarketWorld.data.updateCategory(id, categoryData);
        } else {
            result = MarketWorld.data.createCategory(categoryData);
        }
        
        if (result.success) {
            alert(result.message);
            displayCategories();
            loadCategories(); // Actualizar selects de categoría
            
            var modal = bootstrap.Modal.getInstance(document.getElementById('categoryModal'));
            if (modal) modal.hide();
        } else {
            alert('Error: ' + result.message);
        }
    }

    function editCategory(id) {
        var category = MarketWorld.data.getCategories().find(function(c) {
            return c.id === id;
        });
        
        if (!category) {
            alert('Categoría no encontrada');
            return;
        }
        
        document.getElementById('categoryId').value = category.id;
        document.getElementById('categoryNombre').value = category.nombre;
        document.getElementById('categoryDescripcion').value = category.descripcion || '';
        document.getElementById('categoryActiva').checked = category.activa;
        
        document.getElementById('categoryModalLabel').textContent = 'Editar Categoría';
        
        var modal = new bootstrap.Modal(document.getElementById('categoryModal'));
        modal.show();
    }

    function deleteCategory(id) {
        var category = MarketWorld.data.getCategories().find(function(c) {
            return c.id === id;
        });
        
        if (!category) return;
        
        if (confirm('¿Eliminar la categoría "' + category.nombre + '"?\\n\\nEsta acción no se puede deshacer.')) {
            var result = MarketWorld.data.deleteCategory(id);
            if (result.success) {
                alert(result.message);
                displayCategories();
                loadCategories();
            } else {
                alert('Error: ' + result.message);
            }
        }
    }

    function resetCategoryForm() {
        document.getElementById('categoryId').value = '';
        document.getElementById('categoryNombre').value = '';
        document.getElementById('categoryDescripcion').value = '';
        document.getElementById('categoryActiva').checked = true;
    }

    // ========================================
    // GESTIÓN DE MOVIMIENTOS
    // ========================================

    function displayMovements() {
        var container = document.getElementById('movementsList');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        // Obtener movimientos desde localStorage
        var movements = MarketWorld.data.getInventoryMovements();
        
        // Generar datos iniciales si no existen
        if (movements.length === 0) {
            generateInitialMovements();
            movements = MarketWorld.data.getInventoryMovements();
        }
        
        if (movements.length === 0) {
            container.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay movimientos registrados</td></tr>';
            return;
        }
        
        // Ordenar por fecha descendente
        var sortedMovements = movements.slice().sort(function(a, b) {
            return new Date(b.fecha) - new Date(a.fecha);
        });
        
        // Mostrar últimos 50 movimientos
        sortedMovements.slice(0, 50).forEach(function(mov) {
            var row = document.createElement('tr');
            
            var tipoBadge = mov.tipo === 'entrada' ? 'success' : 
                           mov.tipo === 'salida' ? 'danger' : 'warning';
            var tipoIcon = mov.tipo === 'entrada' ? '↑' : 
                          mov.tipo === 'salida' ? '↓' : '⚡';
            
            row.innerHTML = `
                <td>${formatDate(mov.fecha)}</td>
                <td><span class="badge bg-${tipoBadge}">${tipoIcon} ${mov.tipo.toUpperCase()}</span></td>
                <td>${mov.productoNombre}</td>
                <td><strong>${mov.cantidad}</strong></td>
                <td>${mov.stockAnterior}</td>
                <td><strong>${mov.stockNuevo}</strong></td>
                <td>${mov.usuario}</td>
                <td>${mov.motivo || '<span class="text-muted">-</span>'}</td>
            `;
            
            container.appendChild(row);
        });
    }

    function generateInitialMovements() {
        var products = MarketWorld.data.getProducts();
        var user = MarketWorld.data.getCurrentUser();
        var userName = user ? user.nombre + ' ' + user.apellido : 'Sistema';
        
        // Generar movimientos de ejemplo para los últimos 30 días
        for (var i = 0; i < 30; i++) {
            var date = new Date();
            date.setDate(date.getDate() - i);
            
            // 2-5 movimientos por día
            var movCount = Math.floor(Math.random() * 4) + 2;
            
            for (var j = 0; j < movCount; j++) {
                var product = products[Math.floor(Math.random() * products.length)];
                if (!product) continue;
                
                var tipos = ['entrada', 'salida', 'ajuste'];
                var tipo = tipos[Math.floor(Math.random() * tipos.length)];
                var cantidad = Math.floor(Math.random() * 20) + 1;
                
                var stockAnterior = product.stock;
                var stockNuevo = tipo === 'entrada' ? 
                    stockAnterior + cantidad : 
                    Math.max(0, stockAnterior - cantidad);
                
                var motivos = {
                    'entrada': ['Compra a proveedor', 'Devolución de cliente', 'Ajuste de inventario'],
                    'salida': ['Venta', 'Producto defectuoso', 'Muestra'],
                    'ajuste': ['Corrección de inventario', 'Reconciliación', 'Ajuste por auditoría']
                };
                
                MarketWorld.data.createInventoryMovement({
                    fecha: date.toISOString(),
                    tipo: tipo,
                    productoId: product.id,
                    productoNombre: product.nombre,
                    cantidad: cantidad,
                    stockAnterior: stockAnterior,
                    stockNuevo: stockNuevo,
                    usuario: userName,
                    motivo: motivos[tipo][Math.floor(Math.random() * motivos[tipo].length)]
                });
            }
        }
    }

    function initMovementModal() {
        var btnNuevo = document.getElementById('btnNuevoMovimiento');
        var form = document.getElementById('movementForm');
        var productoSelect = document.getElementById('movementProducto');
        
        if (btnNuevo) {
            btnNuevo.addEventListener('click', function() {
                resetMovementForm();
                loadProductsToSelect();
            });
        }
        
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                saveMovement();
            });
        }
        
        // Filtros
        var btnFiltrar = document.getElementById('btnFiltrarMovimientos');
        if (btnFiltrar) {
            btnFiltrar.addEventListener('click', applyMovementFilters);
        }
    }

    function loadProductsToSelect() {
        var select = document.getElementById('movementProducto');
        if (!select) return;
        
        var products = MarketWorld.data.getProducts();
        select.innerHTML = '<option value="">Seleccionar producto...</option>';
        
        products.forEach(function(product) {
            var option = document.createElement('option');
            option.value = product.id;
            option.textContent = product.nombre + ' (Stock: ' + product.stock + ')';
            select.appendChild(option);
        });
    }

    function saveMovement() {
        var tipo = document.getElementById('movementTipo').value;
        var productoId = parseInt(document.getElementById('movementProducto').value);
        var cantidad = parseInt(document.getElementById('movementCantidad').value);
        var motivo = document.getElementById('movementMotivo').value.trim();
        
        if (!tipo || !productoId || !cantidad) {
            alert('Por favor completa todos los campos obligatorios');
            return;
        }
        
        var product = MarketWorld.data.findProductById(productoId);
        if (!product) {
            alert('Producto no encontrado');
            return;
        }
        
        var stockAnterior = product.stock;
        var stockNuevo;
        
        if (tipo === 'entrada') {
            stockNuevo = stockAnterior + cantidad;
        } else if (tipo === 'salida') {
            if (cantidad > stockAnterior) {
                if (!confirm('La cantidad excede el stock actual (' + stockAnterior + '). ¿Continuar de todos modos?')) {
                    return;
                }
            }
            stockNuevo = Math.max(0, stockAnterior - cantidad);
        } else {
            stockNuevo = cantidad; // Ajuste directo
        }
        
        // Actualizar stock del producto
        var result = MarketWorld.data.updateStock(productoId, stockNuevo, 'set');
        
        if (result.success) {
            // Registrar movimiento en localStorage
            var movementResult = MarketWorld.data.createInventoryMovement({
                tipo: tipo,
                productoId: product.id,
                productoNombre: product.nombre,
                cantidad: cantidad,
                stockAnterior: stockAnterior,
                stockNuevo: stockNuevo,
                motivo: motivo || 'Registro manual'
            });
            
            if (movementResult.success) {
                alert('Movimiento registrado exitosamente');
                displayMovements();
                updateMovementsSummary();
                loadProducts(); // Actualizar lista de productos
                updateDashboardKPIs();
                initMovementsChart(); // Actualizar gráfico con datos reales
                
                var modal = bootstrap.Modal.getInstance(document.getElementById('movementModal'));
                if (modal) modal.hide();
            } else {
                alert('Stock actualizado pero error al registrar movimiento: ' + movementResult.message);
            }
        } else {
            alert('Error: ' + result.message);
        }
    }

    function applyMovementFilters() {
        var tipo = document.getElementById('filterMovTipo').value;
        var fechaDesde = document.getElementById('filterMovFechaDesde').value;
        var fechaHasta = document.getElementById('filterMovFechaHasta').value;
        
        var movements = MarketWorld.data.getInventoryMovements();
        
        var filtered = movements.filter(function(mov) {
            var matchTipo = !tipo || mov.tipo === tipo;
            
            var matchFecha = true;
            if (fechaDesde) {
                matchFecha = matchFecha && new Date(mov.fecha) >= new Date(fechaDesde);
            }
            if (fechaHasta) {
                var hasta = new Date(fechaHasta);
                hasta.setHours(23, 59, 59);
                matchFecha = matchFecha && new Date(mov.fecha) <= hasta;
            }
            
            return matchTipo && matchFecha;
        });
        
        displayFilteredMovements(filtered);
    }

    function displayFilteredMovements(filtered) {
        var container = document.getElementById('movementsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (filtered.length === 0) {
            container.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No se encontraron movimientos con los filtros seleccionados</td></tr>';
            return;
        }
        
        filtered.forEach(function(mov) {
            var row = document.createElement('tr');
            
            var tipoBadge = mov.tipo === 'entrada' ? 'success' : 
                           mov.tipo === 'salida' ? 'danger' : 'warning';
            var tipoIcon = mov.tipo === 'entrada' ? '↑' : 
                          mov.tipo === 'salida' ? '↓' : '⚡';
            
            row.innerHTML = `
                <td>${formatDate(mov.fecha)}</td>
                <td><span class="badge bg-${tipoBadge}">${tipoIcon} ${mov.tipo.toUpperCase()}</span></td>
                <td>${mov.productoNombre}</td>
                <td><strong>${mov.cantidad}</strong></td>
                <td>${mov.stockAnterior}</td>
                <td><strong>${mov.stockNuevo}</strong></td>
                <td>${mov.usuario}</td>
                <td>${mov.motivo || '<span class="text-muted">-</span>'}</td>
            `;
            
            container.appendChild(row);
        });
    }

    function updateMovementsSummary() {
        var movements = MarketWorld.data.getInventoryMovements();
        
        var entradas = movements.filter(function(m) { return m.tipo === 'entrada'; });
        var salidas = movements.filter(function(m) { return m.tipo === 'salida'; });
        
        var totalEntradas = entradas.reduce(function(sum, m) { return sum + m.cantidad; }, 0);
        var totalSalidas = salidas.reduce(function(sum, m) { return sum + m.cantidad; }, 0);
        
        var elEntradas = document.getElementById('totalEntradas');
        var elSalidas = document.getElementById('totalSalidas');
        var elTotal = document.getElementById('totalMovimientos');
        
        if (elEntradas) elEntradas.textContent = totalEntradas.toLocaleString('es-CO');
        if (elSalidas) elSalidas.textContent = totalSalidas.toLocaleString('es-CO');
        if (elTotal) elTotal.textContent = movements.length.toLocaleString('es-CO');
    }

    function resetMovementForm() {
        document.getElementById('movementTipo').value = '';
        document.getElementById('movementProducto').value = '';
        document.getElementById('movementCantidad').value = '';
        document.getElementById('movementMotivo').value = '';
    }

    function formatDate(isoDate) {
        var date = new Date(isoDate);
        return date.toLocaleDateString('es-CO', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

})();
