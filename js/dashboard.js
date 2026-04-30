
(function() {
    'use strict';

    let salesChart, categoriesChart, incomeExpenseChart;

    document.addEventListener('DOMContentLoaded', async () => {
        console.log(' Módulo Dashboard cargado (Producción)');
        
        // Inicializar
        initCharts();
        initDateFilters();
        initKPIs();
        initCalendar();
        renderRecentTransactions();

        // Cargar datos reales de la API (endpoint consolidado)
        fetchDashboardStats();
        
        // --- Inicializar sistema de notificaciones ---
        if (typeof MarketWorld.notifications !== 'undefined') {
            MarketWorld.notifications.init();
        }
    });


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


    async function fetchDashboardStats() {
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.dashboard) {
                console.warn('Adaptador de API no disponible para Dashboard stats');
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
            var productsForThreshold = Array.isArray(data.products_low) ? data.products_low : [];

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
        // Asegurar que cada KPI muestre datos reales (API)
        try {
            // Ventas
            var elSales = document.getElementById('kpiSales');
            if (elSales) {
                if (data.sales_month !== undefined) {
                    elSales.textContent = `$${parseFloat(data.sales_month).toLocaleString('es-CO')}`;
                }
            }

            // Valor del inventario
            var elInventoryValue = document.getElementById('kpiInventoryValue');
            if (elInventoryValue) {
                if (data.inventory_value !== undefined) {
                    elInventoryValue.textContent = `$${parseFloat(data.inventory_value).toLocaleString('es-CO')}`;
                }
            }

            // Clientes
            var elClients = document.getElementById('kpiCustomers');
            if (elClients) {
                if (data.total_customers !== undefined) {
                    elClients.textContent = parseInt(data.total_customers, 10).toLocaleString();
                }
            }

            // Productos
            var elProducts = document.getElementById('kpiProducts');
            if (elProducts) {
                if (data.total_products !== undefined) {
                    elProducts.textContent = parseInt(data.total_products, 10).toLocaleString();
                }
            }
        } catch (e) {
            console.warn('No se pudo sincronizar valores KPI por id:', e && e.message ? e.message : e);
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

        // Datos mapeados desde DashboardController backend
        let transactions = [];
        if (Array.isArray(optionalData)) {
            transactions = optionalData;
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
                const baseUrl = (MarketWorld && MarketWorld.api && MarketWorld.api.BASE_URL)
                    ? MarketWorld.api.BASE_URL
                    : 'http://127.0.0.1:8000/api/v1';
                try {
                    const resp = await fetch(baseUrl + '/invoices/' + invoiceId, {
                        headers: { 'Accept': 'application/json' },
                        credentials: 'include'
                    });
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
