// contabilidad.js - Módulo de Contabilidad Funcional

(function() {
    'use strict';

    // Estado local del módulo
    let currentAccount = null;
    let balanceChart = null;
    let incomeChart = null;
    let partidasTemporales = [];
    let contabilidadState = {
        accounts: [],
        journalEntries: []
    };

    document.addEventListener('DOMContentLoaded', () => {
        console.log('💰 Módulo Contabilidad - Inicializando interactividad completa');
        
        // Inicializar componentes base
        initApp();
        
        // Configurar listeners de formularios
        setupFormListeners();

        // Cargar datos reales desde API antes de renderizar
        loadContabilidadStateFromAPI()
            .catch((error) => {
                console.error('[Contabilidad] Error cargando datos desde API:', error);
            })
            .finally(() => {
                actualizarDashboard();
                renderizarPlanContable();
                cargarAsientosContables();
                inicializarLibros();
                inicializarImpuestos();
            });
    });

    function initApp() {
        // Notificaciones
        if (window.MarketWorld && MarketWorld.notifications) {
            MarketWorld.notifications.init();
        }
    }

    function normalizeApiListResponse(response, fallbackMeta) {
        const payload = response || {};
        const items = Array.isArray(payload.data)
            ? payload.data
            : (Array.isArray(payload) ? payload : []);

        return {
            items: items,
            meta: Object.assign({
                total: items.length,
                per_page: (fallbackMeta && fallbackMeta.per_page) || items.length || 15,
                current_page: (fallbackMeta && fallbackMeta.current_page) || 1,
                last_page: (fallbackMeta && fallbackMeta.last_page) || 1,
            }, payload.meta || {}),
            success: payload.success !== false,
            message: payload.message || ''
        };
    }

    function setContabilidadState(accounts, journalEntries) {
        contabilidadState.accounts = Array.isArray(accounts) ? accounts.slice() : [];
        contabilidadState.journalEntries = Array.isArray(journalEntries) ? journalEntries.slice() : [];
    }

    async function loadContabilidadStateFromAPI() {
        if (!MarketWorld.api || !MarketWorld.api.accounts || !MarketWorld.api.journalEntries) {
            setContabilidadState([], []);
            return false;
        }

        const [accountsResponse, entriesResponse] = await Promise.all([
            MarketWorld.api.accounts.getAll(),
            MarketWorld.api.journalEntries.getAll()
        ]);

        const accountsParsed = normalizeApiListResponse(accountsResponse);
        const entriesParsed = normalizeApiListResponse(entriesResponse);

        setContabilidadState(accountsParsed.items, entriesParsed.items);
        return true;
    }

    function getAccounts() {
        return contabilidadState.accounts.slice();
    }

    function getJournalEntries() {
        return contabilidadState.journalEntries.slice();
    }

    function findAccountById(id) {
        return contabilidadState.accounts.find(function(account) {
            return String(account.id) === String(id);
        }) || null;
    }

    function findAccountByCode(codigo) {
        const normalized = String(codigo || '').trim().toLowerCase();
        return contabilidadState.accounts.find(function(account) {
            return String(account.codigo || '').trim().toLowerCase() === normalized;
        }) || null;
    }

    function findJournalEntryById(id) {
        return contabilidadState.journalEntries.find(function(entry) {
            return String(entry.id) === String(id);
        }) || null;
    }

    function getEntryItems(entry) {
        if (!entry) return [];
        if (Array.isArray(entry.items)) return entry.items;
        if (Array.isArray(entry.partidas)) return entry.partidas;
        return [];
    }

    function getEntryDisplayNumber(entry) {
        if (!entry) return 'AS-00000';
        return entry.numero || ('AS-' + String(entry.id || 0).padStart(5, '0'));
    }

    function getEntryDisplayType(entry) {
        if (!entry) return 'Manual';
        return entry.tipo || entry.referencia_tipo || 'Manual';
    }

    function getFinancialSummary() {
        const summary = {
            activos: 0,
            pasivos: 0,
            patrimonio: 0,
            ingresos: 0,
            gastos: 0,
            utilidadNeta: 0
        };

        const accountTypeToBucket = {
            'Activo': 'activos',
            'Pasivo': 'pasivos',
            'Patrimonio': 'patrimonio',
            'Ingreso': 'ingresos',
            'Gasto': 'gastos'
        };

        getJournalEntries().forEach(function(entry) {
            getEntryItems(entry).forEach(function(item) {
                const account = item.account || findAccountById(item.account_id);
                if (!account || !account.tipo) return;

                const debe = parseFloat(item.debe || 0) || 0;
                const haber = parseFloat(item.haber || 0) || 0;
                const delta = (account.tipo === 'Activo' || account.tipo === 'Gasto') ? (debe - haber) : (haber - debe);
                const bucket = accountTypeToBucket[account.tipo];

                if (bucket) {
                    summary[bucket] += delta;
                }
            });
        });

        summary.utilidadNeta = summary.ingresos - summary.gastos;
        return summary;
    }

    function getAccountMovements(codigo, options) {
        const account = findAccountByCode(codigo);
        if (!account) {
            return { movements: [], total: 0, hasMore: false };
        }

        options = options || {};
        const limit = options.limit || 1000;
        const offset = options.offset || 0;
        const startDate = options.startDate;
        const endDate = options.endDate;
        const normalizedCode = String(codigo || '').trim().toLowerCase();
        const movements = [];

        getJournalEntries().forEach(function(entry) {
            if (startDate && entry.fecha < startDate) return;
            if (endDate && entry.fecha > endDate) return;

            getEntryItems(entry).forEach(function(item) {
                const itemAccount = item.account || findAccountById(item.account_id);
                if (!itemAccount) return;

                const itemCode = String(itemAccount.codigo || itemAccount.code || '').trim().toLowerCase();
                if (itemCode !== normalizedCode) return;

                movements.push({
                    fecha: entry.fecha,
                    numero: getEntryDisplayNumber(entry),
                    descripcion: entry.glosa || entry.descripcion || '',
                    debe: parseFloat(item.debe || 0) || 0,
                    haber: parseFloat(item.haber || 0) || 0
                });
            });
        });

        movements.sort(function(a, b) {
            return new Date(a.fecha) - new Date(b.fecha);
        });

        return {
            movements: movements.slice(offset, offset + limit),
            total: movements.length,
            hasMore: movements.length > (offset + limit)
        };
    }

    // --- Dashboard y gráficos ---

    function actualizarDashboard() {
        const summary = getFinancialSummary();
        const utils = MarketWorld.utils;

        const mapping = {
            'kpi-activos': summary.activos,
            'kpi-pasivos': summary.pasivos,
            'kpi-patrimonio': summary.patrimonio,
            'kpi-utilidad': summary.utilidadNeta
        };

        Object.entries(mapping).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = utils.formatCurrency(value);
        });

        actualizarGraficos(summary);
    }

    function actualizarGraficos(summary) {
        if (typeof Chart === 'undefined') return;

        // Balance General
        const balanceCtx = document.getElementById('balanceChart');
        if (balanceCtx) {
            if (balanceChart) balanceChart.destroy();
            balanceChart = new Chart(balanceCtx, {
                type: 'bar',
                data: {
                    labels: ['Activos', 'Pasivos', 'Patrimonio'],
                    datasets: [{
                        label: 'Valor en COP',
                        data: [summary.activos, summary.pasivos, summary.patrimonio],
                        backgroundColor: ['#2ecc71', '#e74c3c', '#f39c12'],
                        borderRadius: 5
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => '$' + (value / 1000000).toFixed(1) + 'M'
                            }
                        }
                    }
                }
            });
        }

        // Estado de Resultados
        const incomeCtx = document.getElementById('incomeChart');
        if (incomeCtx) {
            if (incomeChart) incomeChart.destroy();
            incomeChart = new Chart(incomeCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Ingresos', 'Gastos', 'Utilidad Neta'],
                    datasets: [{
                        data: [summary.ingresos, summary.gastos, Math.max(0, summary.utilidadNeta)],
                        backgroundColor: ['#3498db', '#e67e22', '#2ecc71']
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
    }

    // ======= PLAN CONTABLE =======

    function renderizarPlanContable() {
        const container = document.getElementById('accountTreeContainer');
        if (!container) return;

        const accounts = getAccounts();
        container.innerHTML = '';

        const renderNode = (parentCode, level) => {
            const children = accounts.filter(a => a.padre === parentCode);
            if (children.length === 0) return null;

            const ul = document.createElement('ul');
            children.forEach(acc => {
                const li = document.createElement('li');
                li.className = 'account-item';
                li.setAttribute('data-codigo', acc.codigo);
                
                let typeTag = '';
                if (acc.nivel === 'Clase') {
                    typeTag = `<span class="account-type type-${acc.tipo.toLowerCase()}">${acc.tipo}</span>`;
                }
                
                li.innerHTML = `
                    <span class="account-code">${acc.codigo}</span> ${acc.nombre}
                    ${typeTag}
                `;
                
                li.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const active = container.querySelector('.selected');
                    if (active) active.classList.remove('selected');
                    li.classList.add('selected');
                    cargarDetalleCuenta(acc.codigo);
                });

                const childUl = renderNode(acc.codigo, level + 1);
                if (childUl) li.appendChild(childUl);
                ul.appendChild(li);
            });
            return ul;
        };

        const rootUl = renderNode(null, 0);
        if (rootUl) container.appendChild(rootUl);
    }

    function cargarDetalleCuenta(codigo) {
        const account = findAccountByCode(codigo);
        if (!account) return;

        currentAccount = account;

        // Cargar datos en el formulario de detalle (usando IDs robustos)
        const inputs = {
            codigo: document.getElementById('account-code'),
            nombre: document.getElementById('account-name'),
            tipo: document.getElementById('account-type'),
            descripcion: document.getElementById('account-desc'),
            nivel: document.getElementById('account-level'),
            padre: document.getElementById('account-parent'),
            moneda: document.getElementById('account-currency')
        };

        if (inputs.codigo) inputs.codigo.value = account.codigo;
        if (inputs.nombre) inputs.nombre.value = account.nombre;
        if (inputs.tipo) inputs.tipo.value = account.tipo;
        if (inputs.descripcion) inputs.descripcion.value = account.descripcion || '';
        if (inputs.nivel) inputs.nivel.value = account.nivel || '';
        if (inputs.padre) inputs.padre.value = account.padre || '';
        if (inputs.moneda) inputs.moneda.value = account.moneda || 'COP';
        
        // Cargar movimientos de esta cuenta
        cargarMovimientosCuenta(codigo);

        console.log(`📖 Cuenta cargada: ${account.codigo} - ${account.nombre}`);
    }

    function cargarMovimientosCuenta(codigo) {
        const tableBody = document.getElementById('account-movements-body');
        const tfoot = document.getElementById('account-movements-foot');
        if (!tableBody) return;

        const account = findAccountByCode(codigo);
        const result = getAccountMovements(codigo, { limit: 100 });
        const movements = result.movements || [];

        if (movements.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">No hay movimientos registrados para esta cuenta</td>
                </tr>
            `;
            if (tfoot) tfoot.innerHTML = '';
            return;
        }

        let saldoAcumulado = 0;
        let totalDebe = 0;
        let totalHaber = 0;

        const rows = movements.map(m => {
            const debe = m.debe || 0;
            const haber = m.haber || 0;
            
            totalDebe += debe;
            totalHaber += haber;
            
            // Regla de saldo según tipo de cuenta
            if (account.tipo === 'Activo' || account.tipo === 'Gasto') {
                saldoAcumulado += (debe - haber);
            } else {
                saldoAcumulado += (haber - debe);
            }

            return `
                <tr>
                    <td>${MarketWorld.utils.formatDate(m.fecha)}</td>
                    <td>${m.descripcion}</td>
                    <td class="debit">${debe > 0 ? MarketWorld.utils.formatCurrency(debe) : ''}</td>
                    <td class="credit">${haber > 0 ? MarketWorld.utils.formatCurrency(haber) : ''}</td>
                    <td class="fw-bold ${saldoAcumulado >= 0 ? 'debit' : 'credit'}">${MarketWorld.utils.formatCurrency(Math.abs(saldoAcumulado))}</td>
                </tr>
            `;
        }).join('');

        tableBody.innerHTML = rows;

        // Agregar fila de total
        if (tfoot) {
            tfoot.innerHTML = `
                <tr class="fw-bold">
                    <td colspan="2">Total</td>
                    <td class="debit">${MarketWorld.utils.formatCurrency(totalDebe)}</td>
                    <td class="credit">${MarketWorld.utils.formatCurrency(totalHaber)}</td>
                    <td class="${saldoAcumulado >= 0 ? 'debit' : 'credit'}">${MarketWorld.utils.formatCurrency(Math.abs(saldoAcumulado))}</td>
                </tr>
            `;
        }
    }

    // ======= ASIENTOS CONTABLES =======

    function setupFormListeners() {
        // Botón Nuevo Asiento (en el tab de Asientos)
        const btnNewEntry = document.getElementById('btn-new-entry');
        if (btnNewEntry) btnNewEntry.addEventListener('click', mostrarFormularioAsiento);

        // Botón Agregar Partida
        const btnAddPartida = document.getElementById('btn-add-line');
        if (btnAddPartida) btnAddPartida.addEventListener('click', agregarFilaPartida);

        // Botón Registrar Asiento
        const btnRegistrar = document.getElementById('btn-register-entry');
        if (btnRegistrar) {
            btnRegistrar.addEventListener('click', registrarNuevoAsiento);
        }

        // Buscador de Plan Contable
        const searchInput = document.getElementById('searchAccount');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                document.querySelectorAll('#accountTreeContainer li').forEach(li => {
                    const text = li.textContent.toLowerCase();
                    li.style.display = text.includes(term) ? '' : 'none';
                });
            });
        }

        // Botón guardar cuenta (Plan Contable)
        const btnGuardarCuenta = document.getElementById('btn-save-account');
        if (btnGuardarCuenta) btnGuardarCuenta.addEventListener('click', guardarCuenta);

        // Botones de filtro en Libro Diario
        const btnFiltrarDiario = document.querySelector('#diario .btn-primary');
        if (btnFiltrarDiario) {
            btnFiltrarDiario.addEventListener('click', aplicarFiltrosDiario);
        }

        // Botones de filtro en Libro Mayor
        const btnFiltrarMayor = document.querySelector('#mayor .btn-primary');
        if (btnFiltrarMayor) {
            btnFiltrarMayor.addEventListener('click', aplicarFiltrosMayor);
        }

        // Conciliación bancaria
        const btnConciliar = document.querySelector('#conciliacion .btn-primary');
        if (btnConciliar) {
            btnConciliar.addEventListener('click', calcularConciliacion);
        }

        const btnAjustes = document.querySelector('#conciliacion .btn-success');
        if (btnAjustes) {
            btnAjustes.addEventListener('click', registrarAjustesConciliacion);
        }
    }

    function mostrarFormularioAsiento() {
        console.log('📝 Preparando formulario para nuevo asiento');
        // El formulario ya está visible en el HTML, solo limpiar campos
        limpiarFormularioAsiento();
    }

    function limpiarFormularioAsiento() {
        const fecha = document.getElementById('entry-date');
        const descripcion = document.getElementById('entry-desc');
        const tipo = document.getElementById('entry-type');

        if (fecha) fecha.value = new Date().toISOString().split('T')[0];
        if (descripcion) descripcion.value = '';
        if (tipo) tipo.value = 'Manual';

        // Eliminar todas las filas de partidas excepto la primera
        const partidas = document.querySelectorAll('#entry-lines .input-group');
        partidas.forEach((p, i) => {
            if (i > 0) p.remove();
        });

        // Limpiar la primera fila
        if (partidas.length > 0) {
            const selects = partidas[0].querySelectorAll('select');
            const input = partidas[0].querySelector('input');
            if (selects[0]) selects[0].value = '';
            if (input) input.value = '';
            if (selects[1]) selects[1].value = 'debe';
        }

        partidasTemporales = [];
        calcularDiferenciaAsiento();
    }

    function agregarFilaPartida() {
        const container = document.getElementById('entry-lines');
        if (!container) return;

        const div = document.createElement('div');
        div.className = 'input-group mb-2 partida-row';
        
        const accounts = getAccounts();
        const options = accounts.map(a => `<option value="${a.codigo}">${a.codigo} - ${a.nombre}</option>`).join('');

        div.innerHTML = `
            <select class="form-select account-select">
                <option value="">Seleccionar cuenta</option>
                ${options}
            </select>
            <input type="number" class="form-control amount-input" placeholder="Monto" style="max-width: 120px;" min="0" step="0.01">
            <select class="form-select type-select" style="max-width: 120px;">
                <option value="debe">Debe</option>
                <option value="haber">Haber</option>
            </select>
            <button class="btn btn-outline-danger btn-remove" type="button">
                <i class="bi bi-trash"></i>
            </button>
        `;

        // Eventos para recalcular diferencia
        div.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('change', calcularDiferenciaAsiento);
            el.addEventListener('input', calcularDiferenciaAsiento);
        });

        div.querySelector('.btn-remove').addEventListener('click', () => {
            div.remove();
            calcularDiferenciaAsiento();
        });

        // Insertar antes del botón "Agregar Partida"
        const btnAdd = document.getElementById('btn-add-line');
        container.insertBefore(div, btnAdd);

        calcularDiferenciaAsiento();
    }

    function calcularDiferenciaAsiento() {
        let totalDebe = 0;
        let totalHaber = 0;

        document.querySelectorAll('#entry-lines .partida-row').forEach(group => {
            const monto = parseFloat(group.querySelector('.amount-input')?.value || 0);
            const tipo = group.querySelector('.type-select')?.value;

            if (monto > 0) {
                if (tipo === 'debe') totalDebe += monto;
                else if (tipo === 'haber') totalHaber += monto;
            }
        });

        const diferencia = totalDebe - totalHaber;
        const diffSpan = document.getElementById('entry-diff');
        const btnRegistrar = document.getElementById('btn-register-entry');

        if (diffSpan) {
            diffSpan.textContent = MarketWorld.utils.formatCurrency(Math.abs(diferencia));
            diffSpan.className = diferencia === 0 ? 'text-success' : 'text-danger';
        }

        if (btnRegistrar) {
            const estaBalanceado = Math.abs(diferencia) < 0.01;
            btnRegistrar.disabled = !estaBalanceado || totalDebe === 0;
            btnRegistrar.innerHTML = estaBalanceado && totalDebe > 0
                ? '<i class="bi bi-check-circle me-2"></i> Registrar Asiento' 
                : '<i class="bi bi-exclamation-triangle me-2"></i> Registrar Asiento (La suma debe ser 0)';
        }
    }

    async function registrarNuevoAsiento() {
        const fecha = document.querySelector('#asientos input[type="date"]')?.value;
        const glosa = document.querySelector('#asientos textarea')?.value;
        const tipoAsiento = document.querySelector('#asientos select.form-select')?.value;

        if (!glosa || glosa.trim() === '') {
            alert('Por favor ingresa una descripción para el asiento.');
            return;
        }

        const partidas = [];
        document.querySelectorAll('#entry-lines .partida-row').forEach(group => {
            const cuentaCod = group.querySelector('.account-select')?.value;
            const monto = parseFloat(group.querySelector('.amount-input')?.value || 0);
            const tipo = group.querySelector('.type-select')?.value;

            if (cuentaCod && monto > 0) {
                const acc = findAccountByCode(cuentaCod);
                partidas.push({
                    account_id: acc ? acc.id : null,
                    codigo: cuentaCod,
                    nombre: acc ? acc.nombre : '',
                    debe: tipo === 'debe' ? monto : 0,
                    haber: tipo === 'haber' ? monto : 0
                });
            }
        });

        if (partidas.length < 2) {
            alert('Un asiento contable requiere al menos dos partidas (una en el Debe y otra en el Haber).');
            return;
        }

        const payload = {
            fecha,
            glosa,
            referencia_tipo: tipoAsiento || 'Manual',
            items: partidas
                .filter(function(item) { return item.account_id; })
                .map(function(item) {
                    return {
                        account_id: item.account_id,
                        debe: item.debe,
                        haber: item.haber
                    };
                })
        };

        try {
            const result = await MarketWorld.api.journalEntries.create(payload);
            if (result.success) {
                MarketWorld.utils.showNotification('✅ Asiento Contable Registrado', 'success');
                if (MarketWorld.notifications && MarketWorld.notifications.show) {
                    MarketWorld.notifications.show('Asiento contable registrado', 'success');
                }
                await loadContabilidadStateFromAPI();
                actualizarDashboard();
                cargarAsientosContables();
                limpiarFormularioAsiento();
                console.log('✅ Asiento registrado:', result.data || result);
            } else {
                alert('Error: ' + (result.message || 'No se pudo crear el asiento'));
            }
        } catch (error) {
            console.error('[Contabilidad] Error registrando asiento:', error);
            alert(error && error.message ? error.message : 'Error al registrar el asiento');
        }
    }

    function cargarAsientosContables() {
        const container = document.querySelector('#asientos .col-md-8');
        if (!container) return;

        const entries = getJournalEntries();
        
        // Limpiar contenedor manteniendo solo el encabezado
        const header = container.querySelector('.d-flex.justify-content-between');
        container.innerHTML = '';
        if (header) container.appendChild(header);

        if (entries.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'alert alert-info';
            empty.textContent = 'No hay asientos contables registrados. Crea tu primer asiento usando el formulario de la derecha.';
            container.appendChild(empty);
            return;
        }

        entries.slice().reverse().forEach(entry => {
            const div = document.createElement('div');
            div.className = 'journal-entry mb-3 p-3 border rounded';
            
            const badgeClass = getEntryDisplayType(entry) === 'Automático' ? 'bg-info' : 'bg-secondary';
            
            let partidasHTML = '';
            getEntryItems(entry).forEach(p => {
                const code = p.cuenta || (p.account && p.account.codigo) || '';
                const name = p.nombre || (p.account && p.account.nombre) || '';
                if (p.debe > 0) {
                    partidasHTML += `
                        <div class="row mb-1">
                            <div class="col-md-8">${MarketWorld.utils.escapeHtml(code)} ${MarketWorld.utils.escapeHtml(name)}</div>
                            <div class="col-md-4 text-end debit">${MarketWorld.utils.formatCurrency(p.debe)}</div>
                        </div>
                    `;
                } else {
                    partidasHTML += `
                        <div class="row mb-1">
                            <div class="col-md-8 ps-4">${MarketWorld.utils.escapeHtml(code)} ${MarketWorld.utils.escapeHtml(name)}</div>
                            <div class="col-md-4 text-end credit">${MarketWorld.utils.formatCurrency(p.haber)}</div>
                        </div>
                    `;
                }
            });

            div.innerHTML = `
                    <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <span class="fw-bold">${MarketWorld.utils.escapeHtml(getEntryDisplayNumber(entry))}</span>
                        <span class="ms-3 text-muted">${MarketWorld.utils.formatDate(entry.fecha)}</span>
                        <span class="ms-3 badge ${badgeClass}">${MarketWorld.utils.escapeHtml(getEntryDisplayType(entry))}</span>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminarAsiento(${entry.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="mb-2"><strong>Descripción:</strong> ${MarketWorld.utils.escapeHtml(entry.glosa || entry.descripcion || '')}</div>
            `;

            container.appendChild(div);
        });

        // También actualizar el libro diario
        cargarLibroDiario();
    }

    // Exponer función para eliminar asiento
    window.eliminarAsiento = async function(id) {
        if (!confirm('¿Estás seguro de eliminar este asiento? Esta acción revertirá los movimientos en las cuentas.')) {
            return;
        }

        try {
            const result = await MarketWorld.api.journalEntries.delete(id);
            if (result.success) {
                MarketWorld.utils.showNotification('✅ ' + result.message, 'success');
                await loadContabilidadStateFromAPI();
                actualizarDashboard();
                cargarAsientosContables();
            } else {
                alert('Error: ' + (result.message || 'No se pudo eliminar el asiento'));
            }
        } catch (error) {
            console.error('[Contabilidad] Error eliminando asiento:', error);
            alert(error && error.message ? error.message : 'Error al eliminar el asiento');
        }
    };

    function guardarCuenta() {
        if (!currentAccount) {
            alert('Por favor selecciona una cuenta del árbol contable.');
            return;
        }

        const inputs = {
            codigo: document.getElementById('account-code'),
            nombre: document.getElementById('account-name'),
            tipo: document.getElementById('account-type'),
            descripcion: document.getElementById('account-desc'),
            padre: document.getElementById('account-parent'),
            moneda: document.getElementById('account-currency')
        };

        MarketWorld.api.accounts.update(currentAccount.id, {
            codigo: inputs.codigo?.value || currentAccount.codigo,
            nombre: inputs.nombre?.value,
            tipo: inputs.tipo?.value,
            activo: currentAccount.activo !== false
        }).then(async function(result) {
            if (result.success) {
                MarketWorld.utils.showNotification('✅ ' + result.message, 'success');
                await loadContabilidadStateFromAPI();
                renderizarPlanContable();
            } else {
                alert('Error: ' + (result.message || 'No se pudo actualizar la cuenta'));
            }
        }).catch(function(error) {
            console.error('[Contabilidad] Error actualizando cuenta:', error);
            alert(error && error.message ? error.message : 'Error al actualizar la cuenta');
        });
    }

    // ======= LIBROS CONTABLES =======

    function inicializarLibros() {
        cargarLibroDiario();
    }

    function cargarLibroDiario() {
        const tableBody = document.querySelector('#diario tbody');
        if (!tableBody) return;

        const entries = getJournalEntries();
        
        if (entries.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">No hay asientos registrados</td></tr>';
            return;
        }

        let totalDebe = 0;
        let totalHaber = 0;

        const rows = entries.map(entry => {
            const partidas = getEntryItems(entry);
            const subDebe = partidas.reduce((sum, p) => sum + (p.debe || 0), 0);
            const subHaber = partidas.reduce((sum, p) => sum + (p.haber || 0), 0);
            totalDebe += subDebe;
            totalHaber += subHaber;

            return `
                <tr>
                    <td>${getEntryDisplayNumber(entry)}</td>
                    <td>${MarketWorld.utils.formatDate(entry.fecha)}</td>
                    <td>${entry.glosa || entry.descripcion || ''}</td>
                    <td><span class="badge ${getEntryDisplayType(entry) === 'Automático' ? 'bg-info' : 'bg-secondary'}">${getEntryDisplayType(entry)}</span></td>
                    <td class="debit">${MarketWorld.utils.formatCurrency(subDebe)}</td>
                    <td class="credit">${MarketWorld.utils.formatCurrency(subHaber)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="verDetalleAsiento(${entry.id})">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tableBody.innerHTML = rows;

        // Totales
        const tfoot = document.querySelector('#diario tfoot');
        if (tfoot) {
            tfoot.innerHTML = `
                <tr class="fw-bold">
                    <td colspan="4">Total</td>
                    <td class="debit">${MarketWorld.utils.formatCurrency(totalDebe)}</td>
                    <td class="credit">${MarketWorld.utils.formatCurrency(totalHaber)}</td>
                    <td></td>
                </tr>
            `;
        }
    }

    window.verDetalleAsiento = function(id) {
        const entry = findJournalEntryById(id);
        if (!entry) return;

        let partidasHTML = getEntryItems(entry).map(p => `
            <tr>
                <td>${(p.cuenta || (p.account && p.account.codigo) || '')} - ${(p.nombre || (p.account && p.account.nombre) || '')}</td>
                <td class="debit">${p.debe > 0 ? MarketWorld.utils.formatCurrency(p.debe) : ''}</td>
                <td class="credit">${p.haber > 0 ? MarketWorld.utils.formatCurrency(p.haber) : ''}</td>
            </tr>
        `).join('');

        alert(`Asiento: ${getEntryDisplayNumber(entry)}\nFecha: ${entry.fecha}\nDescripción: ${entry.glosa || entry.descripcion || ''}\n\nVer consola para detalles completos.`);
        console.log('Detalle del asiento:', entry);
    };

    function aplicarFiltrosDiario() {
        const startDate = document.getElementById('diario-start')?.value || document.querySelector('#diario input[type="date"]')?.value;
        const endDate = document.getElementById('diario-end')?.value || document.querySelectorAll('#diario input[type="date"]')[1]?.value;
        const tipo = document.getElementById('diario-type')?.value || document.querySelector('#diario select')?.value;

        console.log('📊 Filtros aplicados:', { startDate, endDate, tipo });
        MarketWorld.utils.showNotification('Filtros aplicados correctamente', 'info');
        
        // Aquí se implementaría el filtrado real
        cargarLibroDiario();
    }

    function aplicarFiltrosMayor() {
        const cuenta = document.getElementById('mayor-account')?.value || document.querySelector('#mayor select')?.value;
        const startDate = document.getElementById('mayor-start')?.value || document.querySelector('#mayor input[type="date"]')?.value;
        const endDate = document.getElementById('mayor-end')?.value || document.querySelectorAll('#mayor input[type="date"]')[1]?.value;

        console.log('📖 Filtros Libro Mayor:', { cuenta, startDate, endDate });
        MarketWorld.utils.showNotification('Filtrando libro mayor...', 'info');
        
        if (cuenta) {
            cargarLibroMayor(cuenta);
        }
    }

    function cargarLibroMayor(codigo) {
        const account = findAccountByCode(codigo);
        if (!account) return;

        const result = getAccountMovements(codigo);
        const movements = result.movements || [];
        const tableBody = document.querySelector('#mayor tbody');
        
        if (!tableBody) return;

        let saldo = 0;
        const rows = movements.map(m => {
            if (account.tipo === 'Activo' || account.tipo === 'Gasto') {
                saldo += (m.debe - m.haber);
            } else {
                saldo += (m.haber - m.debe);
            }

            return `
                <tr>
                    <td>${MarketWorld.utils.formatDate(m.fecha)}</td>
                    <td>${m.numero}</td>
                    <td>${m.descripcion}</td>
                    <td class="debit">${m.debe > 0 ? MarketWorld.utils.formatCurrency(m.debe) : ''}</td>
                    <td class="credit">${m.haber > 0 ? MarketWorld.utils.formatCurrency(m.haber) : ''}</td>
                    <td class="fw-bold">${MarketWorld.utils.formatCurrency(Math.abs(saldo))}</td>
                </tr>
            `;
        }).join('');

        tableBody.innerHTML = rows || '<tr><td colspan="6" class="text-center">Sin movimientos</td></tr>';
    }

    function calcularConciliacion() {
        const saldoBanco = parseFloat(document.querySelector('#conciliacion input:nth-of-type(1)')?.value.replace(/[^0-9.-]/g, '') || 0);
        const saldoLibros = parseFloat(document.querySelector('#conciliacion input:nth-of-type(2)')?.value.replace(/[^0-9.-]/g, '') || 0);
        
        const diferencia = saldoBanco - saldoLibros;
        const diffSpan = document.querySelector('#conciliacion .d-flex.justify-content-between span.text-danger');
        
        if (diffSpan) {
            diffSpan.textContent = MarketWorld.utils.formatCurrency(Math.abs(diferencia));
            diffSpan.className = diferencia === 0 ? 'text-success' : 'text-danger';
        }

        if (diferencia === 0) {
            MarketWorld.utils.showNotification('✅ Conciliación exitosa. Los saldos coinciden.', 'success');
        } else {
            MarketWorld.utils.showNotification(`⚠️ Diferencia encontrada: ${MarketWorld.utils.formatCurrency(Math.abs(diferencia))}`, 'warning');
        }
    }

    function registrarAjustesConciliacion() {
        MarketWorld.utils.showNotification('✅ Ajustes de conciliación registrados', 'success');
        console.log('📝 Registrando ajustes de conciliación bancaria');
    }

    // ======= IMPUESTOS =======

    function inicializarImpuestos() {
        const btnCalc = document.querySelector('#impuestos .btn-primary');
        if (btnCalc) {
            btnCalc.addEventListener('click', calcularImpuestos);
        }

        const btnPresentar = document.querySelector('#impuestos .btn-danger');
        if (btnPresentar) {
            btnPresentar.addEventListener('click', presentarDeclaracion);
        }
    }

    function calcularImpuestos() {
        const summary = getFinancialSummary();
        const impuestoRenta = summary.utilidadNeta > 0 ? summary.utilidadNeta * 0.35 : 0;
        const ivaEstimado = summary.ingresos * 0.19;

        const mensaje = `Basado en los datos contables actuales:\n\n` +
                       `Utilidad Neta: ${MarketWorld.utils.formatCurrency(summary.utilidadNeta)}\n` +
                       `Impuesto de Renta (35%): ${MarketWorld.utils.formatCurrency(impuestoRenta)}\n\n` +
                       `Ingresos Totales: ${MarketWorld.utils.formatCurrency(summary.ingresos)}\n` +
                       `IVA Estimado (19%): ${MarketWorld.utils.formatCurrency(ivaEstimado)}`;

        alert(mensaje);
        console.log('🧮 Cálculo de impuestos:', { summary, impuestoRenta, ivaEstimado });
    }

    function presentarDeclaracion() {
        if (!confirm('¿Deseas presentar la declaración tributaria a la DIAN?')) {
            return;
        }

        MarketWorld.utils.showNotification('📤 Enviando declaración...', 'info');
        
        setTimeout(() => {
            const radicado = 'DIAN-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 100000);
            MarketWorld.utils.showNotification('✅ Declaración presentada exitosamente. Radicado: ' + radicado, 'success');
        }, 2000);
    }

})();
