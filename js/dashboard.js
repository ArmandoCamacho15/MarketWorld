
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
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.dashboard) {
                console.warn('Adaptador de API no disponible para Dashboard stats');
                return;
            }

            const result = await MarketWorld.api.dashboard.getStats();

            if (result.success) {
                console.log('📊 Dashboard stats actualizados desde API');
                updateDashboardUI(result.data);
            }
        } catch (error) {
            console.error('Error fetching dashboard stats via adapter:', error);
        }
    }

    function updateDashboardUI(data) {
        if (!data) return;

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
            // Si el sistema de notificaciones está listo, podrías disparar una alerta aquí.
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

            return `
                <tr>
                    <td>
                        <div class="fw-bold">${inv.numero_factura || ('#00' + inv.id)}</div>
                        <small class="text-muted">${fecha}</small>
                    </td>
                    <td>${cliente}</td>
                    <td class="fw-bold text-primary">$${total}</td>
                    <td><span class="badge ${badgeClass}">${estado}</span></td>
                </tr>
            `;
        }).join('');
    }
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
