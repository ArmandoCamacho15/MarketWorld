// inventario.js - Gestion de inventario y productos

(function() {
    'use strict';

    var inventoryState = {
        products: [],
        source: 'local'
    };

    var inventoryPaginationState = {
        page: 1,
        perPage: 9,
        lastPage: 1,
        total: 0,
        filters: {},
        isServerMode: false,
    };

    function hasProductApi() {
        return typeof MarketWorld !== 'undefined' &&
            typeof MarketWorld.api !== 'undefined' &&
            MarketWorld.api.products;
    }

    function mapApiProductToFrontend(apiProduct) {
        return {
            id: apiProduct.id,
            codigo: apiProduct.sku,
            nombre: apiProduct.nombre,
            descripcion: apiProduct.descripcion || '',
            categoria: apiProduct.categoria || 'Sin categoría',
            precio: parseFloat(apiProduct.precio_venta || 0),
            costo: parseFloat(apiProduct.precio_compra || 0),
            stock: parseInt(apiProduct.stock || 0, 10),
            stockMinimo: parseInt(apiProduct.stock_minimo || 0, 10),
            unidad: apiProduct.unidad || 'Unidad',
            proveedor: apiProduct.proveedor || '',
            activo: (apiProduct.estado || 'Activo') === 'Activo',
            fechaCreacion: (apiProduct.created_at || '').split('T')[0] || ''
        };
    }

    function mapFrontendProductToApi(productData) {
        return {
            sku: productData.codigo,
            nombre: productData.nombre,
            descripcion: productData.descripcion || '',
            categoria: productData.categoria,
            precio_compra: parseFloat(productData.costo || 0),
            precio_venta: parseFloat(productData.precio || 0),
            stock: parseInt(productData.stock || 0, 10),
            stock_minimo: parseInt(productData.stockMinimo || 0, 10),
            iva: 19,
            unidad: productData.unidad || 'Unidad',
            proveedor: productData.proveedor || '',
            estado: productData.activo ? 'Activo' : 'Inactivo'
        };
    }

    function normalizeApiListResponse(response, fallbackMeta) {
        if (typeof MarketWorld !== 'undefined' &&
            MarketWorld.api &&
            typeof MarketWorld.api.normalizeListResponse === 'function') {
            return MarketWorld.api.normalizeListResponse(response, fallbackMeta);
        }

        var items = [];
        if (response && Array.isArray(response.data)) {
            items = response.data;
        } else if (Array.isArray(response)) {
            items = response;
        }

        return {
            items: items,
            meta: Object.assign({
                total: items.length,
                per_page: (fallbackMeta && fallbackMeta.per_page) || 9,
                current_page: (fallbackMeta && fallbackMeta.current_page) || 1,
                last_page: 1,
            }, (response && response.meta) || {}),
            success: !response || response.success !== false,
        };
    }

    async function fetchAllPagedApiItems(getter, filters, batchSize, mapper) {
        if (typeof getter !== 'function') {
            return [];
        }

        var items = [];
        var currentPage = 1;
        var lastPage = 1;
        var perPage = Math.max(parseInt(batchSize || 100, 10) || 100, 1);

        while (currentPage <= lastPage) {
            var response = await getter(Object.assign({}, filters || {}, {
                page: currentPage,
                per_page: perPage,
            }));
            var parsed = normalizeApiListResponse(response, {
                per_page: perPage,
                current_page: currentPage,
            });
            var pageItems = Array.isArray(parsed.items) ? parsed.items : [];

            items = items.concat(mapper ? pageItems.map(mapper) : pageItems);
            lastPage = Math.max(parsed.meta && parsed.meta.last_page ? parsed.meta.last_page : 1, lastPage);

            if (pageItems.length === 0) {
                break;
            }

            currentPage += 1;
        }

        return items;
    }

    function setProductsState(products, source) {
        // Normalizar tipos: asegurar que stock y stockMinimo sean números, precio/costo números y activo boolean
        var normalized = [];
        if (Array.isArray(products)) {
            normalized = products.map(function(p) {
                try {
                    return {
                        id: p.id,
                        codigo: p.codigo,
                        nombre: p.nombre,
                        descripcion: p.descripcion || '',
                        categoria: p.categoria || 'Sin categoría',
                        precio: typeof p.precio === 'number' ? p.precio : parseFloat(p.precio) || 0,
                        costo: typeof p.costo === 'number' ? p.costo : parseFloat(p.costo) || 0,
                        stock: parseInt(p.stock || 0, 10) || 0,
                        stockMinimo: parseInt(p.stockMinimo || p.stock_minimo || 0, 10) || 0,
                        unidad: p.unidad || 'Unidad',
                        proveedor: p.proveedor || '',
                        activo: (p.activo === true || String(p.activo).toLowerCase() === 'activo' || String(p.activo) === '1' || p.estado === 'Activo') ? true : !!p.activo,
                        fechaCreacion: p.fechaCreacion || p.created_at || ''
                    };
                } catch (e) {
                    return p;
                }
            });
        }

        inventoryState.products = normalized;
        inventoryState.source = source || 'local';
    }

    function getProductsState() {
        // MIGRADO (03-05-2026): Solo usar estado en memoria (API es fuente de verdad)
        return inventoryState.products.slice();
    }

    function getProductById(id) {
        var products = getProductsState();
        for (var i = 0; i < products.length; i++) {
            if (products[i].id === parseInt(id, 10)) return products[i];
        }
        return null;
    }

    function removeProductFromState(id) {
        var productId = parseInt(id, 10);
        inventoryState.products = inventoryState.products.filter(function(product) {
            return product.id !== productId;
        });
    }

    function getLowStockProductsState(products) {
        var list = products || getProductsState();
        return list.filter(function(p) {
            var s = parseInt(p.stock || 0, 10) || 0;
            var m = parseInt(p.stockMinimo || p.stock_minimo || 0, 10) || 0;
            return (!!p.activo) && (s <= m);
        });
    }

    function parseHttpStatus(error) {
        if (error && typeof error.status === 'number') return error.status;
        var msg = (error && error.message) ? error.message : '';
        var match = msg.match(/HTTP\s*(\d{3})/i);
        return match ? parseInt(match[1], 10) : null;
    }

    function isConnectivityError(error) {
        var status = parseHttpStatus(error);
        if (status) return false;
        var msg = ((error && error.message) ? error.message : '').toLowerCase();
        return msg.includes('failed to fetch') || msg.includes('network') || msg.includes('timeout') || msg.includes('load failed');
    }

    function showApiError(error, fallbackMessage) {
        var status = parseHttpStatus(error);
        var body = error.body || {};
        var errorMessage = body.message || error.message || fallbackMessage;

        // Manejo de errores de validación (422) con Bootstrap 5
        if (status === 422 && body.errors) {
            console.warn('Errores de validación:', body.errors);
            highlightFormErrors(body.errors);
            return;
        }

        if (status === 404) {
            alert('No se encontró el recurso solicitado (404). ' + errorMessage);
            return;
        }

        if (status === 409) {
            // Conflicto de negocio: el backend bloquea el borrado porque el producto tiene dependencias.
            alert(errorMessage);
            return;
        }
        
        if (status === 500) {
            alert('Error interno del servidor (500). Revisa logs del backend e intenta nuevamente.');
            return;
        }
        
        alert(errorMessage);
    }

    function highlightFormErrors(errors) {
        // Limpiar errores previos
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        document.querySelectorAll('.invalid-feedback').forEach(el => el.remove());

        // Mapear campos de API a IDs de formulario
        var fieldMap = {
            'sku': 'productCodigo',
            'nombre': 'productNombre',
            'precio_venta': 'productPrecio',
            'precio_compra': 'productCosto',
            'stock': 'productStock'
        };

        Object.keys(errors).forEach(function(key) {
            var fieldId = fieldMap[key] || ('product' + key.charAt(0).toUpperCase() + key.slice(1));
            var input = document.getElementById(fieldId);
            
            if (input) {
                input.classList.add('is-invalid');
                var feedback = document.createElement('div');
                feedback.className = 'invalid-feedback';
                feedback.textContent = errors[key][0]; // Mostrar el primer error
                input.parentNode.appendChild(feedback);
            }
        });

        // Hacer scroll al primer error
        var firstError = document.querySelector('.is-invalid');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        console.log('Modulo Inventario cargado');
        initInventory();
        if (typeof MarketWorld !== 'undefined' && MarketWorld.notifications && MarketWorld.notifications.init) {
            MarketWorld.notifications.init();
        }
    });

    // --- Inicializar inventario ---
    function initInventory() {
        loadProducts();
        initSyncButton();
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

    // ======= BOTÓN DE SINCRONIZACIÓN =======
    function initSyncButton() {
        var btn = document.getElementById('btnSyncProducts');
        if (!btn) return;
        btn.addEventListener('click', function() {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Sincronizando...';
            syncProductsFromBackend().finally(function() {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-arrow-repeat me-2"></i> Sincronizar';
            });
        });
    }

    // ======= SINCRONIZAR PRODUCTOS DESDE BACKEND A LOCAL ====
    function syncProductsFromBackend() {
        // Intentar usar adaptador primero
        if (hasProductApi()) {
            return MarketWorld.api.products.getAll()
                .then(function(response) {
                    if (response && (response.data || Array.isArray(response))) {
                        var apiProducts = response.data || response;
                        var mapped = apiProducts.map(mapApiProductToFrontend);
                        // API es la única fuente de verdad (03-05-2026)
                        setProductsState(mapped, 'api');
                        displayProducts(mapped);
                        showLowStockAlerts();
                        updateDashboardKPIs();
                        console.log('[Sync] Productos sincronizados desde API:', mapped.length);
                        return mapped;
                    }
                    throw new Error('Respuesta API inválida');
                })
                .catch(function(err) {
                    console.warn('[Sync] Error al sincronizar desde API:', err && err.message ? err.message : err);
                    alert('No se pudo sincronizar con el backend. Revisar consola.');
                    return Promise.reject(err);
                });
        }

        // Si no hay API, informar al usuario
        alert('El backend no está disponible o el adaptador no está cargado. No se puede sincronizar.');
        return Promise.resolve([]);
    }

    // --- Cargar productos ---
    function loadProducts(apiFilters) {
        if (hasProductApi()) {
            var requestedPage = parseInt((apiFilters && apiFilters.page) || inventoryPaginationState.page || 1, 10);
            var requestedPerPage = parseInt((apiFilters && apiFilters.per_page) || inventoryPaginationState.perPage || 9, 10);
            var normalizedFilters = Object.assign({}, apiFilters || {}, {
                page: requestedPage,
                per_page: requestedPerPage,
            });

            return MarketWorld.api.products.getAll(normalizedFilters)
                .then(function(response) {
                    var parsed = normalizeApiListResponse(response, {
                        current_page: requestedPage,
                        per_page: requestedPerPage,
                    });

                    if (parsed.success) {
                        var mappedProducts = parsed.items.map(mapApiProductToFrontend);

                        setProductsState(mappedProducts, 'api');
                        inventoryPaginationState.isServerMode = true;
                        inventoryPaginationState.page = parsed.meta.current_page;
                        inventoryPaginationState.perPage = parsed.meta.per_page;
                        inventoryPaginationState.lastPage = parsed.meta.last_page;
                        inventoryPaginationState.total = parsed.meta.total;

                        displayProducts(mappedProducts);
                        updatePaginationUI(parsed.meta.last_page);
                        showLowStockAlerts();
                        updateDashboardKPIs();
                        console.log('[API] Productos cargados desde MySQL:', parsed.meta.total);
                        return mappedProducts;
                    }
                    return [];
                })
                .catch(function(err) {
                    // ERROR: API no disponible. Mostrar error en lugar de usar un respaldo local
                    console.error('[API] Error fatal al obtener productos:', err);
                    showApiError(err, 'No se pudo cargar los productos. Verifica la conexión al servidor.');
                    var products = [];
                    setProductsState(products, 'local');
                    inventoryPaginationState.isServerMode = false;
                    inventoryPaginationState.page = 1;
                    inventoryPaginationState.lastPage = Math.max(1, Math.ceil(products.length / inventoryPaginationState.perPage));
                    inventoryPaginationState.total = products.length;
                    displayProducts(products);
                    updatePaginationUI(inventoryPaginationState.lastPage);
                    showLowStockAlerts();
                    updateDashboardKPIs();
                    return products;
                });
        }

        // MIGRADO (03-05-2026): usar estado en memoria (del último sync), no data.js
        var localProducts = getProductsState();
        setProductsState(localProducts, 'local');
        inventoryPaginationState.isServerMode = false;
        inventoryPaginationState.page = 1;
        inventoryPaginationState.lastPage = Math.max(1, Math.ceil(localProducts.length / inventoryPaginationState.perPage));
        inventoryPaginationState.total = localProducts.length;
        displayProducts(localProducts);
        updatePaginationUI(inventoryPaginationState.lastPage);
        showLowStockAlerts();
        updateDashboardKPIs();
        return Promise.resolve(localProducts);
    }

    // --- Mostrar productos ---
    function displayProducts(products) {
        var container = document.getElementById('productsList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (!products || products.length === 0) {
            container.innerHTML = '<div class="col-12"><div class="alert alert-info text-center"><i class="bi bi-info-circle me-2"></i> No hay productos que coincidan con los filtros</div></div>';
            return;
        }
        
        products.forEach(function(product) {
            try {
                var productCard = createProductCard(product);
                container.appendChild(productCard);
            } catch (err) {
                console.error('Error renderizando producto:', product, err);
            }
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
            '<div class="alert alert-danger alert-sm mb-2 stock-low"><i class="bi bi-exclamation-triangle me-1"></i> Stock bajo</div>' : '';
        
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
                        <button class="btn btn-sm btn-outline-primary btn-view-product" data-product-id="${product.id}" title="Ver detalle">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-info btn-adjust-stock" data-product-id="${product.id}" title="Ajustar stock">
                            <i class="bi bi-box"></i>
                        </button>
                        <!-- MIGRADO (03-05-2026): Validación de permisos removida del frontend. El backend valida. -->
                        <button class="btn btn-sm btn-outline-dark btn-adjust-cost" data-product-id="${product.id}" title="Ajustar costo (requiere admin)">
                            <i class="bi bi-currency-dollar"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning btn-edit-product" data-product-id="${product.id}" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete-product" data-product-id="${product.id}" title="Eliminar">
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
            // Forzar que el campo de costo sea solo lectura en UI (no editable por el usuario)
            try {
                costoInput.readOnly = true;
                costoInput.setAttribute('aria-readonly', 'true');
                costoInput.style.backgroundColor = '#e9ecef';
                costoInput.style.cursor = 'not-allowed';
            } catch (e) {
                console.warn('No se pudo forzar readonly en productCosto:', e && e.message ? e.message : e);
            }
            
            precioInput.addEventListener('input', calculateMargin);
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
            
            if (target.classList.contains('btn-view-product')) {
                viewProduct(parseInt(productId));
            } else if (target.classList.contains('btn-edit-product')) {
                editProduct(parseInt(productId));
            } else if (target.classList.contains('btn-adjust-cost')) {
                openAdjustCostModal(parseInt(productId));
            } else if (target.classList.contains('btn-delete-product')) {
                deleteProductConfirm(parseInt(productId));
            } else if (target.classList.contains('btn-adjust-stock')) {
                showStockModal(parseInt(productId));
            }
        });
    }

    // Abrir modal de ajuste de costo (solo para administradores)
    function openAdjustCostModal(id) {
        var product = getProductById(id);
        if (!product) {
            alert('Producto no encontrado');
            return;
        }

        // MIGRADO (03-05-2026): Validación de permisos ahora es responsabilidad del backend
        // El frontend no necesita validar rol; si falla, el backend retorna 403

        document.getElementById('adjustProductId').value = product.id;
        document.getElementById('adjustProductName').textContent = product.nombre + ' (' + product.codigo + ')';
        document.getElementById('currentCost').textContent = '$' + formatCurrency(product.costo);
        document.getElementById('newCostInput').value = '';
        document.getElementById('adjustReason').value = '';

        var modalEl = document.getElementById('adjustCostModal');
        var modal = new bootstrap.Modal(modalEl);
        modal.show();
    }

    // Manejar envío del formulario de ajuste de costo
    (function attachAdjustCostSubmit() {
        var attach = function() {
            var form = document.getElementById('adjustCostForm');
            if (!form) return;
            form.addEventListener('submit', function(e) {
                e.preventDefault();

                var pid = document.getElementById('adjustProductId').value;
                var newCost = parseFloat(document.getElementById('newCostInput').value);
                var reason = document.getElementById('adjustReason').value.trim();

                if (isNaN(newCost) || newCost < 0) {
                    alert('Ingresa un costo válido');
                    return;
                }
                if (!reason) {
                    alert('Ingresa el motivo del ajuste');
                    return;
                }

                var submitBtn = form.querySelector('button[type="submit"]');
                var originalText = submitBtn ? submitBtn.innerHTML : null;
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Registrando...';
                }

                if (hasProductApi()) {
                    MarketWorld.api.products.adjustCost(pid, { new_cost: newCost, reason: reason })
                        .then(function(response) {
                            if (response.success) {
                                alert(response.message || 'Ajuste registrado correctamente');
                                var modalEl = document.getElementById('adjustCostModal');
                                var modal = bootstrap.Modal.getInstance(modalEl);
                                if (modal) modal.hide();
                                loadProducts();
                            } else {
                                alert('Error: ' + (response.message || 'No se pudo registrar el ajuste'));
                            }
                        })
                        .catch(function(err) {
                            showApiError(err, 'No se pudo registrar el ajuste de costo.');
                        })
                        .finally(function() {
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                if (originalText) submitBtn.innerHTML = originalText;
                            }
                        });
                } else {
                    alert('Funcionalidad no disponible en modo local');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        if (originalText) submitBtn.innerHTML = originalText;
                    }
                }
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', attach);
        } else {
            attach();
        }
    })();

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
        
        var onSuccess = function(message) {
            alert(message);
            loadProducts().then(function() {
                showLowStockAlerts();
                updateDashboardKPIs();
            });

            if (typeof MarketWorld.notifications !== 'undefined') {
                MarketWorld.notifications.checkLowStock();
                if (!productId) {
                    MarketWorld.notifications.notifyProductCreated(nombre);
                }
            }

            var modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
            if (modal) modal.hide();
        };

        if (hasProductApi()) {
            var payload = mapFrontendProductToApi(productData);
            // No permitir actualizar costo directamente desde el formulario de edición
            if (productId) {
                delete payload.precio_compra;
            }
            var saveButton = document.querySelector('#productForm button[type="submit"]') || 
                            document.querySelector('#btnSaveProduct');
            var originalHtml = null;
            if (saveButton) {
                originalHtml = saveButton.innerHTML;
                saveButton.disabled = true;
                saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Guardando...';
            }

            var request = productId
                ? MarketWorld.api.products.update(productId, payload)
                : MarketWorld.api.products.create(payload);

            request
                .then(function(response) {
                    if (response && response.success) {
                        onSuccess(response.message || 'Producto guardado correctamente');
                    } else {
                        if (saveButton) {
                            saveButton.disabled = false;
                            saveButton.innerHTML = originalHtml;
                        }
                        var msg = (response && response.message) ? response.message : 'No se pudo guardar el producto.';
                        alert('Error: ' + msg);
                    }
                })
                .catch(function(err) {
                    if (saveButton) {
                        saveButton.disabled = false;
                        saveButton.innerHTML = originalHtml;
                    }

                    // MIGRADO (03-05-2026): Sin fallback a data.js — mostrar error y no guardar localmente
                    showApiError(err, 'No se pudo guardar el producto en la API. Verifica la conexión al servidor.');
                })
                .finally(function() {
                    if (saveButton) {
                        saveButton.disabled = false;
                        saveButton.innerHTML = originalHtml;
                    }
                });
            return;
        }

        // MIGRADO (03-05-2026): Si NO hay API, mostrar error en lugar de fallback a data.js
        showApiError(null, 'El adaptador de API no está disponible. Recarga la página.');
    }

    // ======= VER DETALLE DE PRODUCTO =======
    function viewProduct(id) {
        if (!hasProductApi()) {
            alert('Funcionalidad no disponible en modo local');
            return;
        }

        MarketWorld.api.products.getById(id)
            .then(function(response) {
                if (response && response.success && response.data) {
                    var p = response.data;
                    var container = document.getElementById('detailContent');
                    if (!container) return;

                    var statusBadge = (p.estado === 'Activo') ? 
                        '<span class="badge bg-success">Activo</span>' : 
                        '<span class="badge bg-secondary">Inactivo</span>';

                    container.innerHTML = `
                        <div class="col-md-5 text-center mb-3">
                            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(p.nombre)}&size=200&background=random" class="img-fluid rounded shadow-sm" alt="${p.nombre}">
                        </div>
                        <div class="col-md-7">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <h4 class="mb-0">${p.nombre}</h4>
                                ${statusBadge}
                            </div>
                            <p class="text-muted mb-3">SKU: <strong>${p.sku}</strong></p>
                            <div class="mb-3">
                                <h6>Descripción</h6>
                                <p>${p.descripcion || 'Sin descripción'}</p>
                            </div>
                            <div class="row mb-3">
                                <div class="col-6">
                                    <small class="text-muted d-block">Categoría</small>
                                    <strong>${p.categoria || 'Sin categoría'}</strong>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted d-block">Unidad</small>
                                    <strong>${p.unidad || 'Unidad'}</strong>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-6">
                                    <small class="text-muted d-block">Precio Venta</small>
                                    <strong class="text-success fs-5">$${formatCurrency(p.precio_venta)}</strong>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted d-block">Costo Actual</small>
                                    <strong>$${formatCurrency(p.precio_compra)}</strong>
                                </div>
                            </div>
                            <div class="row mb-3 p-2 bg-light rounded">
                                <div class="col-4">
                                    <small class="text-muted d-block">Stock</small>
                                    <strong class="${p.stock <= p.stock_minimo ? 'text-danger' : 'text-success'}">${p.stock}</strong>
                                </div>
                                <div class="col-4">
                                    <small class="text-muted d-block">Mínimo</small>
                                    <strong>${p.stock_minimo}</strong>
                                </div>
                                <div class="col-4">
                                    <small class="text-muted d-block">Proveedor</small>
                                    <strong>${p.proveedor || 'N/A'}</strong>
                                </div>
                            </div>
                        </div>
                    `;

                    var btnEdit = document.getElementById('btnEditFromDetail');
                    if (btnEdit) {
                        btnEdit.onclick = function() {
                            var modal = bootstrap.Modal.getInstance(document.getElementById('productDetailModal'));
                            if (modal) modal.hide();
                            editProduct(p.id);
                        };
                    }

                    var detailModal = new bootstrap.Modal(document.getElementById('productDetailModal'));
                    detailModal.show();
                }
            })
            .catch(function(err) {
                showApiError(err, 'No se pudo cargar el detalle del producto.');
            });
    }

    // ======= EDITAR PRODUCTO =======
    function editProduct(id) {
        if (!hasProductApi()) {
            // Fallback local si no hay API
            var product = getProductById(id);
            if (!product) return;
            populateProductForm(product);
            return;
        }

        // Bloquear UI o mostrar spinner si fuera necesario
        MarketWorld.api.products.getById(id)
            .then(function(response) {
                if (response && response.success && response.data) {
                    var p = mapApiProductToFrontend(response.data);
                    populateProductForm(p);
                }
            })
            .catch(function(err) {
                showApiError(err, 'No se pudo obtener la información actualizada del producto.');
            });
    }

    function populateProductForm(product) {
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
        
        // El stock no es editable en productos existentes
        var stockInput = document.getElementById('productStock');
        if (stockInput) {
            stockInput.readOnly = true;
            stockInput.style.backgroundColor = '#e9ecef';
            stockInput.style.cursor = 'not-allowed';
            stockInput.title = 'El stock solo se modifica mediante compras';
        }
        
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
        var product = getProductById(id);
        if (!product) return;
        
        if (confirm('¿ELIMINAR el producto "' + product.nombre + '"?\n\nEsta acción no se puede deshacer.')) {
            var productName = product.nombre;

            if (hasProductApi()) {
                MarketWorld.api.products.delete(id)
                    .then(function(response) {
                        if (response.success) {
                            alert(response.message || 'Producto eliminado correctamente');
                            // Refresco visual inmediato sin esperar un reload completo.
                            removeProductFromState(id);
                            displayProducts(getFilteredProducts());
                            return loadProducts(Object.assign({}, inventoryPaginationState.filters, {
                                page: inventoryPaginationState.page,
                                per_page: inventoryPaginationState.perPage,
                            }));
                        }
                    })
                    .then(function() {
                        showLowStockAlerts();
                        updateDashboardKPIs();
                        if (typeof MarketWorld.notifications !== 'undefined') {
                            MarketWorld.notifications.notifyProductDeleted(productName);
                        }
                    })
                    .catch(function(err) {
                        // MIGRADO (03-05-2026): Sin fallback a data.js — mostrar error
                        showApiError(err, 'No se pudo eliminar el producto. Verifica la conexión al servidor.');
                    });
                return;
            }

            // MIGRADO (03-05-2026): Si NO hay API, mostrar error
            showApiError(null, 'El adaptador de API no está disponible. Recarga la página.');
        }
    }

    // ======= MOSTRAR MODAL DE AJUSTE DE STOCK =======
    function showStockModal(id) {
        MarketWorld.api.products.getById(id)
            .then(function(response) {
                if (response && response.success && response.data) {
                    var product = response.data;
                    document.getElementById('stockAdjProductId').value = product.id;
                    document.getElementById('stockAdjProductName').textContent = product.nombre;
                    document.getElementById('stockAdjCurrent').value = product.stock;
                    document.getElementById('stockAdjNew').value = product.stock;
                    
                    var modalEl = document.getElementById('stockAdjustmentModal');
                    var modal = new bootstrap.Modal(modalEl);
                    modal.show();
                }
            })
            .catch(function(err) {
                showApiError(err, 'No se pudo obtener el stock actual del producto.');
            });
    }

    // Inicializar el formulario de ajuste de stock
    (function initStockAdjForm() {
        var form = document.getElementById('stockAdjustmentForm');
        if (!form) return;
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            var id = document.getElementById('stockAdjProductId').value;
            var newStock = parseInt(document.getElementById('stockAdjNew').value);
            
            if (isNaN(newStock) || newStock < 0) {
                alert('Por favor ingresa un stock válido');
                return;
            }
            
            MarketWorld.api.products.update(id, { stock: newStock })
                .then(function(response) {
                    if (response && response.success) {
                        alert(response.message || 'Stock actualizado correctamente');
                        loadProducts();
                        updateDashboardKPIs();
                        showLowStockAlerts();
                        
                        var modalEl = document.getElementById('stockAdjustmentModal');
                        var modal = bootstrap.Modal.getInstance(modalEl);
                        if (modal) modal.hide();
                    }
                })
                .catch(function(err) {
                    showApiError(err, 'No se pudo actualizar el stock.');
                });
        });
    })();

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
        
        // El stock inicial SÍ es editable al crear un producto nuevo
        var stockInput = document.getElementById('productStock');
        if (stockInput) {
            stockInput.readOnly = false;
            stockInput.style.backgroundColor = '';
            stockInput.style.cursor = '';
            stockInput.title = 'Stock inicial del producto';
        }
        
        var margenSpan = document.getElementById('margenCalculado');
        if (margenSpan) margenSpan.textContent = '0%';
    }

    // ======= CARGAR CATEGORÍAS EN SELECT =======
    function loadCategories() {
        if (!MarketWorld.api || !MarketWorld.api.categories) return;

        MarketWorld.api.categories.getAll()
            .then(function(response) {
                if (response && response.success && response.data) {
                    var categories = response.data;
                    var select = document.getElementById('productCategoria');
                    var filterSelect = document.getElementById('filterCategoria');
                    
                    if (select) {
                        select.innerHTML = '<option value="">Seleccionar categoría...</option>';
                        categories.forEach(function(cat) {
                            if (cat.activo) {
                                var option = document.createElement('option');
                                option.value = cat.nombre;
                                option.textContent = cat.nombre;
                                select.appendChild(option);
                            }
                        });
                    }
                    
                    if (filterSelect) {
                        var currentValue = filterSelect.value;
                        filterSelect.innerHTML = '<option value="">Todas las categorías</option>';
                        categories.forEach(function(cat) {
                            if (cat.activo) {
                                var option = document.createElement('option');
                                option.value = cat.nombre;
                                option.textContent = cat.nombre;
                                filterSelect.appendChild(option);
                            }
                        });
                        filterSelect.value = currentValue;
                    }
                }
            })
            .catch(function(err) {
                console.error('Error al cargar categorías para selects:', err);
            });
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
        
        var apiFilters = {};
        if (search) apiFilters.search = search;
        if (categoria) apiFilters.categoria = categoria;
        if (estado) apiFilters.estado = estado === 'activo' ? 'Activo' : 'Inactivo';
        if (stock === 'bajo') apiFilters.stock_bajo = 1;

        var applyClientStockFilter = function(products) {
            var filtered = products.filter(function(product) {
                var matchStock = !stock ||
                    (stock === 'bajo' && product.stock <= product.stockMinimo) ||
                    (stock === 'ok' && product.stock > product.stockMinimo);

                return matchStock;
            });

            displayProducts(filtered);
        };

        if (hasProductApi()) {
            inventoryPaginationState.filters = Object.assign({}, apiFilters);
            inventoryPaginationState.page = 1;

            var requestFilters = Object.assign({}, inventoryPaginationState.filters, {
                page: inventoryPaginationState.page,
                per_page: inventoryPaginationState.perPage,
            });

            MarketWorld.api.products.getAll(requestFilters)
                .then(function(response) {
                    var parsed = normalizeApiListResponse(response, {
                        current_page: inventoryPaginationState.page,
                        per_page: inventoryPaginationState.perPage,
                    });

                    if (parsed.success) {
                        var mapped = parsed.items.map(mapApiProductToFrontend);

                        setProductsState(mapped, 'api');
                        inventoryPaginationState.isServerMode = true;
                        inventoryPaginationState.page = parsed.meta.current_page;
                        inventoryPaginationState.lastPage = parsed.meta.last_page;
                        inventoryPaginationState.total = parsed.meta.total;

                        applyClientStockFilter(mapped);
                        updatePaginationUI(parsed.meta.last_page);
                    }
                })
                .catch(function(err) {
                    if (isConnectivityError(err)) {
                        var products = getProductsState();  // MIGRADO: usar estado sincronizado desde API
                        setProductsState(products, 'local');
                        inventoryPaginationState.isServerMode = false;
                        inventoryPaginationState.page = 1;
                        inventoryPaginationState.lastPage = Math.max(1, Math.ceil(products.length / inventoryPaginationState.perPage));
                        inventoryPaginationState.total = products.length;

                        var fallbackFiltered = products.filter(function(product) {
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

                        displayProducts(fallbackFiltered);
                        updatePaginationUI(Math.max(1, Math.ceil(fallbackFiltered.length / inventoryPaginationState.perPage)));
                        return;
                    }

                    showApiError(err, 'No se pudieron aplicar los filtros sobre la API.');
                });
            return;
        }

        var products = getProductsState();
        setProductsState(products, 'local');
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
        var lowStockProducts = getLowStockProductsState();
        var alertContainer = document.getElementById('lowStockAlerts');
        
        if (!alertContainer) return;
        
        // Diagnóstico: loguear productos con stock bajo y tipos
        try {
            console.log('[Inventario] lowStockProducts count:', lowStockProducts.length);
            if (lowStockProducts.length > 0) {
                lowStockProducts.slice(0,5).forEach(function(p, idx) {
                    console.log('[Inventario] lowStock sample', idx, { id: p.id, codigo: p.codigo, nombre: p.nombre, stock: p.stock, stockMinimo: p.stockMinimo, types: { stock: typeof p.stock, stockMinimo: typeof p.stockMinimo } });
                });
            }
        } catch (e) {
            console.warn('[Inventario] diagnóstico lowStock fallo:', e && e.message ? e.message : e);
        }

        if (lowStockProducts.length === 0) {
            alertContainer.innerHTML = '<div class="alert alert-success"><i class="bi bi-check-circle me-2"></i> Todos los productos tienen stock suficiente</div>';
            return;
        }
        
        var html = '<div class="alert alert-danger stock-low"><i class="bi bi-exclamation-triangle me-2"></i> <strong>' + lowStockProducts.length + ' producto(s) con stock bajo:</strong><ul class="mb-0 mt-2">';
        lowStockProducts.forEach(function(product) {
            html += '<li>' +
                '<a href="#" class="low-stock-link" data-product-id="' + product.id + '">' + product.nombre + ' (' + product.codigo + ')</a>' +
                ' - Stock: ' + product.stock + ' (Mínimo: ' + product.stockMinimo + ')' +
                '</li>';
        });
        html += '</ul></div>';
        alertContainer.innerHTML = html;

        // Añadir evento para resaltar producto al hacer clic en el enlace
        var links = alertContainer.querySelectorAll('.low-stock-link');
        links.forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                var pid = link.getAttribute('data-product-id');
                var card = document.querySelector('[data-product-id="' + pid + '"]');
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.classList.add('border', 'border-danger', 'shadow');
                    setTimeout(function() {
                        card.classList.remove('border', 'border-danger', 'shadow');
                    }, 2000);
                }
            });
        });
    }

    // Actualizar KPIs del dashboard
    function updateDashboardKPIs() {
        var products = getProductsState();
        var lowStockProducts = getLowStockProductsState(products);
        
        // Total de productos activos
        var activeProducts = products.filter(function(p) { return p.activo; });
        var totalProductos = activeProducts.length;
        
        // Valor total del inventario (costo unitario * stock)
        // Usar `costo` (mapeado desde `precio_compra`) si está disponible; fallback a `precio` si no.
        var valorTotal = products.reduce(function(sum, product) {
            var unitCost = (typeof product.costo === 'number' && !isNaN(product.costo)) ? product.costo : (parseFloat(product.costo) || 0);
            if (!unitCost) {
                unitCost = (typeof product.precio === 'number' && !isNaN(product.precio)) ? product.precio : (parseFloat(product.precio) || 0);
            }
            var stock = parseFloat(product.stock || 0) || 0;
            return sum + (unitCost * stock);
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
                    var promises = [];
                    
                    products.forEach(function(product) {
                        var p = MarketWorld.api.products.create(product)
                            .then(function() { imported++; })
                            .catch(function() { errors++; });
                        promises.push(p);
                    });
                    
                    Promise.all(promises).then(function() {
                        hideLoadingOverlay();
                        alert('Importación completada\n\n' +
                              'Productos importados: ' + imported + '\n' +
                              'Errores: ' + errors);
                        
                        loadProducts();
                        updateDashboardKPIs();
                        showLowStockAlerts();
                    });
                    
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
        showLoadingOverlay('Generando archivo...');
        
        var fetchProducts;
        if (hasProductApi()) {
            fetchProducts = fetchAllPagedApiItems(MarketWorld.api.products.getAll, {}, 100, mapApiProductToFrontend);
        } else {
            fetchProducts = Promise.resolve(getProductsState());
        }

        fetchProducts.then(function(products) {
            if (products.length === 0) {
                hideLoadingOverlay();
                alert('No hay productos para exportar');
                return;
            }
            
            // Generar CSV (unificado: separador ;, BOM, campos entrecomillados)
            var sep = ';';
            var csv = '\uFEFF'; // BOM para Excel
            csv += ['Código','Nombre','Descripción','Categoría','Precio Venta','Costo','Stock','Stock Mínimo','Unidad','Proveedor','Activo'].map(function(h){ return '"'+h+'"'; }).join(sep) + '\n';

            products.forEach(function(product) {
                var precio = (product.precio != null) ? String(product.precio).replace('.', ',') : '';
                var costo = (product.costo != null) ? String(product.costo).replace('.', ',') : '';
                csv += [
                    '"' + (product.codigo || '') + '"',
                    '"' + (product.nombre || '').replace(/"/g, '""') + '"',
                    '"' + (product.descripcion || '').replace(/"/g, '""') + '"',
                    '"' + (product.categoria || '') + '"',
                    '"' + precio + '"',
                    '"' + costo + '"',
                    '"' + (product.stock || 0) + '"',
                    '"' + (product.stockMinimo || 0) + '"',
                    '"' + (product.unidad || '') + '"',
                    '"' + (product.proveedor || '').replace(/"/g, '""') + '"',
                    '"' + (product.activo ? 'Sí' : 'No') + '"'
                ].join(sep) + '\n';
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
        }).catch(function(err) {
            hideLoadingOverlay();
            showApiError(err, 'No se pudo generar la exportación.');
        });
    }

    // Variables de paginación
    // La paginación ahora usa inventoryPaginationState unificado para evitar inconsistencias.

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

        if (inventoryPaginationState.isServerMode && hasProductApi()) {
            var targetPage = inventoryPaginationState.page;

            if (text === 'Anterior' && targetPage > 1) {
                targetPage--;
            } else if (text === 'Siguiente' && targetPage < inventoryPaginationState.lastPage) {
                targetPage++;
            } else if (!isNaN(parseInt(text, 10))) {
                targetPage = parseInt(text, 10);
            }

            if (targetPage === inventoryPaginationState.page) {
                return;
            }

            inventoryPaginationState.page = targetPage;
            var requestFilters = Object.assign({}, inventoryPaginationState.filters, {
                page: targetPage,
                per_page: inventoryPaginationState.perPage,
            });

            loadProducts(requestFilters);
            return;
        }

        var products = getFilteredProducts();
        var totalPages = Math.max(1, Math.ceil(products.length / inventoryPaginationState.perPage));
        
        if (text === 'Anterior' && inventoryPaginationState.page > 1) {
            inventoryPaginationState.page--;
        } else if (text === 'Siguiente' && inventoryPaginationState.page < totalPages) {
            inventoryPaginationState.page++;
        } else if (!isNaN(parseInt(text))) {
            inventoryPaginationState.page = parseInt(text);
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
        
        var products = getProductsState();  // MIGRADO: usar estado sincronizado desde API
        
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
        var start = (inventoryPaginationState.page - 1) * inventoryPaginationState.perPage;
        var end = start + inventoryPaginationState.perPage;
        var pageProducts = products.slice(start, end);
        
        displayProducts(pageProducts);
    }

    // Actualizar UI de paginación
    function updatePaginationUI(totalPages) {
        var paginationContainer = document.querySelector('.pagination');
        if (!paginationContainer) return;
        
        paginationContainer.innerHTML = '';
        var current = inventoryPaginationState.page;
        
        // Botón Anterior
        var prevLi = document.createElement('li');
        prevLi.className = 'page-item' + (current === 1 ? ' disabled' : '');
        prevLi.innerHTML = '<a class=\"page-link\" href=\"#\" tabindex=\"' + (current === 1 ? '-1' : '0') + '\">Anterior</a>';
        paginationContainer.appendChild(prevLi);
        
        // Números de página
        var startPage = Math.max(1, current - 2);
        var endPage = Math.min(totalPages, current + 2);
        
        for (var i = startPage; i <= endPage; i++) {
            var li = document.createElement('li');
            li.className = 'page-item' + (i === current ? ' active' : '');
            if (i === current) {
                li.innerHTML = '<a class=\"page-link\" href=\"#\" aria-current=\"page\">' + i + '</a>';
            } else {
                li.innerHTML = '<a class=\"page-link\" href=\"#\">' + i + '</a>';
            }
            paginationContainer.appendChild(li);
        }
        
        // Botón Siguiente
        var nextLi = document.createElement('li');
        nextLi.className = 'page-item' + (current === totalPages ? ' disabled' : '');
        nextLi.innerHTML = '<a class=\"page-link\" href=\"#\" tabindex=\"' + (current === totalPages ? '-1' : '0') + '\">Siguiente</a>';
        paginationContainer.appendChild(nextLi);
    }

    // Sobreescribir displayProducts para usar paginación
    var originalDisplayProducts = displayProducts;
    displayProducts = function(products) {
        if (!products || arguments.length === 0) {
            products = getProductsState();
        }

        if (inventoryPaginationState.isServerMode) {
            var currentPage = inventoryPaginationState.page;
            var itemsPerPage = inventoryPaginationState.perPage;
            originalDisplayProducts(products);
            return;
        }
        
        var itemsPerPage = inventoryPaginationState.perPage;
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

    // Cargar pestaña de ajustes
    function loadAjustesTab() {
        var container = document.getElementById('costAdjustmentsList');
        if (!container) return;
        
        container.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border spinner-border-sm text-primary"></div> Cargando...</td></tr>';
        
        MarketWorld.api.products.getCostAdjustments()
            .then(function(response) {
                if (response && response.success && response.data) {
                    var adjustments = response.data;
                    container.innerHTML = '';
                    
                    if (adjustments.length === 0) {
                        container.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay ajustes de costo registrados</td></tr>';
                        return;
                    }
                    
                    adjustments.forEach(function(adj) {
                        var row = document.createElement('tr');
                        
                        var oldCost = parseFloat(adj.old_cost || 0);
                        var newCost = parseFloat(adj.new_cost || 0);
                        var diff = newCost - oldCost;
                        var diffClass = diff > 0 ? 'text-danger' : 'text-success';
                        var diffIcon = diff > 0 ? '↑' : (diff < 0 ? '↓' : '');
                        
                        var userName = adj.user ? (adj.user.nombre + ' ' + (adj.user.apellido || '')) : 'Sistema';
                        var prodName = adj.product ? adj.product.nombre : ('ID: ' + adj.product_id);

                        row.innerHTML = `
                            <td>${formatDate(adj.created_at)}</td>
                            <td>${prodName}</td>
                            <td>$${oldCost.toFixed(2)}</td>
                            <td><strong>$${newCost.toFixed(2)}</strong></td>
                            <td class="${diffClass}">${diffIcon} $${Math.abs(diff).toFixed(2)}</td>
                            <td>${userName}</td>
                            <td>${adj.reason || '-'}</td>
                        `;
                        
                        container.appendChild(row);
                    });
                }
            })
            .catch(function(err) {
                container.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error al cargar ajustes</td></tr>';
            });
    }

    // --- Logout ---
    function logout() {
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
        initTopProductsLists();
        
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
        
        var products = getProductsState();  // MIGRADO: usar estado sincronizado desde API
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
        
        var products = getProductsState();  // MIGRADO: usar estado sincronizado desde API
        var categories = {};
        
        products.forEach(function(product) {
            var cat = product.categoria;
            if (!categories[cat]) {
                categories[cat] = 0;
            }
                // Valorización por categoría basada en costo (precio_compra)
                var unitCostCat = (typeof product.costo === 'number' && !isNaN(product.costo)) ? product.costo : (parseFloat(product.costo) || 0);
                if (!unitCostCat) unitCostCat = (typeof product.precio === 'number' && !isNaN(product.precio)) ? product.precio : (parseFloat(product.precio) || 0);
                categories[cat] += (unitCostCat * (parseFloat(product.stock || 0) || 0));
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

    // Gráfico de movimientos - MIGRADO a API (03-05-2026)
    function initMovementsChart() {
        var canvas = document.getElementById('movementsChart');
        if (!canvas) return;
        
        var ctx = canvas.getContext('2d');
        
        // Destruir gráfico anterior si existe
        if (movementsChart) {
            movementsChart.destroy();
        }
        
        // Cargar movimientos desde API o usar array vacío
        var loadMovements = function() {
            if (typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.movements) {
                return fetchAllPagedApiItems(MarketWorld.api.movements.getAll, {}, 100)
                    .then(function(items) {
                        console.log('[API] Movimientos cargados para gráfico:', items.length);
                        return items;
                    })
                    .catch(function(err) {
                        console.warn('[API] Error al cargar movimientos para gráfico, usando array vacío:', err);
                        return [];
                    });
            } else {
                return Promise.resolve([]);
            }
        };
        
        loadMovements().then(function(movements) {
            // Preparar datos de últimos 30 días
            var days = [];
            var entradas = [];
            var salidas = [];
            var ajustes = [];
            
            for (var i = 29; i >= 0; i--) {
                var date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                
                days.push(date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }));
                
                // Calcular movimientos de ese día
                var entradasDia = 0;
                var salidasDia = 0;
                var ajustesDia = 0;
                
                movements.forEach(function(mov) {
                    var movDate = new Date(mov.created_at || mov.fecha);
                    movDate.setHours(0, 0, 0, 0);
                    
                    if (movDate.getTime() === date.getTime()) {
                        var tipo = normalizeMovementType(mov.tipo).key;
                        if (tipo === 'entrada') {
                            entradasDia += mov.cantidad;
                        } else if (tipo === 'salida') {
                            salidasDia += mov.cantidad;
                        } else if (tipo === 'ajuste') {
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
        });
    }

    function initTopProductsLists() {
        var topList = document.querySelector('.top-products-list');
        var lowList = document.querySelector('.top-products-list.low-rotation');
        if (!topList || !lowList) return;

        topList.innerHTML = '<li class="text-muted">Cargando datos...</li>';
        lowList.innerHTML = '<li class="text-muted">Cargando datos...</li>';

        var products = getProductsState();

        var fetchMovements = function() {
            if (typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.movements) {
                return fetchAllPagedApiItems(MarketWorld.api.movements.getAll, {}, 100)
                    .catch(function(err) {
                        console.warn('[Reportes] No se pudieron cargar movimientos:', err);
                        return [];
                    });
            }
            return Promise.resolve([]);
        };

        fetchMovements().then(function(movements) {
            var totals = {};
            products.forEach(function(product) {
                totals[product.id] = {
                    product: product,
                    salidas: 0,
                };
            });

            movements.forEach(function(mov) {
                var tipo = normalizeMovementType(mov.tipo).key;
                if (tipo !== 'salida') return;

                var productId = mov.product_id || (mov.product && mov.product.id);
                if (!productId) return;

                if (!totals[productId]) {
                    totals[productId] = {
                        product: mov.product ? mapApiProductToFrontend(mov.product) : { nombre: 'Producto ' + productId, precio: 0 },
                        salidas: 0,
                    };
                }

                totals[productId].salidas += Number(mov.cantidad || 0);
            });

            var entries = Object.values(totals);
            var top = entries.slice().sort(function(a, b) { return b.salidas - a.salidas; }).slice(0, 10);
            var low = entries.slice().sort(function(a, b) { return a.salidas - b.salidas; }).slice(0, 5);

            if (top.length === 0) {
                topList.innerHTML = '<li class="text-muted">Sin movimientos de salida registrados</li>';
            } else {
                topList.innerHTML = top.map(function(item, index) {
                    var product = item.product || {};
                    var total = item.salidas || 0;
                    var valor = (Number(product.precio || 0) * total) || 0;

                    return '<li>' +
                        '<div class="product-rank">' + (index + 1) + '</div>' +
                        '<div class="product-info">' +
                            '<div class="fw-bold">' + (product.nombre || 'Sin nombre') + '</div>' +
                            '<div class="text-muted small">' + total + ' unidades vendidas</div>' +
                        '</div>' +
                        '<div class="product-value">$' + formatCurrency(valor) + '</div>' +
                    '</li>';
                }).join('');
            }

            if (low.length === 0) {
                lowList.innerHTML = '<li class="text-muted">Sin datos para calcular rotación</li>';
            } else {
                lowList.innerHTML = low.map(function(item, index) {
                    var product = item.product || {};
                    var total = item.salidas || 0;

                    return '<li>' +
                        '<div class="product-rank">' + (index + 1) + '</div>' +
                        '<div class="product-info">' +
                            '<div class="fw-bold">' + (product.nombre || 'Sin nombre') + '</div>' +
                            '<div class="text-muted small">' + total + ' unidades en 90 días</div>' +
                        '</div>' +
                        '<div class="text-danger">Revisar</div>' +
                    '</li>';
                }).join('');
            }
        });
    }

    function normalizeMovementType(tipo) {
        var normalized = String(tipo || '').toLowerCase();
        if (normalized === 'entrada') {
            return { label: 'Entrada', badge: 'success', icon: '↑', key: 'entrada' };
        }
        if (normalized === 'salida') {
            return { label: 'Salida', badge: 'danger', icon: '↓', key: 'salida' };
        }
        return { label: 'Ajuste', badge: 'warning', icon: '⚡', key: 'ajuste' };
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
        // Reiniciar siempre la paginación desde la primera página al cambiar filtros.
        inventoryPaginationState.page = 1;
        originalApplyFilters();
    };

    // ========================================
    // GESTIÓN DE CATEGORÍAS
    // ========================================

    function displayCategories() {
        var container = document.getElementById('categoriesList');
        if (!container) return;
        
        container.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm text-primary"></div> Cargando...</td></tr>';
        
        MarketWorld.api.categories.getAll()
            .then(function(response) {
                if (response && response.success && response.data) {
                    var categories = response.data;
                    container.innerHTML = '';
                    
                    if (categories.length === 0) {
                        container.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay categorías registradas</td></tr>';
                        return;
                    }
                    
                    categories.forEach(function(category) {
                        var row = document.createElement('tr');
                        row.innerHTML = `
                            <td><strong>${category.nombre}</strong></td>
                            <td>${category.descripcion || '<span class="text-muted">Sin descripción</span>'}</td>
                            <td><span class="badge bg-primary">...</span></td>
                            <td>
                                ${category.activo ? 
                                    '<span class="badge bg-success">Activa</span>' : 
                                    '<span class="badge bg-secondary">Inactiva</span>'}
                            </td>
                            <td>
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-outline-warning btn-edit-category" data-category-id="${category.id}" title="Editar">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-outline-danger btn-delete-category" data-category-id="${category.id}" title="Eliminar">
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
            })
            .catch(function(err) {
                container.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar categorías</td></tr>';
                showApiError(err, 'No se pudieron cargar las categorías.');
            });
    }

    function initCategoryModal() {
        var btnNueva = document.getElementById('btnNuevaCategoria');
        var form = document.getElementById('categoryForm');
        
        if (btnNueva) {
            // Evitar doble binding cuando el usuario abre/cierra tabs múltiples veces.
            if (!btnNueva.dataset.listenerBound) {
                btnNueva.addEventListener('click', function() {
                    resetCategoryForm();
                    document.getElementById('categoryModalLabel').textContent = 'Nueva Categoría';
                });
                btnNueva.dataset.listenerBound = 'true';
            }
        }
        
        if (form) {
            if (!form.dataset.listenerBound) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    saveCategory();
                });
                form.dataset.listenerBound = 'true';
            }
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
            activo: activa
        };
        
        var request;
        if (id) {
            request = MarketWorld.api.categories.update(id, categoryData);
        } else {
            request = MarketWorld.api.categories.create(categoryData);
        }
        
        request
            .then(function(response) {
                if (response && response.success) {
                    alert(response.message || 'Categoría guardada correctamente');
                    displayCategories();
                    loadCategories(); // Actualizar selects de categoría
                    
                    var modalEl = document.getElementById('categoryModal');
                    var modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
            })
            .catch(function(err) {
                showApiError(err, 'No se pudo guardar la categoría.');
            });
    }

    function editCategory(id) {
        MarketWorld.api.categories.getById(id)
            .then(function(response) {
                if (response && response.success && response.data) {
                    var category = response.data;
                    document.getElementById('categoryId').value = category.id;
                    document.getElementById('categoryNombre').value = category.nombre;
                    document.getElementById('categoryDescripcion').value = category.descripcion || '';
                    document.getElementById('categoryActiva').checked = category.activo;
                    
                    document.getElementById('categoryModalLabel').textContent = 'Editar Categoría';
                    
                    var modalEl = document.getElementById('categoryModal');
                    var modal = new bootstrap.Modal(modalEl);
                    modal.show();
                }
            })
            .catch(function(err) {
                showApiError(err, 'No se pudo obtener la información de la categoría.');
            });
    }

    function deleteCategory(id) {
        if (confirm('¿Eliminar esta categoría?\n\nEsta acción no se puede deshacer y fallará si tiene productos asociados.')) {
            MarketWorld.api.categories.delete(id)
                .then(function(response) {
                    if (response && response.success) {
                        alert(response.message || 'Categoría eliminada');
                        displayCategories();
                        loadCategories();
                    }
                })
                .catch(function(err) {
                    showApiError(err, 'No se pudo eliminar la categoría.');
                });
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
        
        container.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner-border spinner-border-sm text-primary"></div> Cargando...</td></tr>';
        
        MarketWorld.api.movements.getAll()
            .then(function(response) {
                if (response && response.success && response.data) {
                    var movements = response.data;
                    container.innerHTML = '';
                    
                    if (movements.length === 0) {
                        container.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay movimientos registrados</td></tr>';
                        return;
                    }
                    
                    movements.forEach(function(mov) {
                        var row = document.createElement('tr');
                        var tipoInfo = normalizeMovementType(mov.tipo);
                        
                        var userName = mov.user ? (mov.user.nombre + ' ' + (mov.user.apellido || '')) : 'Sistema';
                        var prodName = mov.product ? mov.product.nombre : ('ID: ' + mov.product_id);

                        row.innerHTML = `
                            <td>${formatDate(mov.created_at)}</td>
                            <td><span class="badge bg-${tipoInfo.badge}">${tipoInfo.icon} ${tipoInfo.label.toUpperCase()}</span></td>
                            <td>${prodName}</td>
                            <td><strong>${mov.cantidad}</strong></td>
                            <td>${mov.stock_anterior}</td>
                            <td><strong>${mov.stock_nuevo}</strong></td>
                            <td>${userName}</td>
                            <td>${mov.motivo || '<span class="text-muted">-</span>'}</td>
                        `;
                        
                        container.appendChild(row);
                    });
                }
            })
            .catch(function(err) {
                container.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al cargar movimientos</td></tr>';
                console.error('Error movements:', err);
            });
    }

    // DEPRECATED (03-05-2026): Función eliminada - generación de datos fake ya no necesaria
    // El backend es la fuente de verdad; los movimientos deben venir de /api/v1/inventory-movements
    // function generateInitialMovements() { ... }

    function initMovementModal() {
        var btnNuevo = document.getElementById('btnNuevoMovimiento');
        var form = document.getElementById('movementForm');
        
        if (btnNuevo) {
            // Evitar doble binding cuando el usuario abre/cierra tabs múltiples veces.
            if (!btnNuevo.dataset.listenerBound) {
                btnNuevo.addEventListener('click', function() {
                    resetMovementForm();
                    loadProductsToSelect();
                });
                btnNuevo.dataset.listenerBound = 'true';
            }
        }
        
        if (form) {
            if (!form.dataset.listenerBound) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    saveMovement();
                });
                form.dataset.listenerBound = 'true';
            }
        }
        
        // Filtros
        var btnFiltrar = document.getElementById('btnFiltrarMovimientos');
        if (btnFiltrar) {
            if (!btnFiltrar.dataset.listenerBound) {
                btnFiltrar.addEventListener('click', applyMovementFilters);
                btnFiltrar.dataset.listenerBound = 'true';
            }
        }
    }

    function loadProductsToSelect() {
        var select = document.getElementById('movementProducto');
        if (!select) return;
        
        var products = getProductsState();  // MIGRADO: usar estado sincronizado desde API
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
        
        var tipoMap = {
            'entrada': 'Entrada',
            'salida': 'Salida',
            'ajuste': 'Ajuste'
        };
        var movementData = {
            product_id: productoId,
            tipo: tipoMap[tipo] || tipo,
            cantidad: cantidad,
            motivo: motivo || 'Registro manual'
        };
        
        MarketWorld.api.movements.create(movementData)
            .then(function(response) {
                if (response && response.success) {
                    alert(response.message || 'Movimiento registrado exitosamente');
                    displayMovements();
                    updateMovementsSummary();
                    loadProducts(); // Actualizar lista de productos
                    updateDashboardKPIs();
                    if (typeof initMovementsChart === 'function') initMovementsChart();
                    if (typeof initTopProductsLists === 'function') initTopProductsLists();
                    
                    var modalEl = document.getElementById('movementModal');
                    var modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
            })
            .catch(function(err) {
                showApiError(err, 'No se pudo registrar el movimiento.');
            });
    }

    function applyMovementFilters() {
        var tipo = document.getElementById('filterMovTipo').value;
        var fechaDesde = document.getElementById('filterMovFechaDesde').value;
        var fechaHasta = document.getElementById('filterMovFechaHasta').value;
        
        var apiFilters = {};
        if (tipo) {
            var tipoMap = {
                'entrada': 'Entrada',
                'salida': 'Salida',
                'ajuste': 'Ajuste'
            };
            apiFilters.tipo = tipoMap[tipo] || tipo;
        }
        if (fechaDesde) apiFilters.fecha_desde = fechaDesde;
        if (fechaHasta) apiFilters.fecha_hasta = fechaHasta;

        var container = document.getElementById('movementsList');
        if (container) container.innerHTML = '<tr><td colspan="8" class="text-center"><div class="spinner-border spinner-border-sm text-primary"></div> Filtrando...</td></tr>';

        MarketWorld.api.movements.getAll(apiFilters)
            .then(function(response) {
                if (response && response.success && response.data) {
                    displayFilteredMovements(response.data);
                }
            })
            .catch(function(err) {
                if (container) container.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al aplicar filtros</td></tr>';
                showApiError(err, 'No se pudieron filtrar los movimientos.');
            });
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
            var tipoInfo = normalizeMovementType(mov.tipo);
            
            var userName = mov.user ? (mov.user.nombre + ' ' + (mov.user.apellido || '')) : 'Sistema';
            var prodName = mov.product ? mov.product.nombre : ('ID: ' + mov.product_id);

            row.innerHTML = `
                <td>${formatDate(mov.created_at)}</td>
                <td><span class="badge bg-${tipoInfo.badge}">${tipoInfo.icon} ${tipoInfo.label.toUpperCase()}</span></td>
                <td>${prodName}</td>
                <td><strong>${mov.cantidad}</strong></td>
                <td>${mov.stock_anterior}</td>
                <td><strong>${mov.stock_nuevo}</strong></td>
                <td>${userName}</td>
                <td>${mov.motivo || '<span class="text-muted">-</span>'}</td>
            `;
            
            container.appendChild(row);
        });
    }

    function updateMovementsSummary() {
        // MIGRADO (03-05-2026): Cargar movimientos desde API de forma asincrónica
        if (typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.movements) {
            fetchAllPagedApiItems(MarketWorld.api.movements.getAll, {}, 100)
                .then(function(movements) {
                    
                    var entradas = movements.filter(function(m) { return normalizeMovementType(m.tipo).key === 'entrada'; });
                    var salidas = movements.filter(function(m) { return normalizeMovementType(m.tipo).key === 'salida'; });
                    
                    var totalEntradas = entradas.reduce(function(sum, m) { return sum + m.cantidad; }, 0);
                    var totalSalidas = salidas.reduce(function(sum, m) { return sum + m.cantidad; }, 0);
                    
                    var elEntradas = document.getElementById('totalEntradas');
                    var elSalidas = document.getElementById('totalSalidas');
                    var elTotal = document.getElementById('totalMovimientos');
                    
                    if (elEntradas) elEntradas.textContent = totalEntradas.toLocaleString('es-CO');
                    if (elSalidas) elSalidas.textContent = totalSalidas.toLocaleString('es-CO');
                    if (elTotal) elTotal.textContent = movements.length.toLocaleString('es-CO');
                })
                .catch(function(err) {
                    console.warn('Error al cargar resumen de movimientos:', err);
                    // Mostrar ceros en caso de error
                    var elEntradas = document.getElementById('totalEntradas');
                    var elSalidas = document.getElementById('totalSalidas');
                    var elTotal = document.getElementById('totalMovimientos');
                    if (elEntradas) elEntradas.textContent = '0';
                    if (elSalidas) elSalidas.textContent = '0';
                    if (elTotal) elTotal.textContent = '0';
                });
        } else {
            // API no disponible, mostrar valores por defecto
            var elEntradas = document.getElementById('totalEntradas');
            var elSalidas = document.getElementById('totalSalidas');
            var elTotal = document.getElementById('totalMovimientos');
            if (elEntradas) elEntradas.textContent = '0';
            if (elSalidas) elSalidas.textContent = '0';
            if (elTotal) elTotal.textContent = '0';
        }
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
