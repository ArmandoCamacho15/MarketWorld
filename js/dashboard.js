
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

                    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(Array.from(byCode.values())));
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

                    apiInvoices.forEach(function(apiInv) {
                        const mapped = {
                            id: apiInv.id,
                            numero_factura: apiInv.numero_factura || apiInv.numero || '',
                            fechaCreacion: apiInv.created_at || apiInv.fecha || new Date().toISOString(),
                            fecha: apiInv.fecha || apiInv.created_at || new Date().toISOString(),
                            total: parseFloat(apiInv.total || 0),
                            estado: apiInv.estado || 'Pagada',
                            customer_id: apiInv.customer_id || null
                        };

                        const key = String(mapped.numero_factura || mapped.id || '').toLowerCase();
                        if (key) {
                            byNumber.set(key, mapped);
                        }
                    });

                    byNumber.forEach(function(value) {
                        merged.push(value);
                    });

                    localStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(merged));
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
            const token = localStorage.getItem('marketworld_auth_token');
            if (!token) return;

            const response = await fetch('http://127.0.0.1:8000/api/v1/dashboard/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await response.json();

            if (result.success) {
                updateDashboardUI(result.data);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        }
    }

    function updateDashboardUI(data) {
        if (!data) return;

        // Mantiene compatibilidad con endpoint dedicado de dashboard.
        document.querySelectorAll('.kpi-card').forEach(function(card) {
            const labelEl = card.querySelector('.kpi-label');
            const valueEl = card.querySelector('.kpi-value');
            if (!labelEl || !valueEl) return;

            const label = labelEl.textContent.trim().toLowerCase();
            if (label === 'ventas totales' && data.sales_month !== undefined) {
                valueEl.textContent = `$${parseFloat(data.sales_month || 0).toLocaleString('es-CO')}`;
            }
            if (label === 'compras del mes' && data.purchases_month !== undefined) {
                valueEl.textContent = `$${parseFloat(data.purchases_month || 0).toLocaleString('es-CO')}`;
            }
            if (label === 'clientes activos' && data.total_customers !== undefined) {
                valueEl.textContent = `${parseInt(data.total_customers, 10) || 0}`;
            }
            if (label === 'productos en stock' && data.total_stock !== undefined) {
                valueEl.textContent = `${parseInt(data.total_stock, 10) || 0}`;
            }
        });

        if (Array.isArray(data.sales_by_month) && salesChart) {
            salesChart.data.datasets[0].data = data.sales_by_month.map(function(v) {
                return parseFloat(v || 0);
            });
            salesChart.update();
        }

        // Recalcula también desde facturas para asegurar que la venta recién creada se refleje.
        applyRealtimeDashboardData();
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
    function renderRecentTransactions(optionalInvoices) {
        const tbody = document.querySelector('.transaction-table tbody');
        if (!tbody) return;

        const invoices = Array.isArray(optionalInvoices) ? optionalInvoices : getActiveInvoices();
        const sorted = invoices.slice().sort(function(a, b) {
            const ad = parseInvoiceDate(a);
            const bd = parseInvoiceDate(b);
            return (bd ? bd.getTime() : 0) - (ad ? ad.getTime() : 0);
        }).slice(0, 5);

        if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay transacciones registradas</td></tr>';
            return;
        }

        tbody.innerHTML = sorted.map(function(inv) {
            const estado = String(inv.estado || 'Pagada');
            const badgeClass = estado.toLowerCase() === 'pagada' ? 'badge-success' : 'badge-warning';
            const date = parseInvoiceDate(inv);
            const number = inv.numero_factura || inv.numero || `FAC-${inv.id || ''}`;

            return `
                <tr data-invoice="${number}">
                    <td>${number}</td>
                    <td>${inv.cliente_nombre || 'Cliente'}</td>
                    <td>$${Math.round(parseInvoiceTotal(inv)).toLocaleString('es-CO')}</td>
                    <td><span class="badge ${badgeClass}">${estado}</span></td>
                </tr>
            `;
        }).join('');

        const rows = tbody.querySelectorAll('tr[data-invoice]');
        rows.forEach(function(row) {
            row.style.cursor = 'pointer';
            row.addEventListener('click', function() {
                const invoiceNumber = row.getAttribute('data-invoice');
                window.location.href = `./facturacion.html?tab=history&invoice=${encodeURIComponent(invoiceNumber)}`;
            });
        });
    }

})();
