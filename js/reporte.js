(function () {
    'use strict';

    var charts = {
        ventas: null,
        inventario: null,
        financiero: null,
        cxp: null,
        clientes: null,
        tributario: null,
    };

    var reportState = {
        activeTab: 'ventas',
        exportData: {
            sheetName: 'Reporte',
            fileName: 'reporte_marketworld',
            rows: [],
        },
        summaries: {
            ingresos: 0,
            utilidad: 0,
            facturas: 0,
            clientesActivos: 0,
            ticketPromedio: 0,
            cxpCompras: 0,
            cxpSaldo: 0,
            cxpPagadas: 0,
            cxpPendientes: 0,
            tribFacturas: 0,
            tribBase: 0,
            tribIva: 0,
            tribTotal: 0,
        },
    };

    document.addEventListener('DOMContentLoaded', function () {
        if (window.MarketWorld && MarketWorld.notifications && typeof MarketWorld.notifications.init === 'function') {
            MarketWorld.notifications.init();
        }

        bindTabEvents();
        bindControls();
        bindExportButtons();
        refreshExecutiveKpis();
        cargarReporteTab(reportState.activeTab);
    });

    function bindControls() {
        var btnActualizar = document.getElementById('btnActualizarReporte');
        if (btnActualizar) {
            btnActualizar.addEventListener('click', function () {
                cargarReporteTab(reportState.activeTab);
            });
        }

        ['periodoAnalisis', 'compararPeriodo', 'tipoVista'].forEach(function (id) {
            var element = document.getElementById(id);
            if (!element) return;
            element.addEventListener('change', function () {
                cargarReporteTab(reportState.activeTab);
            });
        });

        var search = document.getElementById('searchReport');
        if (search) {
            search.addEventListener('input', debounce(function () {
                if (reportState.activeTab === 'clientes') {
                    cargarReporteTab('clientes');
                }
            }, 250));
        }
    }

    function bindExportButtons() {
        var excelButton = document.getElementById('btnExportarExcel');
        var pdfButton = document.getElementById('btnExportarPDF');
        var printButton = document.getElementById('btnImprimirReporte');

        if (excelButton) {
            excelButton.addEventListener('click', exportCurrentAsExcel);
        }

        if (pdfButton) {
            pdfButton.addEventListener('click', exportCurrentAsPdf);
        }

        if (printButton) {
            printButton.addEventListener('click', function () {
                window.print();
            });
        }
    }

    function bindTabEvents() {
        var tabButtons = document.querySelectorAll('a[data-bs-toggle="tab"]');

        tabButtons.forEach(function (button) {
            button.addEventListener('shown.bs.tab', function (event) {
                var href = event.target.getAttribute('href') || '';
                var tab = href.replace('#', '').trim();
                if (!tab) return;

                reportState.activeTab = tab;
                cargarReporteTab(tab);
            });
        });
    }

    function cargarReporteTab(tab) {
        if (!window.MarketWorld || !MarketWorld.api || !MarketWorld.api.reports) {
            showGlobalMessage('No se pudo cargar la API de reportes.', 'warning');
            return;
        }

        if (tab === 'ventas') {
            loadVentas();
            return;
        }

        if (tab === 'inventario') {
            loadInventario();
            return;
        }

        if (tab === 'financiero') {
            loadFinanciero();
            return;
        }

        if (tab === 'cxp') {
            loadCxP();
            return;
        }

        if (tab === 'clientes') {
            loadClientes();
            return;
        }

        if (tab === 'tributario') {
            loadTributario();
        }
    }

    function getReportFilters() {
        var periodo = readValue('periodoAnalisis', 'mes');
        var range = getRangeFromPeriod(periodo);

        return {
            desde: range.desde,
            hasta: range.hasta,
            agrupar: periodo === 'semana' ? 'semana' : (periodo === 'año' ? 'mes' : 'dia'),
        };
    }

    function getRangeFromPeriod(period) {
        var now = new Date();
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
            hasta: toDateString(now),
        };
    }

    async function loadVentas() {
        try {
            var filters = getReportFilters();
            var result;

            try {
                result = await MarketWorld.api.reports.ventas(filters);
            } catch (error) {
                result = await MarketWorld.api.reports.salesSummary(filters);
            }

            var series = normalizeVentas(result);
            renderLineChart('ventas', 'ventasChart', series.labels, series.values, 'rgba(13, 110, 240, 1)');
            renderVentasTable(series.rows);
            setExportData('ventas_periodo', series.rows, 'ventas_periodo');
            reportState.summaries.ingresos = series.totalVentas;
            reportState.summaries.facturas = series.totalFacturas;
            reportState.summaries.ticketPromedio = series.totalFacturas > 0 ? series.totalVentas / series.totalFacturas : 0;
            refreshExecutiveKpis();
        } catch (error) {
            renderErrorState('tablaVentas', 8, 'No se pudo cargar el reporte de ventas.');
            console.error('Error cargando ventas:', error);
        }
    }

    async function loadInventario() {
        try {
            var result;

            try {
                result = await MarketWorld.api.reports.inventario(getReportFilters());
            } catch (error) {
                result = await MarketWorld.api.reports.inventoryUtility(getReportFilters());
            }

            var inventory = normalizeInventario(result);
            renderBarChart('inventario', 'inventarioChart', inventory.labels, inventory.values, '#198754');
            renderInventarioTable(inventory.rows);
            setExportData('inventario_valorizado', inventory.rows, 'inventario_valorizado');
        } catch (error) {
            renderErrorState('tablaInventario', 5, 'No se pudo cargar el reporte de inventario.');
            console.error('Error cargando inventario:', error);
        }
    }

    async function loadFinanciero() {
        try {
            var result = await MarketWorld.api.reports.financiero(getReportFilters());
            var data = result && result.data ? result.data : {};

            var ingresos = Number(data.ingresos_ventas || 0);
            var gastos = Number(data.gastos_compras || 0);
            var utilidad = Number(data.utilidad_bruta || (ingresos - gastos));

            renderDoughnutChart('financiero', 'financieroChart', ['Ingresos', 'Gastos', 'Utilidad'], [ingresos, gastos, Math.max(utilidad, 0)]);
            var rows = [
                { fecha: data.periodo && data.periodo.hasta ? data.periodo.hasta : toDateString(new Date()), tipo: 'Ingresos', monto: ingresos, categoria: 'Ventas', metodo_pago: '-' },
                { fecha: data.periodo && data.periodo.hasta ? data.periodo.hasta : toDateString(new Date()), tipo: 'Gastos', monto: gastos, categoria: 'Compras', metodo_pago: '-' },
                { fecha: data.periodo && data.periodo.hasta ? data.periodo.hasta : toDateString(new Date()), tipo: 'Resultado', monto: utilidad, categoria: 'Utilidad Bruta', metodo_pago: '-' },
            ];

            renderFinancieroTable(rows);
            reportState.summaries.ingresos = ingresos;
            reportState.summaries.utilidad = utilidad;
            refreshExecutiveKpis();
            setExportData('financiero_resumen', rows, 'financiero_resumen');
        } catch (error) {
            renderErrorState('tablaFinanciero', 5, 'No se pudo cargar el reporte financiero.');
            console.error('Error cargando financiero:', error);
        }
    }

    async function loadCxP() {
        try {
            var result = await MarketWorld.api.reports.cxp(getReportFilters());
            var data = result && result.data ? result.data : {};
            var items = Array.isArray(data.items) ? data.items : [];

            renderBarChart('cxp', 'cxpChart', items.slice(0, 10).map(function (item) { return item.proveedor; }), items.slice(0, 10).map(function (item) { return Number(item.saldo || 0); }), '#dc3545');
            renderCxPTable(items);

            reportState.summaries.cxpCompras = Number(data.resumen && data.resumen.compras || items.length);
            reportState.summaries.cxpSaldo = Number(data.resumen && data.resumen.saldo || sumBy(items, 'saldo'));
            reportState.summaries.cxpPagadas = Number(data.resumen && data.resumen.pagado || sumBy(items, 'pagado'));
            reportState.summaries.cxpPendientes = Number(data.resumen && data.resumen.pendientes || items.filter(function (item) { return Number(item.saldo || 0) > 0; }).length);
            refreshExecutiveKpis();

            setExportData('cuentas_por_pagar', items, 'cuentas_por_pagar');
        } catch (error) {
            renderErrorState('tablaCxP', 7, 'No se pudo cargar el reporte de cuentas por pagar.');
            console.error('Error cargando CxP:', error);
        }
    }

    async function loadClientes() {
        try {
            var filters = getReportFilters();
            var search = readValue('searchReport', '').trim();
            if (search) {
                filters.search = search;
            }

            var result = await MarketWorld.api.reports.clientes(filters);
            var data = result && result.data ? result.data : {};
            var items = Array.isArray(data.items) ? data.items : [];

            renderDoughnutChart('clientes', 'clientesChart', ['Activos', 'Inactivos'], [
                Number(data.resumen && data.resumen.clientes_activos || items.filter(function (item) { return item.estado === 'Activo'; }).length),
                Math.max(Number(data.resumen && data.resumen.total_clientes || items.length) - Number(data.resumen && data.resumen.clientes_activos || items.filter(function (item) { return item.estado === 'Activo'; }).length), 0),
            ]);
            renderClientesTable(items);

            reportState.summaries.clientesActivos = Number(data.resumen && data.resumen.clientes_activos || items.filter(function (item) { return item.estado === 'Activo'; }).length);
            refreshExecutiveKpis();

            setExportData('clientes_periodo', items, 'clientes_periodo');
        } catch (error) {
            renderErrorState('tablaClientes', 5, 'No se pudo cargar el reporte de clientes.');
            console.error('Error cargando clientes:', error);
        }
    }

    async function loadTributario() {
        try {
            var result = await MarketWorld.api.reports.taxSummary(getReportFilters());
            var data = result && result.data ? result.data : {};
            var periods = Array.isArray(data.periodos) ? data.periodos : [];

            renderBarChart('tributario', 'tributarioChart', periods.map(function (item) { return item.periodo; }), periods.map(function (item) { return Number(item.iva_generado || 0); }), '#6f42c1');
            renderTributarioTable(periods);

            reportState.summaries.tribFacturas = Number(data.totales && data.totales.cantidad_facturas || periods.reduce(function (accumulator, item) { return accumulator + Number(item.cantidad_facturas || 0); }, 0));
            reportState.summaries.tribBase = Number(data.totales && data.totales.base_gravable || sumBy(periods, 'base_gravable'));
            reportState.summaries.tribIva = Number(data.totales && data.totales.iva_generado || sumBy(periods, 'iva_generado'));
            reportState.summaries.tribTotal = Number(data.totales && data.totales.total_facturado || sumBy(periods, 'total_facturado'));
            refreshExecutiveKpis();

            setExportData('tributario_iva', periods, 'tributario_iva');
            showDianNotice('El flujo DIAN completo permanece deshabilitado en esta fase. El resumen tributario sí proviene de la API.');
        } catch (error) {
            renderErrorState('tablaTributario', 6, 'No se pudo cargar el reporte tributario.');
            showDianNotice('No se pudo cargar el resumen tributario. DIAN sigue deshabilitado hasta la segunda fase.');
            console.error('Error cargando tributario:', error);
        }
    }

    function normalizeVentas(payload) {
        var rows = [];
        var totalVentas = 0;
        var totalFacturas = 0;

        if (payload && payload.data && Array.isArray(payload.data.periodos)) {
            rows = payload.data.periodos.map(function (item) {
                var total = Number(item.total_ventas || 0);
                totalVentas += total;
                totalFacturas += Number(item.cantidad_facturas || 0);

                return {
                    fecha: item.periodo,
                    factura: Number(item.cantidad_facturas || 0),
                    cliente: '-',
                    productos: '-',
                    total: total,
                    estado: 'Consolidado',
                    metodo_pago: '-',
                };
            });
        } else if (payload && Array.isArray(payload.data)) {
            rows = payload.data.map(function (item) {
                var total = Number(item.total || 0);
                totalVentas += total;
                totalFacturas += 1;

                return {
                    fecha: item.date,
                    factura: '-',
                    cliente: '-',
                    productos: '-',
                    total: total,
                    estado: 'Consolidado',
                    metodo_pago: '-',
                };
            });
        }

        return {
            labels: rows.map(function (row) { return row.fecha; }),
            values: rows.map(function (row) { return row.total; }),
            rows: rows,
            totalVentas: totalVentas,
            totalFacturas: totalFacturas,
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
                return {
                    producto: item.name || '-',
                    categoria: '-',
                    stock: Number(item.stock || 0),
                    stock_minimo: 0,
                    valoracion: Number(item.potential_profit || 0),
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

    function renderVentasTable(rows) {
        renderRows('tablaVentas', rows, function (row) {
            return [
                escapeHtml(row.fecha),
                escapeHtml(row.factura),
                escapeHtml(row.cliente),
                escapeHtml(row.productos),
                formatCurrency(row.total),
                escapeHtml(row.estado),
                escapeHtml(row.metodo_pago),
                '-',
            ];
        }, 'No hay ventas para el período seleccionado.', 8);
    }

    function renderInventarioTable(rows) {
        renderRows('tablaInventario', rows, function (row) {
            return [
                escapeHtml(row.producto),
                escapeHtml(row.categoria),
                escapeHtml(row.stock),
                escapeHtml(row.stock_minimo),
                formatCurrency(row.valoracion),
            ];
        }, 'No hay productos con información de inventario para el período seleccionado.', 5);
    }

    function renderFinancieroTable(rows) {
        renderRows('tablaFinanciero', rows, function (row) {
            return [
                escapeHtml(row.fecha),
                escapeHtml(row.tipo),
                formatCurrency(row.monto),
                escapeHtml(row.categoria),
                escapeHtml(row.metodo_pago),
            ];
        }, 'No hay movimientos financieros para el período seleccionado.', 5);
    }

    function renderCxPTable(rows) {
        renderRows('tablaCxP', rows, function (row) {
            return [
                escapeHtml(row.fecha),
                escapeHtml(row.numero_orden),
                escapeHtml(row.proveedor),
                escapeHtml(formatStatePago(row.estado_pago)),
                formatCurrency(row.total),
                formatCurrency(row.pagado),
                formatCurrency(row.saldo),
            ];
        }, 'No hay cuentas por pagar para el período seleccionado.', 7);
    }

    function renderClientesTable(rows) {
        renderRows('tablaClientes', rows, function (row) {
            return [
                escapeHtml(row.nombre),
                escapeHtml(row.email),
                escapeHtml(row.telefono),
                escapeHtml(row.fecha_registro),
                escapeHtml(row.estado),
            ];
        }, 'No hay clientes para el período seleccionado.', 5);
    }

    function renderTributarioTable(rows) {
        renderRows('tablaTributario', rows, function (row) {
            return [
                escapeHtml(row.periodo),
                escapeHtml(row.cantidad_facturas),
                formatCurrency(row.base_gravable),
                formatCurrency(row.iva_generado),
                formatCurrency(row.total_facturado),
                escapeHtml(row.tasa_promedio) + '%',
            ];
        }, 'No hay datos tributarios para el período seleccionado.', 6);
    }

    function renderRows(tableId, rows, mapper, emptyMessage, colspan) {
        var table = document.querySelector('#' + tableId + ' tbody');
        if (!table) return;

        if (!rows || !rows.length) {
            table.innerHTML = '<tr><td colspan="' + colspan + '" class="text-center text-muted py-4">' + escapeHtml(emptyMessage) + '</td></tr>';
            return;
        }

        table.innerHTML = rows.map(function (row) {
            return '<tr>' + mapper(row).map(function (cell) {
                return '<td>' + cell + '</td>';
            }).join('') + '</tr>';
        }).join('');
    }

    function renderLineChart(key, canvasId, labels, values, color) {
        var canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;

        destroyChart(key);
        charts[key] = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total',
                    data: values,
                    borderColor: color,
                    backgroundColor: color.replace('1)', '0.12)'),
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
                            callback: function (value) { return formatCurrency(value); },
                        },
                    },
                },
            },
        });
    }

    function renderBarChart(key, canvasId, labels, values, color) {
        var canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;

        destroyChart(key);
        charts[key] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Valor',
                    data: values,
                    backgroundColor: color,
                    borderColor: color,
                    borderWidth: 1,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) { return formatCurrency(value); },
                        },
                    },
                },
            },
        });
    }

    function renderDoughnutChart(key, canvasId, labels, values) {
        var canvas = document.getElementById(canvasId);
        if (!canvas || typeof Chart === 'undefined') return;

        destroyChart(key);
        charts[key] = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: ['#0d6efd', '#dc3545', '#198754', '#ffc107'],
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
            },
        });
    }

    function refreshExecutiveKpis() {
        setText('kpiIngresos', formatCurrency(reportState.summaries.ingresos));

        var margen = reportState.summaries.ingresos > 0
            ? (reportState.summaries.utilidad / reportState.summaries.ingresos) * 100
            : 0;

        setText('kpiMargen', reportState.summaries.ingresos > 0 ? margen.toFixed(1) + '%' : '—');
        setText('kpiClientes', reportState.summaries.clientesActivos > 0 ? formatNumber(reportState.summaries.clientesActivos) : '—');
        setText('kpiTicket', reportState.summaries.ticketPromedio > 0 ? formatCurrency(reportState.summaries.ticketPromedio) : '—');

        setText('kpiCxpCompras', reportState.summaries.cxpCompras > 0 ? formatNumber(reportState.summaries.cxpCompras) : '—');
        setText('kpiCxpSaldo', reportState.summaries.cxpSaldo > 0 ? formatCurrency(reportState.summaries.cxpSaldo) : '—');
        setText('kpiCxpPagadas', reportState.summaries.cxpPagadas > 0 ? formatCurrency(reportState.summaries.cxpPagadas) : '—');
        setText('kpiCxpPendientes', reportState.summaries.cxpPendientes > 0 ? formatNumber(reportState.summaries.cxpPendientes) : '—');

        setText('kpiTribFacturas', reportState.summaries.tribFacturas > 0 ? formatNumber(reportState.summaries.tribFacturas) : '—');
        setText('kpiTribBase', reportState.summaries.tribBase > 0 ? formatCurrency(reportState.summaries.tribBase) : '—');
        setText('kpiTribIva', reportState.summaries.tribIva > 0 ? formatCurrency(reportState.summaries.tribIva) : '—');
        setText('kpiTribTotal', reportState.summaries.tribTotal > 0 ? formatCurrency(reportState.summaries.tribTotal) : '—');
    }

    function exportCurrentAsExcel() {
        var data = reportState.exportData.rows || [];

        if (!data.length) {
            alert('No hay datos para exportar');
            return;
        }

        if (typeof XLSX !== 'undefined') {
            var worksheet = XLSX.utils.json_to_sheet(data);
            var workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, reportState.exportData.sheetName);
            XLSX.writeFile(workbook, reportState.exportData.fileName + '.xlsx');
            return;
        }

        downloadCsv(reportState.exportData.fileName + '.csv', data);
    }

    function exportCurrentAsPdf() {
        var data = reportState.exportData.rows || [];

        if (!data.length) {
            alert('No hay datos para exportar');
            return;
        }

        var PdfCtor = window.jspdf && window.jspdf.jsPDF;
        if (!PdfCtor) {
            alert('PDF no disponible en este entorno');
            return;
        }

        var doc = new PdfCtor({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        doc.setFontSize(14);
        doc.text('MarketWorld ERP - ' + reportState.exportData.sheetName, 40, 40);
        doc.setFontSize(9);

        var keys = Object.keys(data[0]);
        var y = 70;
        doc.text(keys.join(' | '), 40, y);
        y += 18;

        data.forEach(function (row) {
            var values = keys.map(function (key) { return String(row[key] ?? ''); });
            doc.text(values.join(' | '), 40, y);
            y += 14;
            if (y > 520) {
                doc.addPage();
                y = 40;
            }
        });

        doc.save(reportState.exportData.fileName + '.pdf');
    }

    function setExportData(sheetName, rows, fileName) {
        reportState.exportData = {
            sheetName: sheetName,
            fileName: fileName,
            rows: rows || [],
        };
    }

    function renderErrorState(tableId, colspan, message) {
        var table = document.querySelector('#' + tableId + ' tbody');
        if (!table) return;
        table.innerHTML = '<tr><td colspan="' + colspan + '" class="text-center text-danger py-4">' + escapeHtml(message) + '</td></tr>';
    }

    function showGlobalMessage(message, type) {
        var container = document.getElementById('searchReport');
        if (container && type === 'warning') {
            container.setAttribute('placeholder', message);
        }
    }

    function showDianNotice(message) {
        var notice = document.getElementById('dianNotice');
        if (!notice) return;
        notice.innerHTML = '<strong>DIAN pendiente:</strong> ' + escapeHtml(message);
    }

    function destroyChart(key) {
        if (charts[key]) {
            charts[key].destroy();
            charts[key] = null;
        }
    }

    function readValue(id, fallback) {
        var element = document.getElementById(id);
        return element ? element.value : fallback;
    }

    function setText(id, value) {
        var element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatCurrency(value) {
        return '$' + Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString('es-CO');
    }

    function formatStatePago(value) {
        if (!value) return '-';
        return String(value)
            .split('_')
            .map(function (part) { return part.charAt(0).toUpperCase() + part.slice(1); })
            .join(' ');
    }

    function sumBy(rows, key) {
        return rows.reduce(function (accumulator, item) {
            return accumulator + Number(item[key] || 0);
        }, 0);
    }

    function downloadCsv(filename, rows) {
        var headers = Object.keys(rows[0] || {});
        var csv = [headers.join(';')].concat(rows.map(function (row) {
            return headers.map(function (header) {
                return '"' + String(row[header] ?? '').replace(/"/g, '""') + '"';
            }).join(';');
        })).join('\n');

        var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
    }

    function debounce(fn, wait) {
        var timer = null;
        return function () {
            var context = this;
            var args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function () {
                fn.apply(context, args);
            }, wait);
        };
    }

    function toDateString(date) {
        var year = date.getFullYear();
        var month = String(date.getMonth() + 1).padStart(2, '0');
        var day = String(date.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }
})();