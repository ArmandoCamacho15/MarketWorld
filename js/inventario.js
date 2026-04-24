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
        if (inventoryState.products.length > 0 || inventoryState.source === 'api') {
            return inventoryState.products.slice();
        }
        return MarketWorld.data.getProducts();
    }

    function getProductById(id) {
        var products = getProductsState();
        for (var i = 0; i < products.length; i++) {
            if (products[i].id === parseInt(id, 10)) return products[i];
        }
        return null;
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
                        // Guardar en localStorage para compatibilidad con otras partes de la app
                        try {
                            localStorage.setItem('marketworld_products', JSON.stringify(mapped));
                        } catch (e) {
                            console.warn('No se pudo guardar productos en localStorage:', e && e.message ? e.message : e);
                        }
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
                    console.warn('[API] Fallo, usando localStorage:', err.message);
                    var products = MarketWorld.data.getProducts();
                    setProductsState(products, 'local');
                    inventoryPaginationState.isServerMode = false;
                    inventoryPaginationState.page = 1;
                    inventoryPaginationState.lastPage = Math.max(1, Math.ceil(products.length / itemsPerPage));
                    inventoryPaginationState.total = products.length;
                    displayProducts(products);
                    updatePaginationUI(inventoryPaginationState.lastPage);
                    showLowStockAlerts();
                    updateDashboardKPIs();
                    return products;
                });
        }

        var localProducts = MarketWorld.data.getProducts();
        setProductsState(localProducts, 'local');
        inventoryPaginationState.isServerMode = false;
        inventoryPaginationState.page = 1;
        inventoryPaginationState.lastPage = Math.max(1, Math.ceil(localProducts.length / itemsPerPage));
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
                        <button class="btn btn-sm btn-outline-primary btn-adjust-stock" data-product-id="${product.id}">
                            <i class="bi bi-plus-minus"></i> Stock
                        </button>
                        ${ (typeof MarketWorld !== 'undefined' && MarketWorld.data && MarketWorld.data.getCurrentUser && MarketWorld.data.getCurrentUser() && MarketWorld.data.getCurrentUser().rol === 'Administrador') ? `
                        <button class="btn btn-sm btn-outline-info btn-adjust-cost" data-product-id="${product.id}">
                            <i class="bi bi-currency-dollar"></i> Costo
                        </button>
                        ` : '' }
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
            
            if (target.classList.contains('btn-edit-product')) {
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

        var currentUser = (typeof MarketWorld !== 'undefined' && MarketWorld.data && MarketWorld.data.getCurrentUser) ? MarketWorld.data.getCurrentUser() : null;
        if (!currentUser || currentUser.rol !== 'Administrador') {
            alert('No tienes permisos para ajustar el costo');
            return;
        }

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

            var token = localStorage.getItem('marketworld_auth_token');
            if (!token) {
                alert('No hay token de autenticación. Inicia sesión nuevamente.');
                return;
            }

            var submitBtn = form.querySelector('button[type="submit"]');
            var originalText = submitBtn ? submitBtn.innerHTML : null;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Registrando...';
            }

            var endpoint = (typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.BASE_URL) ?
                (MarketWorld.api.BASE_URL + '/products/' + pid + '/adjust-cost') :
                ('/api/v1/products/' + pid + '/adjust-cost');

            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ new_cost: newCost, reason: reason })
            })
            .then(function(res) { return res.json().then(function(body) { return { ok: res.ok, status: res.status, body: body }; }); })
            .then(function(resp) {
                if (!resp.ok) {
                    var msg = (resp.body && resp.body.message) ? resp.body.message : 'Error al ajustar costo';
                    throw new Error(msg);
                }

                alert(resp.body.message || 'Ajuste registrado correctamente');
                var modalEl = document.getElementById('adjustCostModal');
                var modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                // Recargar productos desde API
                loadProducts();
            })
            .catch(function(err) {
                console.error('Ajuste fallo:', err && err.message ? err.message : err);
                alert('No se pudo registrar el ajuste: ' + (err && err.message ? err.message : 'error'));
            })
            .finally(function() {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    if (originalText) submitBtn.innerHTML = originalText;
                }
            });
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

                    if (isConnectivityError(err)) {
                        var fallbackResult = productId
                            ? MarketWorld.data.updateProduct(productId, productData)
                            : MarketWorld.data.createProduct(productData);

                        if (fallbackResult.success) {
                            setProductsState(MarketWorld.data.getProducts(), 'local');
                            onSuccess(fallbackResult.message + ' (guardado en modo local)');
                            return;
                        }
                        alert('Error: ' + fallbackResult.message);
                        return;
                    }

                    showApiError(err, 'No se pudo guardar el producto en la API.');
                })
                .finally(function() {
                    if (saveButton) {
                        saveButton.disabled = false;
                        saveButton.innerHTML = originalHtml;
                    }
                });
            return;
        }

        var localResult = productId
            ? MarketWorld.data.updateProduct(productId, productData)
            : MarketWorld.data.createProduct(productData);

        if (localResult.success) {
            setProductsState(MarketWorld.data.getProducts(), 'local');
            onSuccess(localResult.message);
        } else {
            alert('Error: ' + localResult.message);
        }
    }

    // ======= EDITAR PRODUCTO =======
    function editProduct(id) {
        var product = getProductById(id);
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
        var product = getProductById(id);
        if (!product) return;
        
        if (confirm('¿ELIMINAR el producto "' + product.nombre + '"?\n\nEsta acción no se puede deshacer.')) {
            var productName = product.nombre;

            if (hasProductApi()) {
                MarketWorld.api.products.delete(id)
                    .then(function(response) {
                        if (response.success) {
                            alert(response.message || 'Producto eliminado correctamente');
                            return loadProducts();
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
                        if (isConnectivityError(err)) {
                            var fallbackResult = MarketWorld.data.deleteProduct(id);
                            if (fallbackResult.success) {
                                setProductsState(MarketWorld.data.getProducts(), 'local');
                                alert(fallbackResult.message + ' (modo local)');
                                loadProducts();
                                showLowStockAlerts();
                                updateDashboardKPIs();
                                return;
                            }
                            alert('Error: ' + fallbackResult.message);
                            return;
                        }
                        showApiError(err, 'No se pudo eliminar el producto.');
                    });
                return;
            }

            var result = MarketWorld.data.deleteProduct(id);
            if (result.success) {
                setProductsState(MarketWorld.data.getProducts(), 'local');
                alert(result.message);
                loadProducts();
                showLowStockAlerts();
                updateDashboardKPIs();

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
        var product = getProductById(id);
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
        
        var newStock = currentStock;
        if (opType === 'add') {
            newStock += quantity;
        } else if (opType === 'subtract') {
            newStock -= quantity;
        } else {
            newStock = quantity;
        }

        if (newStock < 0) {
            alert('Error: Stock insuficiente');
            return;
        }

        if (hasProductApi()) {
            MarketWorld.api.products.update(id, { stock: newStock })
                .then(function(response) {
                    if (response.success) {
                        alert(response.message || 'Stock actualizado correctamente');
                        return loadProducts();
                    }
                })
                .then(function() {
                    showLowStockAlerts();
                    updateDashboardKPIs();
                    if (typeof MarketWorld.notifications !== 'undefined') {
                        MarketWorld.notifications.notifyStockUpdate(product.nombre, currentStock, newStock);
                        MarketWorld.notifications.checkLowStock();
                    }
                })
                .catch(function(err) {
                    if (isConnectivityError(err)) {
                        var fallbackResult = MarketWorld.data.updateStock(id, quantity, opType);
                        if (fallbackResult.success) {
                            setProductsState(MarketWorld.data.getProducts(), 'local');
                            alert(fallbackResult.message + ' (modo local)');
                            loadProducts();
                            showLowStockAlerts();
                            updateDashboardKPIs();
                            return;
                        }
                        alert('Error: ' + fallbackResult.message);
                        return;
                    }
                    showApiError(err, 'No se pudo actualizar el stock.');
                });
            return;
        }

        var result = MarketWorld.data.updateStock(id, quantity, opType);
        if (result.success) {
            setProductsState(MarketWorld.data.getProducts(), 'local');
            alert(result.message);
            loadProducts();
            showLowStockAlerts();
            updateDashboardKPIs();

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
                        var products = MarketWorld.data.getProducts();
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
        var products = getProductsState();
        
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
            currentPage = inventoryPaginationState.page;
            itemsPerPage = inventoryPaginationState.perPage;
            originalDisplayProducts(products);
            return;
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
