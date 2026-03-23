
(function() {
    'use strict';

    let salesChart, categoriesChart, incomeExpenseChart;
    const INVOICES_STORAGE_KEY = 'marketworld_invoices';
    const PRODUCTS_STORAGE_KEY = 'marketworld_products';

    document.addEventListener('DOMContentLoaded', async () => {
        console.log(' Módulo Dashboard cargado (Producción)');
        
        await sincronizarDashboardConApi();
        // Inicializar
        initCharts();
        initDateFilters();
        initKPIs();
        initCalendar();
        renderRecentTransactions();
        applyRealtimeDashboardData();
        
        // Cargar datos reales de la API (endpoint consolidado, si existe)
        fetchDashboardStats();
        // Obtener valorización detallada por producto y compararla con el cálculo local
        try { fetchProductsValuation(); } catch (e) { console.warn('fetchProductsValuation fallo:', e); }
        
        // --- Inicializar sistema de notificaciones ---
        if (typeof MarketWorld.notifications !== 'undefined') {
            MarketWorld.notifications.init();
        }
    });

    function extractDataArray(payload) {
        if (Array.isArray(payload)) return payload;
        if (payload && Array.isArray(payload.data)) return payload.data;
        if (payload && payload.data && Array.isArray(payload.data.data)) return payload.data.data;
        return [];
    }

    // Trae la valorización por producto desde el backend y compara con el cálculo local
    async function fetchProductsValuation() {
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api) {
                // intentar fetch directo
            }
            var token = localStorage.getItem('marketworld_auth_token');
            if (!token) return;

            var headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/json' };
            var res = await fetch('http://127.0.0.1:8000/api/v1/products/valuation', { headers });
            if (!res.ok) {
                console.warn('No se pudo obtener valorización por producto desde API:', res.status);
                return;
            }

            var body = await res.json();
            var apiProducts = Array.isArray(body.data) ? body.data : (Array.isArray(body) ? body : []);
            if (!apiProducts || apiProducts.length === 0) return;

            // Mapear por SKU o id
            var apiById = new Map();
            apiProducts.forEach(function(p) { apiById.set(String(p.id), p); });

            var local = getProducts() || [];
            var discrepancies = [];

            local.forEach(function(lp) {
                var id = String(lp.id || lp.id);
                var apiP = apiById.get(id);
                if (!apiP) return;

                var apiVal = parseFloat(apiP.valuation || 0) || 0;
                var unitCost = (typeof lp.costo === 'number' && !isNaN(lp.costo)) ? lp.costo : (parseFloat(lp.costo) || 0);
                if (!unitCost) unitCost = (typeof lp.precio === 'number' && !isNaN(lp.precio)) ? lp.precio : (parseFloat(lp.precio) || 0);
                var stock = parseFloat(lp.stock || 0) || 0;
                var localVal = unitCost * stock;

                var diff = Math.abs(localVal - apiVal);
                var pct = apiVal > 0 ? (diff / apiVal) * 100 : (localVal > 0 ? 100 : 0);

                if (pct > 2 || diff > 1000) {
                    discrepancies.push({ id: lp.id, sku: lp.codigo || lp.sku || '', nombre: lp.nombre, stock: stock, localVal: Math.round(localVal), apiVal: Math.round(apiVal), diff: Math.round(diff), pct: Number(pct.toFixed(2)) });
                }
            });

            if (discrepancies.length > 0) {
                var msg = 'Discrepancias por producto detectadas: ' + discrepancies.length + '. Revisa consola para detalles.';
                if (typeof MarketWorld !== 'undefined' && MarketWorld.utils && typeof MarketWorld.utils.showNotification === 'function') {
                    MarketWorld.utils.showNotification(msg, 'warning', 10000);
                } else {
                    alert(msg);
                }
                console.table(discrepancies);
            } else {
                console.log('[Valuation] No se detectaron discrepancias significativas entre API y cálculo local.');
            }
        } catch (e) {
            console.warn('Error trayendo valorización por producto:', e && e.message ? e.message : e);
        }
    }

    // Función para imprimir el contenido del modal (misma firma que en facturación)
    function imprimirFactura() {
        const contenido = document.getElementById('modalDetalleBody');
        if (!contenido) return;

        const ventana = window.open('', '_blank', 'width=800,height=600');
        ventana.document.write(`
            <html>
            <head>
                <title>Imprimir Factura</title>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
                <style>body{padding:20px}@media print{.no-print{display:none}}</style>
            </head>
            <body>
                <div class="text-center mb-4">
                    <h2>MarketWorld</h2>
                    <p class="text-muted">Detalle de Factura</p>
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
    window.imprimirFactura = imprimirFactura;

    function parseInvoiceDate(invoice) {
        const raw = invoice.created_at || invoice.fecha || invoice.fechaCreacion || invoice.updated_at;
        const d = raw ? new Date(raw) : null;
        return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    }

    function parseInvoiceTotal(invoice) {
        const value = parseFloat(invoice.total || invoice.monto_total || 0);
        return isNaN(value) ? 0 : value;
    }

    function getActiveInvoices() {
        const invoices = (typeof MarketWorld !== 'undefined' && MarketWorld.data)
            ? MarketWorld.data.getInvoices()
            : [];

        return invoices.filter(function(inv) {
            const estado = String(inv && inv.estado ? inv.estado : '').toLowerCase();
            return estado !== 'anulada' && estado !== 'cancelada';
        });
    }

    function getProducts() {
        return (typeof MarketWorld !== 'undefined' && MarketWorld.data)
            ? MarketWorld.data.getProducts()
            : [];
    }

    async function sincronizarDashboardConApi() {
        try {
            const token = localStorage.getItem('marketworld_auth_token');
            if (!token) return;

            const headers = {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            };

            const [productsRes, invoicesRes] = await Promise.all([
                fetch('http://127.0.0.1:8000/api/v1/products', { headers }),
                fetch('http://127.0.0.1:8000/api/v1/invoices', { headers })
            ]);

            if (productsRes.ok) {
                const productsBody = await productsRes.json();
                const apiProducts = extractDataArray(productsBody);
                if (apiProducts.length > 0 && typeof MarketWorld !== 'undefined' && MarketWorld.data) {
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

                    var mergedProducts = Array.from(byCode.values());
                    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(mergedProducts));

                    // Diagnóstico: log de sincronización y conteo de stock bajo
                    try {
                        const stored = mergedProducts;
                        const lowStockCount = stored.filter(p => (parseInt(p.stock || 0, 10) || 0) <= (parseInt(p.stockMinimo || 0, 10) || 0) && p.activo).length;
                        console.log('[Dashboard sync] apiProducts:', apiProducts.length, 'localProducts(before):', localProducts.length, 'merged:', stored.length, 'lowStockCount:', lowStockCount);
                        if (stored.length > 0) {
                            console.log('[Dashboard sync] sample product types:', Object.keys(stored[0]).reduce((acc,k)=>{acc[k]=typeof stored[0][k];return acc;},{}));
                        }
                    } catch (e) {
                        console.warn('[Dashboard sync] diagnóstico fallido:', e.message || e);
                    }
                }
            }

            if (invoicesRes.ok) {
                const invoicesBody = await invoicesRes.json();
                const apiInvoices = extractDataArray(invoicesBody);
                if (apiInvoices.length > 0) {
                    const merged = [];
                    const byNumber = new Map();
                    const localInvoices = (typeof MarketWorld !== 'undefined' && MarketWorld.data)
                        ? MarketWorld.data.getInvoices()
                        : [];

                    localInvoices.forEach(function(inv) {
                        const key = String(inv.numero_factura || inv.numero || inv.id || '').toLowerCase();
                        if (key) byNumber.set(key, inv);
                    });

                    // Filtrar facturas de prueba (QA/TEST) y mapear
                    apiInvoices.forEach(function(apiInv) {
                        const rawNumber = String(apiInv.numero_factura || apiInv.numero || apiInv.id || '');
                        const rawCustomer = String(apiInv.cliente_nombre || apiInv.customer_name || (apiInv.customer && apiInv.customer.nombre) || '');
                        // Omitir facturas de prueba por patrón en número o cliente
                        if (/qa|test|inv-test|test-/i.test(rawNumber) || /qa|test/i.test(rawCustomer)) {
                            return;
                        }

                        const mapped = {
                            id: apiInv.id,
                            numero_factura: apiInv.numero_factura || apiInv.numero || '',
                            fechaCreacion: apiInv.created_at || apiInv.fecha || new Date().toISOString(),
                            fecha: apiInv.fecha || apiInv.created_at || new Date().toISOString(),
                            total: parseFloat(apiInv.total || apiInv.total_amount || 0),
                            estado: apiInv.estado || 'Pagada',
                            cliente_nombre: apiInv.cliente_nombre || apiInv.customer_name || (apiInv.customer && apiInv.customer.nombre) || 'Consumidor Final',
                            items: apiInv.items || apiInv.lines || []
                        };

                        const key = String(mapped.numero_factura || mapped.id || '').toLowerCase();
                        if (key) {
                            byNumber.set(key, mapped);
                        }
                    });

                    byNumber.forEach(function(value) {
                        merged.push(value);
                    });

                    // Ordenar por fecha desc y mantener las 10 más recientes
                    merged.sort(function(a,b) {
                        const da = new Date(a.fecha || a.fechaCreacion || 0).getTime() || 0;
                        const db = new Date(b.fecha || b.fechaCreacion || 0).getTime() || 0;
                        return db - da;
                    });
                    const recent = merged.slice(0, 10);
                    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(recent));
                }
            }
        } catch (error) {
            console.warn('No se pudieron sincronizar datos del dashboard desde API:', error.message || error);
        }
    }

    function applyRealtimeDashboardData() {
        const invoices = getActiveInvoices();
        const products = getProducts();

        updateKpisFromRealtimeData(invoices, products);
        updateSalesChartFromInvoices(invoices);
        renderRecentTransactions(invoices);
    }

    function updateKpisFromRealtimeData(invoices, products) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlySales = invoices
            .filter(function(inv) {
                const d = parseInvoiceDate(inv);
                return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .reduce(function(sum, inv) { return sum + parseInvoiceTotal(inv); }, 0);

        const totalStock = products.reduce(function(sum, p) {
            return sum + (parseInt(p && p.stock, 10) || 0);
        }, 0);

        document.querySelectorAll('.kpi-card').forEach(function(card) {
            const labelEl = card.querySelector('.kpi-label');
            const valueEl = card.querySelector('.kpi-value');
            const trendEl = card.querySelector('.kpi-trend');
            if (!labelEl || !valueEl) return;

            const label = labelEl.textContent.trim().toLowerCase();
            if (label === 'ventas totales') {
                valueEl.textContent = `$${Math.round(monthlySales).toLocaleString('es-CO')}`;
                if (trendEl) trendEl.textContent = 'Mes actual';
            }

            if (label === 'productos en stock') {
                valueEl.textContent = Math.round(totalStock).toLocaleString('es-CO');
                if (trendEl) trendEl.textContent = 'Actualizado';
            }
        });
    }

    function updateSalesChartFromInvoices(invoices) {
        if (!salesChart) return;

        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const now = new Date();
        const year = now.getFullYear();
        const totals = new Array(12).fill(0);

        invoices.forEach(function(inv) {
            const d = parseInvoiceDate(inv);
            if (!d || d.getFullYear() !== year) return;
            totals[d.getMonth()] += parseInvoiceTotal(inv);
        });

        salesChart.data.labels = months;
        salesChart.data.datasets[0].label = `Ventas ${year}`;
        salesChart.data.datasets[0].data = totals;
        salesChart.update();
    }

    async function fetchDashboardStats() {
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.dashboard) {
                console.warn('Adaptador de API no disponible para Dashboard stats');
                // intentar fetch directo al backend si hay token
                const token = localStorage.getItem('marketworld_auth_token');
                if (!token) {
                    console.warn('No hay token de autenticación disponible para solicitar stats directas.');
                    return;
                }

                try {
                    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };
                    const res = await fetch('http://127.0.0.1:8000/api/v1/products/stock-bajo', { headers });
                    if (res.ok) {
                        const body = await res.json();
                        const products = Array.isArray(body.data) ? body.data : (Array.isArray(body) ? body : []);
                        const stats = {
                            low_stock_count: products.length,
                            products_low: products
                        };
                        console.log('Dashboard: obtenido low_stock directamente del endpoint:', stats.low_stock_count);
                        updateDashboardUI(stats);
                        return;
                    } else {
                        console.warn('Fetch directo a /products/stock-bajo falló con status', res.status);
                    }
                } catch (err) {
                    console.warn('Error al intentar fetch directo de low_stock:', err && err.message ? err.message : err);
                }
                return;
            }

            // Usar adaptador si está disponible
            try {
                const result = await MarketWorld.api.dashboard.getStats();
                if (result && result.success) {
                    console.log('📊 Dashboard stats actualizados desde API');
                    updateDashboardUI(result.data);
                    return;
                }
                console.warn('Adaptador dashboard devolvió respuesta no exitosa o vacía:', result);
            } catch (e) {
                console.warn('Error llamando MarketWorld.api.dashboard.getStats():', e && e.message ? e.message : e);
            }

            // Si adaptador no funcionó, intentar fetch directo a products/stock-bajo
            const token = localStorage.getItem('marketworld_auth_token');
            if (!token) {
                console.warn('No hay token para solicitar datos directos al backend.');
                return;
            }

            try {
                const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };
                const res2 = await fetch('http://127.0.0.1:8000/api/v1/products/stock-bajo', { headers });
                if (res2.ok) {
                    const body2 = await res2.json();
                    const products = Array.isArray(body2.data) ? body2.data : (Array.isArray(body2) ? body2 : []);
                    const stats2 = { low_stock_count: products.length, products_low: products };
                    console.log('Dashboard: fallback directo low_stock count=', stats2.low_stock_count);
                    updateDashboardUI(stats2);
                    return;
                } else {
                    console.warn('Fetch fallback a /products/stock-bajo falló con status', res2.status);
                }
            } catch (err) {
                console.warn('Error en fetch fallback de low_stock:', err && err.message ? err.message : err);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats via adapter:', error);
        }
    }

    function updateDashboardUI(data) {
        if (!data) return;

        // Si el backend no envía low_stock_count, calcular desde el almacenamiento local
        if (typeof data.low_stock_count === 'undefined' || data.low_stock_count === null) {
            try {
                const localProducts = getProducts() || [];
                const computed = localProducts.filter(p => (parseInt(p.stock || 0, 10) || 0) <= (parseInt(p.stockMinimo || p.stock_minimo || 0, 10) || 0) && (p.activo === undefined ? true : !!p.activo)).length;
                data.low_stock_count = computed;
                console.log('[Dashboard] low_stock_count calculado localmente:', computed);
            } catch (e) {
                data.low_stock_count = 0;
            }
        }

        // Actualizar KPIs con IDs específicos si existen, o por etiquetas
        const kpiCards = document.querySelectorAll('.kpi-card');
        kpiCards.forEach(function(card) {
            const labelEl = card.querySelector('.kpi-label');
            const valueEl = card.querySelector('.kpi-value');
            if (!labelEl || !valueEl) return;

            const label = labelEl.textContent.trim().toLowerCase();

            if (label.includes('ventas') && data.sales_month !== undefined) {
                valueEl.textContent = `$${parseFloat(data.sales_month).toLocaleString('es-CO')}`;
            }
            if (label.includes('compras') && data.purchases_month !== undefined) {
                valueEl.textContent = `$${parseFloat(data.purchases_month).toLocaleString('es-CO')}`;
            }
            if (label.includes('clientes') && data.total_customers !== undefined) {
                valueEl.textContent = data.total_customers.toLocaleString();
            }
            if ((label.includes('productos') || label.includes('stock')) && data.total_products !== undefined) {
                valueEl.textContent = data.total_products.toLocaleString();
            }
        });

        // Actualizar Gráfico de Ventas si hay datos históricos
        if (data.sales_history && salesChart) {
            const labels = data.sales_history.map(item => item.label);
            const totals = data.sales_history.map(item => item.total);
            
            salesChart.data.labels = labels;
            salesChart.data.datasets[0].data = totals;
            salesChart.update();
        }

        // Actualizar Tabla de Transacciones Recientes
        if (data.recent_sales) {
            renderRecentTransactions(data.recent_sales);
        }

        // Notificar si hay stock bajo
        if (data.low_stock_count > 0) {
            console.warn(`⚠️ Hay ${data.low_stock_count} productos con stock bajo.`);
            // Disparar las alertas para la campana de notificaciones
            if (typeof MarketWorld !== 'undefined' && MarketWorld.notifications && typeof MarketWorld.notifications.checkLowStock === 'function') {
                MarketWorld.notifications.checkLowStock();
            }
        }
        // Actualizar tarjeta combinada de inventario + stock bajo
        try {
            var combinedCard = document.getElementById('kpiInventoryCombined');
            var combinedProductsEl = document.getElementById('kpiProductsCombined');
            var combinedLowCountEl = document.getElementById('kpiLowStockCount');
            var combinedLowMinEl = document.getElementById('kpiLowStockMin');

            if (combinedCard && combinedProductsEl && combinedLowCountEl && combinedLowMinEl) {
                var productsLocal = getProducts() || [];
                var productsForThreshold = Array.isArray(data.products_low) && data.products_low.length ? data.products_low : productsLocal;

                // calcular un valor de referencia para "stock mínimo" (mínimo entre los stockMinimo conocidos)
                var minThreshold = productsForThreshold.reduce(function(acc, p) {
                    var v = parseInt(p.stockMinimo || p.stock_minimo || 0, 10) || 0;
                    if (acc === null) return v;
                    if (v === 0) return acc;
                    return v < acc ? v : acc;
                }, null);

                combinedLowCountEl.textContent = String(data.low_stock_count || 0);
                combinedLowMinEl.textContent = 'Mínimo: ' + (minThreshold || '-');

                // también actualizar el número total de productos
                if (data.total_products !== undefined) {
                    combinedProductsEl.textContent = parseInt(data.total_products, 10).toLocaleString();
                } else {
                    combinedProductsEl.textContent = (productsLocal || []).length.toLocaleString();
                }

                // resaltar visualmente si hay stock bajo
                if ((data.low_stock_count || 0) > 0) {
                    combinedCard.classList.add('kpi-alert', 'stock-low');
                } else {
                    combinedCard.classList.remove('kpi-alert', 'stock-low');
                }
            }
        } catch (e) {
            console.warn('No se pudo actualizar tarjeta combinada de inventario:', e && e.message ? e.message : e);
        }
        // Asegurar que cada KPI muestre datos reales (API -> fallback local)
        try {
            // Ventas
            var elSales = document.getElementById('kpiSales');
            if (elSales) {
                if (data.sales_month !== undefined) {
                    elSales.textContent = `$${parseFloat(data.sales_month).toLocaleString('es-CO')}`;
                } else {
                    // fallback: calcular ventas del mes desde facturas locales
                    var invoices = getActiveInvoices();
                    var now = new Date();
                    var monthly = invoices.filter(function(inv) {
                        var d = parseInvoiceDate(inv);
                        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                    }).reduce(function(sum, inv) { return sum + parseInvoiceTotal(inv); }, 0);
                    elSales.textContent = `$${Math.round(monthly).toLocaleString('es-CO')}`;
                }
            }

            // Valor del inventario
            var elInventoryValue = document.getElementById('kpiInventoryValue');
            if (elInventoryValue) {
                if (data.inventory_value !== undefined) {
                    elInventoryValue.textContent = `$${parseFloat(data.inventory_value).toLocaleString('es-CO')}`;
                    // Comparar valor reportado por API vs cálculo local
                    try {
                        compareInventoryValues(parseFloat(data.inventory_value) || 0);
                    } catch (e) {
                        console.warn('compareInventoryValues fallo:', e && e.message ? e.message : e);
                    }
                } else {
                    // calcular fallback desde productos locales
                    try {
                        var prod = getProducts();
                        var invVal = (prod || []).reduce(function(sum, p) {
                            var stock = parseFloat(p.stock || p.cantidad || 0) || 0;
                            var costo = parseFloat(p.costo || p.precio_compra || p.precio || 0) || 0;
                            return sum + (stock * costo);
                        }, 0);
                        elInventoryValue.textContent = `$${Math.round(invVal).toLocaleString('es-CO')}`;
                        // Si no hay valor por API, aún ejecutar comparación con 0 (no reportado)
                        try { compareInventoryValues(null); } catch (e) { /* ignore */ }
                    } catch (e) {
                        elInventoryValue.textContent = `$0`;
                    }
                }
            }

            // Clientes
            var elClients = document.getElementById('kpiCustomers');
            if (elClients) {
                if (data.total_customers !== undefined) {
                    elClients.textContent = parseInt(data.total_customers, 10).toLocaleString();
                } else if (typeof MarketWorld !== 'undefined' && MarketWorld.data && typeof MarketWorld.data.getCustomers === 'function') {
                    elClients.textContent = (MarketWorld.data.getCustomers() || []).length.toLocaleString();
                }
            }

            // Productos
            var elProducts = document.getElementById('kpiProducts');
            if (elProducts) {
                if (data.total_products !== undefined) {
                    elProducts.textContent = parseInt(data.total_products, 10).toLocaleString();
                } else {
                    elProducts.textContent = (getProducts() || []).length.toLocaleString();
                }
            }
        } catch (e) {
            console.warn('No se pudo sincronizar valores KPI por id:', e && e.message ? e.message : e);
        }
    }

    // Comparar inventory_value del backend con el cálculo local y mostrar alerta si difieren.
    function compareInventoryValues(apiValue) {
        var products = getProducts() || [];
        var localValue = products.reduce(function(sum, p) {
            var unitCost = (typeof p.costo === 'number' && !isNaN(p.costo)) ? p.costo : (parseFloat(p.costo) || 0);
            if (!unitCost) unitCost = (typeof p.precio === 'number' && !isNaN(p.precio)) ? p.precio : (parseFloat(p.precio) || 0);
            var stock = parseFloat(p.stock || 0) || 0;
            return sum + (unitCost * stock);
        }, 0);

        // Si apiValue es null o undefined no mostrar alerta, solo registrar
        if (apiValue === null || typeof apiValue === 'undefined') {
            console.log('[Dashboard] API inventory_value no disponible; cálculo local =', Math.round(localValue));
            return;
        }

        var diff = Math.abs(localValue - apiValue);
        var pct = apiValue > 0 ? (diff / apiValue) : (localValue > 0 ? 1 : 0);

        // Umbral: 2% o diferencia absoluta > 1000
        if (pct > 0.02 || diff > 1000) {
            var message = 'Discrepancia detectada entre backend y cálculo local del valor de inventario. Backend: $' + Math.round(apiValue).toLocaleString('es-CO') + ', Local: $' + Math.round(localValue).toLocaleString('es-CO') + '. Revisa precios de compra y sincronización.';
            console.warn('Dashboard discrepancy:', message);
            if (typeof MarketWorld !== 'undefined' && MarketWorld.utils && typeof MarketWorld.utils.showNotification === 'function') {
                MarketWorld.utils.showNotification(message, 'warning', 10000);
            } else {
                alert(message);
            }
        } else {
            console.log('[Dashboard] inventory_value consistente. diferencia=', Math.round(diff));
        }
    }

    // --- Inicializar gráficos con Chart.js ---
    function initCharts() {
        // --- Gráfico de ventas mensuales ---
        const salesCtx = document.getElementById('salesChart');
        if (salesCtx) {
            salesChart = new Chart(salesCtx, {
                type: 'line',
                data: {
                    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Ventas 2025',
                        data: [85450, 92300, 78900, 105200, 118500, 125450],
                        borderColor: '#0d6ef0',
                        backgroundColor: 'rgba(13, 110, 240, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    aspectRatio: 2,
                    layout: {
                        padding: 10
                    },
                    plugins: {
                        legend: { display: true, position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: (context) => `Ventas: $${context.parsed.y.toLocaleString()}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => `$${value.toLocaleString()}`
                            }
                        }
                    }
                }
            });
        }

        // ======= GRÁFICO DE CATEGORÍAS MÁS VENDIDAS =======
        const categoriesCtx = document.getElementById('categoriesChart');
        if (categoriesCtx) {
            categoriesChart = new Chart(categoriesCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Electrónicos', 'Alimentos', 'Oficina', 'Hogar'],
                    datasets: [{
                        data: [45, 25, 20, 10],
                        backgroundColor: ['#0d6ef0', '#2ecc71', '#f39c12', '#e74c3c']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }

        console.log(' Gráficos inicializados');
    }

    // ======= FILTROS DE FECHA INTERACTIVOS =======
    function initDateFilters() {
        const quickButtons = document.querySelectorAll('.quick-date-btn');
        
        quickButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const period = btn.textContent.trim();
                
                // ======= REMOVER CLASE ACTIVE DE TODOS =======
                quickButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                console.log(`📅 Aplicando filtro: ${period}`);
                applyDateFilter(period);
            });
        });
    }

    function applyDateFilter(period) {
        // ======= SIMULAR ACTUALIZACIÓN DE DATOS =======
        const startDate = document.querySelector('.date-filter input[type="date"]');
        const endDate = document.querySelectorAll('.date-filter input[type="date"]')[1];
        
        const today = new Date();
        let start = new Date();
        
        if (period === 'Hoy') {
            start = today;
        } else if (period === 'Esta semana') {
            start.setDate(today.getDate() - 7);
        } else if (period === 'Este mes') {
            start.setDate(1);
        }
        
        if (startDate) startDate.value = start.toISOString().split('T')[0];
        if (endDate) endDate.value = today.toISOString().split('T')[0];
        
        // ======= ACTUALIZAR GRÁFICOS =======
        updateCharts();
    }

    function updateCharts() {
        if (salesChart) {
            salesChart.data.datasets[0].data = salesChart.data.datasets[0].data.map(v => v * (0.9 + Math.random() * 0.2));
            salesChart.update();
        }
        
        console.log('🔄 Gráficos actualizados');
    }

    // KPIs
    function animateKPIs() {
        const kpiValues = document.querySelectorAll('.kpi-value');
        
        kpiValues.forEach(kpi => {
            const text = kpi.textContent;
            const number = parseFloat(text.replace(/[^0-9.]/g, ''));
            
            if (!isNaN(number)) {
                let current = 0;
                const increment = number / 50;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= number) {
                        current = number;
                        clearInterval(timer);
                    }
                    
                    if (text.includes('$')) {
                        kpi.textContent = `$${Math.floor(current).toLocaleString()}`;
                    } else {
                        kpi.textContent = Math.floor(current);
                    }
                }, 20);
            }
        });
    }

    // ======= KPIS INTERACTIVOS =======
    function initKPIs() {
        const kpiCards = document.querySelectorAll('.kpi-card');
        
        kpiCards.forEach(card => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                const label = card.querySelector('.kpi-label').textContent;
                console.log(`📈 KPI clickeado: ${label}`);
                
                // ======= REDIRIGIR SEGÚN EL KPI =======
                if (label.includes('Ventas')) {
                    window.location.href = './facturacion.html?tab=history';
                } else if (label.includes('Compras')) {
                    window.location.href = './compras.html';
                } else if (label.includes('Clientes')) {
                    window.location.href = './crm.html';
                } else if (label.includes('Inventario') || label.includes('Productos en Stock')) {
                    window.location.href = './inventario.html';
                }
            });
        });
    }

    // ======= CALENDARIO CON FULLCALENDAR =======
    function initCalendar() {
        const calendarEl = document.getElementById('calendar');
        
        if (calendarEl && typeof FullCalendar !== 'undefined') {
            const calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                locale: 'es',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek'
                },
                events: [
                    { title: 'Reunión ventas', start: '2025-06-25', color: '#0d6ef0' },
                    { title: 'Vencimiento factura', start: '2025-06-30', color: '#e74c3c' },
                    { title: 'Inventario mensual', start: '2025-06-28', color: '#f39c12' }
                ],
                eventClick: (info) => {
                    alert(`Evento: ${info.event.title}\nFecha: ${info.event.start.toLocaleDateString()}`);
                }
            });
            
            calendar.render();
            console.log('📅 Calendario inicializado');
        }
    }

    // ======= TRANSACCIONES INTERACTIVAS =======
    function renderRecentTransactions(optionalData) {
        const tbody = document.querySelector('.transaction-table tbody');
        if (!tbody) return;

        // Si data viene de la API, tiene una estructura distinta que getActiveInvoices() local
        let transactions = [];
        
        if (Array.isArray(optionalData)) {
            // Datos mapeados desde DashboardController backend
            transactions = optionalData;
        } else {
            // Fallback a local storage si no hay API
            const invoices = (typeof MarketWorld !== 'undefined' && MarketWorld.data)
                ? MarketWorld.data.getInvoices()
                : [];
                
            transactions = invoices.filter(function(inv) {
                const estado = String(inv && inv.estado ? inv.estado : '').toLowerCase();
                return estado !== 'anulada' && estado !== 'cancelada';
            }).slice(0, 5);
        }

        if (transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay transacciones recientes</td></tr>';
            return;
        }

        tbody.innerHTML = transactions.map(function(inv) {
            const estado = String(inv.estado || 'Pagada');
            const total = parseFloat(inv.total || 0).toLocaleString('es-CO');
            const cliente = inv.cliente_nombre || (inv.customer ? inv.customer.nombre : 'Consumidor Final');
            const fecha = inv.fecha ? new Date(inv.fecha).toLocaleDateString('es-CO') : 'Hoy';
            let badgeClass = 'bg-success';
            if (estado.toLowerCase() === 'pendiente') badgeClass = 'bg-warning text-dark';
            if (estado.toLowerCase() === 'anulada') badgeClass = 'bg-danger';
            // Agregar atributo data-invoice-id para identificar la factura
            const displayNumber = inv.numero_factura || ('#00' + inv.id);
            return '<tr class="recent-invoice-row" data-invoice-id="' + (inv.id || '') + '">' +
                '<td>' +
                    '<div class="fw-bold invoice-link" role="button" tabindex="0">' + displayNumber + '</div>' +
                    '<small class="text-muted">' + fecha + '</small>' +
                '</td>' +
                '<td>' + cliente + '</td>' +
                '<td class="fw-bold text-primary">$' + total + '</td>' +
                '<td><span class="badge ' + badgeClass + '">' + estado + '</span></td>' +
            '</tr>';
        }).join('');

        // Añadir manejadores para abrir modal de factura al hacer click
        Array.from(tbody.querySelectorAll('.recent-invoice-row')).forEach(function(row) {
            row.addEventListener('click', function(e) {
                const id = row.getAttribute('data-invoice-id');
                if (id) openInvoiceModal(id);
            });
            row.querySelectorAll('.invoice-link').forEach(function(link) {
                link.addEventListener('keydown', function(ev) {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        const id = row.getAttribute('data-invoice-id');
                        if (id) openInvoiceModal(id);
                    }
                });
            });
        });
    }

    // Abre modal y carga detalle de factura desde backend
    async function openInvoiceModal(invoiceId) {
        const modalEl = document.getElementById('modalDetalleFactura');
        const bodyEl = document.getElementById('modalDetalleBody');
        if (!modalEl || !bodyEl) return;

        bodyEl.innerHTML = '<div class="text-center text-muted">Cargando...</div>';
        const bsModal = new bootstrap.Modal(modalEl, { keyboard: true });
        bsModal.show();

        try {
            let invoiceData = null;

            if (typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.invoices && typeof MarketWorld.api.invoices.getById === 'function') {
                try {
                    const res = await MarketWorld.api.invoices.getById(invoiceId);
                    invoiceData = res && (res.data || res) ? (res.data || res) : null;
                } catch (err) {
                    console.warn('Error obteniendo factura desde adaptador:', err && err.message ? err.message : err);
                }
            }

            // Si no obtuvimos datos vía adaptador, intentar fetch directo
            if (!invoiceData) {
                const token = localStorage.getItem('marketworld_auth_token');
                const headers = { 'Accept': 'application/json' };
                if (token) headers['Authorization'] = 'Bearer ' + token;
                try {
                    const resp = await fetch((MarketWorld && MarketWorld.api && MarketWorld.api.BASE_URL ? MarketWorld.api.BASE_URL : 'http://127.0.0.1:8000/api/v1') + '/invoices/' + invoiceId, { headers });
                    if (resp.ok) {
                        const body = await resp.json();
                        invoiceData = body && (body.data || body) ? (body.data || body) : null;
                    } else {
                        console.warn('Fetch invoice detail falló con status', resp.status);
                    }
                } catch (err) {
                    console.warn('Error fetch invoice detail directo:', err && err.message ? err.message : err);
                }
            }

            if (!invoiceData) {
                bodyEl.innerHTML = '<div class="text-center text-danger">No se encontró la factura o no hay permiso para verla.</div>';
                return;
            }

            // Log para ayuda en debugging: estructura recibida
            try { console.debug('Invoice detail payload:', invoiceData); } catch (e) {}

            // Filtrar facturas de prueba por convención en número o cliente
            const num = String(invoiceData.numero_factura || invoiceData.numero || invoiceData.id || '');
            if (/qa|test|inv-test|test-/i.test(num) || /qa|test/i.test(String(invoiceData.customer_name || invoiceData.cliente_nombre || ''))) {
                bodyEl.innerHTML = '<div class="text-center text-muted">Factura de prueba detectada y omitida.</div>';
                return;
            }


                // Usar el renderer estandarizado si está disponible
                if (window.MarketWorld && MarketWorld.utils && typeof MarketWorld.utils.renderInvoiceHTML === 'function') {
                    try {
                        bodyEl.innerHTML = MarketWorld.utils.renderInvoiceHTML(invoiceData);
                    } catch (e) {
                        console.warn('Error usando renderInvoiceHTML:', e && e.message ? e.message : e);
                        bodyEl.innerHTML = '<div class="text-center text-danger">Error renderizando la factura.</div>';
                    }
                } else {
                    bodyEl.innerHTML = '<div class="text-center text-danger">No hay renderer de factura disponible.</div>';
                }
            // El contenido de la factura ya fue renderizado por MarketWorld.utils.renderInvoiceHTML
        } catch (err) {
            console.error('openInvoiceModal error:', err && err.message ? err.message : err);
            bodyEl.innerHTML = '<div class="text-center text-danger">Error cargando la factura.</div>';
        }
    }

})();
