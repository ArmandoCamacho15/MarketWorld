
(function() {
    'use strict';

    let salesChart, inventoryChart, cxpChart;

    document.addEventListener('DOMContentLoaded', async () => {
        // Inicializar
        initCharts();
        initDateFilters();
        initKPIs();
        initCalendar();
        renderRecentTransactions([]);

        // Cargar datos reales de la API (endpoint consolidado)
        fetchDashboardStats();
        
        // --- Inicializar sistema de notificaciones ---
        if (typeof MarketWorld.notifications !== 'undefined') {
            MarketWorld.notifications.init();
        }

        const btnImprimirFactura = document.getElementById('btnImprimirFactura');
        if (btnImprimirFactura) {
            btnImprimirFactura.addEventListener('click', imprimirFactura);
        }
    });

    function getSelectedDateRange() {
        const dateInputs = document.querySelectorAll('.date-filter input[type="date"]');
        const today = new Date();
        const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const defaultEnd = today.toISOString().split('T')[0];

        const startDate = dateInputs[0] && dateInputs[0].value ? dateInputs[0].value : defaultStart;
        const endDate = dateInputs[1] && dateInputs[1].value ? dateInputs[1].value : defaultEnd;

        return {
            desde: startDate,
            hasta: endDate,
        };
    }

    function setDefaultDateRange() {
        const dateInputs = document.querySelectorAll('.date-filter input[type="date"]');
        if (!dateInputs[0] || !dateInputs[1]) return;

        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        dateInputs[0].value = startOfMonth.toISOString().split('T')[0];
        dateInputs[1].value = today.toISOString().split('T')[0];
    }

    function setSafeHtml(element, html) {
        if (!element) return;
        if (window.MarketWorld && MarketWorld.utils && typeof MarketWorld.utils.insertarHTMLSeguro === 'function') {
            MarketWorld.utils.insertarHTMLSeguro(element, html);
            return;
        }
        element.textContent = String(html || '');
    }


    // Función para imprimir el contenido del modal (misma firma que en facturación)
    function imprimirFactura() {
        const contenido = document.getElementById('modalDetalleBody');
        if (!contenido) return;

        const ventana = window.open('', '_blank', 'width=800,height=600');
        if (!ventana) return;

        const doc = ventana.document;
        doc.open();
        doc.close();

        const head = doc.head || doc.createElement('head');
        if (!doc.head) {
            doc.documentElement.appendChild(head);
        }

        const title = doc.createElement('title');
        title.textContent = 'Imprimir Factura';
        head.appendChild(title);

        const link = doc.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css';
        head.appendChild(link);

        const style = doc.createElement('style');
        style.textContent = 'body{padding:20px}@media print{.no-print{display:none}}';
        head.appendChild(style);

        const body = doc.body || doc.createElement('body');
        if (!doc.body) {
            doc.documentElement.appendChild(body);
        }

        const headerHtml = '<div class="text-center mb-4">' +
            '<h2>MarketWorld</h2>' +
            '<p class="text-muted">Detalle de Factura</p>' +
            '</div>';

        if (window.DOMPurify) {
            setSafeHtml(body, window.DOMPurify.sanitize(headerHtml + (contenido.innerHTML || '')));
        } else {
            setSafeHtml(body, headerHtml + (contenido.innerHTML || ''));
        }

        const buttonWrapper = doc.createElement('div');
        buttonWrapper.className = 'text-center mt-4 no-print';
        const printButton = doc.createElement('button');
        printButton.type = 'button';
        printButton.className = 'btn btn-primary';
        printButton.textContent = 'Imprimir';
        printButton.addEventListener('click', function() { ventana.print(); });
        buttonWrapper.appendChild(printButton);
        body.appendChild(buttonWrapper);
    }
    window.imprimirFactura = imprimirFactura;


    async function fetchDashboardStats() {
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.dashboard) {
                renderRecentTransactions([]);
                return;
            }

            const dateRange = getSelectedDateRange();

            // Usar adaptador si está disponible
            try {
                const result = await MarketWorld.api.dashboard.getStats(dateRange);
                if (result && result.success) {
                    updateDashboardUI(result.data);
                    return;
                }
                renderRecentTransactions([]);
            } catch (e) {
                renderRecentTransactions([]);
            }

        } catch (error) {
            renderRecentTransactions([]);
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

        if (data.inventory_history && inventoryChart) {
            const inventoryLabels = data.inventory_history.map(item => item.label);
            const inventoryValues = data.inventory_history.map(item => item.unidades);

            inventoryChart.data.labels = inventoryLabels;
            inventoryChart.data.datasets[0].data = inventoryValues;
            inventoryChart.update();
        }

        if (data.cxp_history && cxpChart) {
            const cxpLabels = data.cxp_history.map(item => item.label);
            const cxpValues = data.cxp_history.map(item => item.saldo);

            cxpChart.data.labels = cxpLabels;
            cxpChart.data.datasets[0].data = cxpValues;
            cxpChart.update();
        }

        // Actualizar Tabla de Transacciones Recientes
        if (data.recent_transactions) {
            renderRecentTransactions(data.recent_transactions);
        } else if (data.recent_sales) {
            renderRecentTransactions(data.recent_sales);
        }

        // Notificar si hay stock bajo
            if (data.low_stock_count > 0 && typeof MarketWorld !== 'undefined' && MarketWorld.notifications && typeof MarketWorld.notifications.checkLowStock === 'function') {
                MarketWorld.notifications.checkLowStock();
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
                    labels: [],
                    datasets: [{
                        label: 'Ventas',
                        data: [],
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

        const inventoryCtx = document.getElementById('inventoryChart');
        if (inventoryCtx) {
            inventoryChart = new Chart(inventoryCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Entradas', 'Salidas', 'Ajustes'],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: ['#0d6ef0', '#2ecc71', '#f39c12']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.label}: ${context.parsed}`
                            }
                        }
                    }
                }
            });
        }

        const cxpCtx = document.getElementById('cxpChart');
        if (cxpCtx) {
            cxpChart = new Chart(cxpCtx, {
                type: 'bar',
                data: {
                    labels: ['Pagada', 'Parcial', 'Pendiente'],
                    datasets: [{
                        label: 'Saldo CxP',
                        data: [0, 0, 0],
                        backgroundColor: ['#198754', '#f39c12', '#dc3545']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => `$${Number(value).toLocaleString('es-CO')}`
                            }
                        }
                    }
                }
            });
        }

        console.log(' Gráficos inicializados');
    }

    // ======= FILTROS DE FECHA INTERACTIVOS =======
    function initDateFilters() {
        setDefaultDateRange();

        const quickButtons = document.querySelectorAll('.quick-date-btn');
        const dateInputs = document.querySelectorAll('.date-filter input[type="date"]');
        
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

        dateInputs.forEach(input => {
            input.addEventListener('change', () => {
                fetchDashboardStats();
            });
        });
    }

    function applyDateFilter(period) {
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

        fetchDashboardStats();
    }

    function updateCharts() {
        fetchDashboardStats();
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
                    window.location.href = APP_CONFIG.toHtmlPage('facturacion.html?tab=history');
                } else if (label.includes('Compras')) {
                    window.location.href = APP_CONFIG.toHtmlPage('compras.html');
                } else if (label.includes('Clientes')) {
                    window.location.href = APP_CONFIG.toHtmlPage('crm.html');
                } else if (label.includes('Inventario') || label.includes('Productos en Stock')) {
                    window.location.href = APP_CONFIG.toHtmlPage('inventario.html');
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
                events: [],
                eventClick: (info) => {
                    alert(`Evento: ${info.event.title}\nFecha: ${info.event.start.toLocaleDateString()}`);
                }
            });
            
            calendar.render();
        }
    }

    // ======= TRANSACCIONES INTERACTIVAS =======
    function renderRecentTransactions(optionalData) {
        const tbody = document.querySelector('.transaction-table tbody');
        if (!tbody) return;

        const transactions = Array.isArray(optionalData) ? optionalData : [];

        if (transactions.length === 0) {
            setSafeHtml(tbody, '<tr><td colspan="5" class="text-center text-muted">No hay transacciones recientes</td></tr>');
            return;
        }

        setSafeHtml(tbody, transactions.map(function(inv) {
            const estado = String(inv.estado || inv.estado_pago || 'Pagada');
            const total = parseFloat(inv.total || 0).toLocaleString('es-CO');
            const contraparte = inv.counterparty_name || inv.cliente_nombre || inv.proveedor_nombre || (inv.customer ? inv.customer.nombre : 'Consumidor Final');
            const tipo = String(inv.document_label || inv.document_type || 'Documento');
            const numero = inv.document_number || inv.numero_factura || inv.numero_orden || ('#00' + inv.id);
            const fecha = inv.fecha ? new Date(inv.fecha).toLocaleDateString('es-CO') : 'Hoy';
            let badgeClass = 'bg-success';
            if (estado.toLowerCase() === 'pendiente') badgeClass = 'bg-warning text-dark';
            if (estado.toLowerCase() === 'anulada') badgeClass = 'bg-danger';
            const isInvoice = String(inv.document_type || 'invoice') === 'invoice';
            const rowId = inv.id || '';
            return '<tr class="recent-invoice-row" data-document-type="' + String(inv.document_type || 'invoice') + '" data-document-id="' + rowId + '">' +
                '<td><span class="badge bg-secondary text-uppercase">' + tipo + '</span></td>' +
                '<td>' +
                    '<div class="fw-bold document-link" role="button" tabindex="0">' + numero + '</div>' +
                    '<small class="text-muted">' + fecha + '</small>' +
                '</td>' +
                '<td>' + contraparte + '</td>' +
                '<td class="fw-bold text-primary">$' + total + '</td>' +
                '<td><span class="badge ' + badgeClass + '">' + estado + '</span></td>' +
            '</tr>';
        }).join(''));

        Array.from(tbody.querySelectorAll('.recent-invoice-row')).forEach(function(row) {
            row.addEventListener('click', function(e) {
                const id = row.getAttribute('data-document-id');
                const type = row.getAttribute('data-document-type');
                if (type === 'invoice' && id) openInvoiceModal(id);
            });
            row.querySelectorAll('.document-link').forEach(function(link) {
                link.addEventListener('keydown', function(ev) {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        const id = row.getAttribute('data-document-id');
                        const type = row.getAttribute('data-document-type');
                        if (type === 'invoice' && id) openInvoiceModal(id);
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

        setSafeHtml(bodyEl, '<div class="text-center text-muted">Cargando...</div>');
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

            if (!invoiceData) {
                setSafeHtml(bodyEl, '<div class="text-center text-danger">No se encontró la factura o no hay permiso para verla.</div>');
                return;
            }

            // Log para ayuda en debugging: estructura recibida
            try { console.debug('Invoice detail payload:', invoiceData); } catch (e) {}

            // Filtrar facturas de prueba por convención en número o cliente
            const num = String(invoiceData.numero_factura || invoiceData.numero || invoiceData.id || '');
            if (/qa|test|inv-test|test-/i.test(num) || /qa|test/i.test(String(invoiceData.customer_name || invoiceData.cliente_nombre || ''))) {
                setSafeHtml(bodyEl, '<div class="text-center text-muted">Factura de prueba detectada y omitida.</div>');
                return;
            }


                // Usar el renderer estandarizado si está disponible
                if (window.MarketWorld && MarketWorld.utils && typeof MarketWorld.utils.renderInvoiceHTML === 'function') {
                    try {
                        setSafeHtml(bodyEl, MarketWorld.utils.renderInvoiceHTML(invoiceData));
                    } catch (e) {
                        console.warn('Error usando renderInvoiceHTML:', e && e.message ? e.message : e);
                        setSafeHtml(bodyEl, '<div class="text-center text-danger">Error renderizando la factura.</div>');
                    }
                } else {
                    setSafeHtml(bodyEl, '<div class="text-center text-danger">No hay renderer de factura disponible.</div>');
                }
            // El contenido de la factura ya fue renderizado por MarketWorld.utils.renderInvoiceHTML
        } catch (err) {
            console.error('openInvoiceModal error:', err && err.message ? err.message : err);
            setSafeHtml(bodyEl, '<div class="text-center text-danger">Error cargando la factura.</div>');
        }
    }

})();
