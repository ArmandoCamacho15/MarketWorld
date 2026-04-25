
(function () {
    'use strict';

    var charts = {
        ventas: null,
        inventario: null,
        financiero: null,
    };

    var reportState = {
        activeTab: 'ventas',
    };

    document.addEventListener('DOMContentLoaded', function () {
        if (window.MarketWorld && MarketWorld.notifications && MarketWorld.notifications.init) {
            MarketWorld.notifications.init();
        }

        bindTabEvents();
        bindControls();

        cargarReporteTab(reportState.activeTab);
    });

    function bindControls() {
        var btnActualizar = document.getElementById('btnActualizarReporte');
        if (btnActualizar) {
            btnActualizar.addEventListener('click', function () {
                cargarReporteTab(reportState.activeTab);
            });
        }
    }

    function bindTabEvents() {
        var tabButtons = document.querySelectorAll('a[data-bs-toggle="tab"]');

        tabButtons.forEach(function (btn) {
            btn.addEventListener('shown.bs.tab', function (event) {
                var href = event.target.getAttribute('href') || '';
                var tab = href.replace('#', '').trim();
                if (!tab) return;

                reportState.activeTab = tab;
                cargarReporteTab(tab);
            });
        });
    }

    function getReportFilters() {
        var periodo = readValue('periodoAnalisis', 'mes');
        var rango = getRangeFromPeriod(periodo);

        return {
            desde: rango.desde,
            hasta: rango.hasta,
            agrupar: periodo === 'semana' ? 'semana' : (periodo === 'año' ? 'mes' : 'dia'),
        };
    }

    function getRangeFromPeriod(period) {
        var now = new Date();
        var end = toDateString(now);
        var start = new Date(now);

        if (period === 'hoy') {
            start = new Date(now);
        } else if (period === 'semana') {
            var day = start.getDay();
            var diff = day === 0 ? 6 : day - 1;
            start.setDate(start.getDate() - diff);
        } else if (period === 'trimestre') {
            var quarterStartMonth = Math.floor(start.getMonth() / 3) * 3;
            start = new Date(start.getFullYear(), quarterStartMonth, 1);
        } else if (period === 'año') {
            start = new Date(start.getFullYear(), 0, 1);
        } else {
            start = new Date(start.getFullYear(), start.getMonth(), 1);
        }

        return {
            desde: toDateString(start),
            hasta: end,
        };
    }

    async function cargarReporteTab(tab) {
        try {
            if (!window.MarketWorld || !MarketWorld.api || !MarketWorld.api.reports) {
                throw new Error('apiAdapter no esta disponible para reportes.');
            }

            if (tab === 'ventas') {
                await cargarVentas();
            } else if (tab === 'inventario') {
                await cargarInventario();
            } else if (tab === 'financiero') {
                await cargarFinanciero();
            }
        } catch (error) {
            console.error('Error cargando reporte de pestaña:', tab, error);
        }
    }

    async function cargarVentas() {
        var filters = getReportFilters();
        var result;

        try {
            result = await MarketWorld.api.reports.ventas(filters);
        } catch (error) {
            result = await MarketWorld.api.reports.salesSummary(filters);
        }

        var series = normalizeVentas(result);
        renderVentasChart(series.labels, series.values);
        renderVentasTable(series.rows);
    }

    async function cargarInventario() {
        var result;

        try {
            result = await MarketWorld.api.reports.inventario(getReportFilters());
        } catch (error) {
            result = await MarketWorld.api.reports.inventoryUtility(getReportFilters());
        }

        var inventory = normalizeInventario(result);
        renderInventarioChart(inventory.labels, inventory.values);
        renderInventarioTable(inventory.rows);
    }

    async function cargarFinanciero() {
        var result = await MarketWorld.api.reports.financiero(getReportFilters());
        var data = (result && result.data) ? result.data : {};

        var ingresos = Number(data.ingresos_ventas || 0);
        var gastos = Number(data.gastos_compras || 0);
        var utilidad = Number(data.utilidad_bruta || (ingresos - gastos));

        renderFinancieroChart(ingresos, gastos, utilidad);
        renderFinancieroTable([
            {
                fecha: (data.periodo && data.periodo.hasta) || toDateString(new Date()),
                tipo: 'Ingresos',
                monto: ingresos,
                categoria: 'Ventas',
                metodo_pago: '-',
            },
            {
                fecha: (data.periodo && data.periodo.hasta) || toDateString(new Date()),
                tipo: 'Gastos',
                monto: gastos,
                categoria: 'Compras',
                metodo_pago: '-',
            },
            {
                fecha: (data.periodo && data.periodo.hasta) || toDateString(new Date()),
                tipo: 'Resultado',
                monto: utilidad,
                categoria: 'Utilidad Bruta',
                metodo_pago: '-',
            },
        ]);
    }

    function normalizeVentas(payload) {
        var rows = [];

        if (payload && payload.data && Array.isArray(payload.data.periodos)) {
            rows = payload.data.periodos.map(function (item) {
                return {
                    fecha: item.periodo,
                    factura: item.cantidad_facturas,
                    cliente: '-',
                    productos: '-',
                    total: Number(item.total_ventas || 0),
                    estado: 'Consolidado',
                    metodo_pago: '-',
                };
            });
        } else if (payload && Array.isArray(payload.data)) {
            rows = payload.data.map(function (item) {
                return {
                    fecha: item.date,
                    factura: '-',
                    cliente: '-',
                    productos: '-',
                    total: Number(item.total || 0),
                    estado: 'Consolidado',
                    metodo_pago: '-',
                };
            });
        }

        return {
            labels: rows.map(function (row) { return row.fecha; }),
            values: rows.map(function (row) { return row.total; }),
            rows: rows,
        };
    }

    function normalizeInventario(payload) {
        var rows = [];

        if (payload && payload.data && Array.isArray(payload.data.productos)) {
            rows = payload.data.productos.map(function (item) {
                return {
                    producto: item.nombre,
                    categoria: item.categoria,
                    stock: Number(item.stock || 0),
                    stock_minimo: Number(item.stock_minimo || 0),
                    valoracion: Number(item.valorizacion || 0),
                };
            });
        } else if (payload && Array.isArray(payload.data)) {
            rows = payload.data.map(function (item) {
                var stock = Number(item.stock || 0);
                var cost = Number(item.potential_profit || 0);

                return {
                    producto: item.name || '-',
                    categoria: '-',
                    stock: stock,
                    stock_minimo: 0,
                    valoracion: cost,
                };
            });
        }

        var ordered = rows.slice().sort(function (a, b) { return b.valoracion - a.valoracion; }).slice(0, 10);
        return {
            labels: ordered.map(function (row) { return row.producto; }),
            values: ordered.map(function (row) { return row.valoracion; }),
            rows: rows,
        };
    }

    function renderVentasChart(labels, data) {
        var canvas = document.getElementById('ventasChart');
        if (!canvas || typeof Chart === 'undefined') return;

        if (charts.ventas) charts.ventas.destroy();
        charts.ventas = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Ventas',
                    data: data,
                    borderColor: '#0d6ef0',
                    backgroundColor: 'rgba(13, 110, 240, 0.12)',
                    fill: true,
                    tension: 0.25,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) { return formatMoney(value); },
                        },
                    },
                },
            },
        });
    }

    function renderInventarioChart(labels, data) {
        var canvas = document.getElementById('inventarioChart');
        if (!canvas || typeof Chart === 'undefined') return;

        if (charts.inventario) charts.inventario.destroy();
        charts.inventario = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Valorizacion',
                    data: data,
                    backgroundColor: 'rgba(25, 135, 84, 0.55)',
                    borderColor: '#198754',
                    borderWidth: 1,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
            },
        });
    }

    function renderFinancieroChart(ingresos, gastos, utilidad) {
        var canvas = document.getElementById('financieroChart');
        if (!canvas || typeof Chart === 'undefined') return;

        if (charts.financiero) charts.financiero.destroy();
        charts.financiero = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Ingresos', 'Gastos', 'Utilidad'],
                datasets: [{
                    data: [ingresos, gastos, Math.max(utilidad, 0)],
                    backgroundColor: ['#0d6efd', '#dc3545', '#198754'],
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
            },
        });
    }

    function renderVentasTable(rows) {
        var table = document.querySelector('#tablaVentas tbody');
        if (!table) return;

        table.innerHTML = rows.map(function (row) {
            return '<tr>' +
                '<td>' + safeText(row.fecha) + '</td>' +
                '<td>' + safeText(row.factura) + '</td>' +
                '<td>' + safeText(row.cliente) + '</td>' +
                '<td>' + safeText(row.productos) + '</td>' +
                '<td>' + formatMoney(row.total) + '</td>' +
                '<td>' + safeText(row.estado) + '</td>' +
                '<td>' + safeText(row.metodo_pago) + '</td>' +
                '<td>-</td>' +
                '</tr>';
        }).join('');
    }

    function renderInventarioTable(rows) {
        var table = document.querySelector('#tablaInventario tbody');
        if (!table) return;

        table.innerHTML = rows.map(function (row) {
            return '<tr>' +
                '<td>' + safeText(row.producto) + '</td>' +
                '<td>' + safeText(row.categoria) + '</td>' +
                '<td>' + safeText(row.stock) + '</td>' +
                '<td>' + safeText(row.stock_minimo) + '</td>' +
                '<td>' + formatMoney(row.valoracion) + '</td>' +
                '</tr>';
        }).join('');
    }

    function renderFinancieroTable(rows) {
        var table = document.querySelector('#tablaFinanciero tbody');
        if (!table) return;

        table.innerHTML = rows.map(function (row) {
            return '<tr>' +
                '<td>' + safeText(row.fecha) + '</td>' +
                '<td>' + safeText(row.tipo) + '</td>' +
                '<td>' + formatMoney(row.monto) + '</td>' +
                '<td>' + safeText(row.categoria) + '</td>' +
                '<td>' + safeText(row.metodo_pago) + '</td>' +
                '</tr>';
        }).join('');
    }

    function readValue(id, fallback) {
        var el = document.getElementById(id);
        return el ? el.value : fallback;
    }

    function formatMoney(value) {
        var amount = Number(value || 0);
        return '$' + amount.toLocaleString('es-CO', { maximumFractionDigits: 2 });
    }

    function safeText(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function toDateString(date) {
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, '0');
        var d = String(date.getDate()).padStart(2, '0');
        return y + '-' + m + '-' + d;
    }
})();