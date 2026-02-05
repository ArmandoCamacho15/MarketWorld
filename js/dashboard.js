
(function() {
    'use strict';

    let salesChart, categoriesChart, incomeExpenseChart;

    document.addEventListener('DOMContentLoaded', () => {
        console.log(' Módulo Dashboard cargado');
        
        // Inicializar
        initCharts();
        initDateFilters();
        initKPIs();
        initCalendar();
        initTransactions();
        animateKPIs();
        
        // Inicializar sistema de notificaciones
        if (typeof MarketWorld.notifications !== 'undefined') {
            MarketWorld.notifications.init();
        }
    });

    // Inicializar gráficos con Chart.js
    function initCharts() {
        // Gráfico de ventas mensuales
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

        // Gráfico de categorías más vendidas
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

    // Filtros de fecha interactivos
    function initDateFilters() {
        const quickButtons = document.querySelectorAll('.quick-date-btn');
        
        quickButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const period = btn.textContent.trim();
                
                // Remover clase active de todos
                quickButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                console.log(`📅 Aplicando filtro: ${period}`);
                applyDateFilter(period);
            });
        });
    }

    function applyDateFilter(period) {
        // Simular actualización de datos
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
        
        // Actualizar gráficos
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

    // KPIs interactivos
    function initKPIs() {
        const kpiCards = document.querySelectorAll('.kpi-card');
        
        kpiCards.forEach(card => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                const label = card.querySelector('.kpi-label').textContent;
                console.log(`📈 KPI clickeado: ${label}`);
                
                // Redirigir según el KPI
                if (label.includes('Ventas')) {
                    window.location.href = 'facturacion.html';
                } else if (label.includes('Compras')) {
                    window.location.href = 'compras.html';
                } else if (label.includes('Clientes')) {
                    window.location.href = 'crm.html';
                } else if (label.includes('Inventario')) {
                    window.location.href = 'inventario.html';
                }
            });
        });
    }

    // Calendario con FullCalendar
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

    // Transacciones interactivas
    function initTransactions() {
        const transactionRows = document.querySelectorAll('.transaction-table tbody tr');
        
        transactionRows.forEach(row => {
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                const invoiceNumber = row.cells[0].textContent;
                console.log(`🧾 Transacción seleccionada: ${invoiceNumber}`);
                window.location.href = `facturacion.html?invoice=${invoiceNumber}`;
            });
        });
    }

})();
