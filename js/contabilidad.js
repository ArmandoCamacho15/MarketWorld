
(function() {
    'use strict';

    let currentAccount = null;
    let journalEntries = [];

    document.addEventListener('DOMContentLoaded', () => {
        console.log('💰 Módulo Contabilidad cargado');
        
        initAccountTree();
        initJournalEntries();
        initLedgers();
        initFinancialStatements();
        initTaxManagement();
        initCharts();
    });

    // Árbol de cuentas contables
    function initAccountTree() {
        const accountItems = document.querySelectorAll('.account-tree li');
        
        accountItems.forEach(item => {
            item.style.cursor = 'pointer';
            
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const accountCode = item.querySelector('.account-code')?.textContent;
                if (accountCode) {
                    selectAccount(accountCode, item);
                }
            });
        });
    }

    function selectAccount(accountCode, item) {
        currentAccount = accountCode;
        console.log(`📖 Cuenta seleccionada: ${accountCode}`);
        
        // Resaltar cuenta
        document.querySelectorAll('.account-tree li').forEach(li => {
            li.style.backgroundColor = '';
        });
        item.style.backgroundColor = '#f0f6ff';
        
        // Cargar movimientos
        loadAccountMovements(accountCode);
    }

    function loadAccountMovements(accountCode) {
        console.log(`📊 Cargando movimientos de cuenta: ${accountCode}`);
        // Aquí se cargarían los movimientos desde el backend
    }

    // Asientos contables
    function initJournalEntries() {
        const btnNewEntry = document.querySelector('.btn-primary');
        
        if (btnNewEntry && btnNewEntry.textContent.includes('Nuevo Asiento')) {
            btnNewEntry.addEventListener('click', createJournalEntry);
        }
        
        // Botones de editar/eliminar asientos
        const editButtons = document.querySelectorAll('.btn-outline-primary');
        editButtons.forEach(btn => {
            if (btn.querySelector('.bi-pencil')) {
                btn.addEventListener('click', () => {
                    const entryNumber = btn.closest('.journal-entry').querySelector('.fw-bold').textContent;
                    editJournalEntry(entryNumber);
                });
            }
        });
        
        const deleteButtons = document.querySelectorAll('.btn-outline-danger');
        deleteButtons.forEach(btn => {
            if (btn.querySelector('.bi-trash')) {
                btn.addEventListener('click', () => {
                    const entryNumber = btn.closest('.journal-entry').querySelector('.fw-bold').textContent;
                    deleteJournalEntry(entryNumber);
                });
            }
        });
    }

    function createJournalEntry() {
        console.log('📝 Creando nuevo asiento contable');
        
        const description = prompt('Descripción del asiento:');
        if (description) {
            const entryNumber = `AS-2025-${String(Math.floor(Math.random() * 1000)).padStart(5, '0')}`;
            journalEntries.push({ number: entryNumber, description });
            
            console.log(`✅ Asiento creado: ${entryNumber}`);
            alert(`Asiento ${entryNumber} creado correctamente`);
        }
    }

    function editJournalEntry(entryNumber) {
        console.log(`✏️ Editando asiento: ${entryNumber}`);
        alert(`Editando asiento: ${entryNumber}`);
    }

    function deleteJournalEntry(entryNumber) {
        if (confirm(`¿Eliminar asiento ${entryNumber}?`)) {
            console.log(`🗑️ Eliminando asiento: ${entryNumber}`);
            alert(`Asiento ${entryNumber} eliminado`);
        }
    }

    // Libros contables
    function initLedgers() {
        const btnFilter = document.querySelectorAll('.btn-primary').forEach(btn => {
            if (btn.textContent.includes('Filtrar')) {
                btn.addEventListener('click', applyLedgerFilters);
            }
        });
    }

    function applyLedgerFilters() {
        console.log(' Aplicando filtros en libros contables');
        
        const startDate = document.querySelector('input[type="date"]')?.value;
        const endDate = document.querySelectorAll('input[type="date"]')[1]?.value;
        
        console.log(`📅 Período: ${startDate} a ${endDate}`);
        alert(`Filtrando registros del ${startDate} al ${endDate}`);
    }

    // Estados financieros
    function initFinancialStatements() {
        console.log('📈 Inicializando estados financieros');
        // Los gráficos se inicializan en initCharts()
    }

    // Gestión de impuestos
    function initTaxManagement() {
        const btnCalculate = document.querySelectorAll('.btn-primary').forEach(btn => {
            if (btn.textContent.includes('Calcular')) {
                btn.addEventListener('click', calculateTaxes);
            }
        });
        
        const btnSubmit = document.querySelectorAll('.btn-danger').forEach(btn => {
            if (btn.textContent.includes('Presentar')) {
                btn.addEventListener('click', submitTaxDeclaration);
            }
        });
    }

    function calculateTaxes() {
        console.log('🧮 Calculando impuestos');
        
        const profit = 37650000;
        const taxRate = 0.20;
        const calculatedTax = profit * taxRate;
        
        console.log(`💵 Impuesto calculado: $${calculatedTax.toLocaleString()}`);
        alert(`Impuesto sobre la renta: $${calculatedTax.toLocaleString()}\n\nIVA a pagar: $5,500,000\nRetención a favor: $1,100,000`);
    }

    function submitTaxDeclaration() {
        if (confirm('¿Deseas presentar la declaración a la DIAN?')) {
            console.log('📤 Enviando declaración a la DIAN...');
            
            // envío
            setTimeout(() => {
                alert('✅ Declaración presentada exitosamente\n\nNúmero de radicado: DIAN-2025-12345');
            }, 1500);
        }
    }

    // Gráficos de estados financieros
    function initCharts() {
        // Balance General
        const balanceCtx = document.getElementById('balanceChart');
        if (balanceCtx && typeof Chart !== 'undefined') {
            new Chart(balanceCtx, {
                type: 'bar',
                data: {
                    labels: ['Activos', 'Pasivos', 'Patrimonio'],
                    datasets: [{
                        label: 'Balance General',
                        data: [185450000, 72800000, 112650000],
                        backgroundColor: ['#2ecc71', '#e74c3c', '#f39c12']
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
                                callback: (value) => `$${(value / 1000000).toFixed(1)}M`
                            }
                        }
                    }
                }
            });
        }

        // Estado de Resultados
        const incomeCtx = document.getElementById('incomeChart');
        if (incomeCtx && typeof Chart !== 'undefined') {
            new Chart(incomeCtx, {
                type: 'pie',
                data: {
                    labels: ['Ventas', 'Costo Ventas', 'Gastos', 'Utilidad'],
                    datasets: [{
                        data: [125450000, 72800000, 15000000, 37650000],
                        backgroundColor: ['#9b59b6', '#e74c3c', '#3498db', '#2ecc71']
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

        console.log(' Gráficos contables inicializados');
    }


    // Base de datos simulada
    let asientosContables = [
        {
            id: 1,
            numero: 'AS-2025-00128',
            fecha: '2025-06-20',
            descripcion: 'Registro de venta - FAC-2025-00128',
            tipo: 'Automático',
            partidas: [
                { cuenta: '1.1.1.01 Caja General', debe: 1513480, haber: 0 },
                { cuenta: '4.1.01 Ventas de Productos', debe: 0, haber: 1275980 },
                { cuenta: '2.3.01 IVA por Pagar', debe: 0, haber: 237500 }
            ],
            estado: 'Registrado'
        }
    ];

    let nextAsientoId = 129;

    document.addEventListener('DOMContentLoaded', function() {
        console.log(' Sistema contable iniciado');
        
        cargarAsientosContables();
        
        // ===========================
        // AGREGAR NUEVO ASIENTO
        // ===========================
        const btnNuevoAsiento = document.querySelector('button[data-bs-toggle="modal"]');
        if (btnNuevoAsiento) {
            btnNuevoAsiento.addEventListener('click', function() {
                console.log('📝 Modal asiento contable');
            });
        }
        
        // ===========================
        // BOTÓN FILTRAR LIBRO DIARIO
        // ===========================
        const btnFiltrarDiario = document.querySelector('#diario .btn-primary');
        if (btnFiltrarDiario) {
            btnFiltrarDiario.addEventListener('click', function() {
                console.log(' Filtrando libro diario');
                mostrarNotificacion('Filtros aplicados al libro diario', 'info');
            });
        }
        
        // ===========================
        // BOTÓN FILTRAR LIBRO MAYOR
        // ===========================
        const btnFiltrarMayor = document.querySelector('#mayor .btn-primary');
        if (btnFiltrarMayor) {
            btnFiltrarMayor.addEventListener('click', function() {
                console.log(' Filtrando libro mayor');
                mostrarNotificacion('Filtros aplicados al libro mayor', 'info');
            });
        }
        
        // ===========================
        // BOTÓN REALIZAR CONCILIACIÓN
        // ===========================
        const btnConciliar = document.querySelector('#conciliacion .btn-primary');
        if (btnConciliar) {
            btnConciliar.addEventListener('click', function() {
                console.log('💰 Realizando conciliación bancaria');
                
                const saldoLibro = parseFloat(document.querySelector('#conciliacion input:nth-of-type(1)')?.value || 0);
                const saldoBanco = parseFloat(document.querySelector('#conciliacion input:nth-of-type(2)')?.value || 0);
                const diferencia = Math.abs(saldoLibro - saldoBanco);
                
                if (diferencia === 0) {
                    mostrarNotificacion('✅ Conciliación exitosa. Los saldos coinciden.', 'success');
                } else {
                    mostrarNotificacion(`⚠️ Diferencia encontrada: $${diferencia.toLocaleString('es-CO')}`, 'warning');
                }
            });
        }
        
        // ===========================
        // BOTÓN REGISTRAR AJUSTE
        // ===========================
        const btnRegistrarAjuste = document.querySelector('#conciliacion .d-grid button');
        if (btnRegistrarAjuste) {
            btnRegistrarAjuste.addEventListener('click', function() {
                console.log('📝 Registrando ajuste de conciliación');
                mostrarNotificacion('✅ Ajuste registrado correctamente', 'success');
            });
        }
        
        // ===========================
        // INICIALIZAR GRÁFICOS DE ESTADOS FINANCIEROS
        // ===========================
        inicializarGraficosContables();
    });

    function cargarAsientosContables() {
        console.log(' Asientos contables cargados:', asientosContables.length);
    }

    function agregarAsiento(datosAsiento) {
        const nuevoAsiento = {
            id: nextAsientoId++,
            numero: `AS-2025-${String(nextAsientoId).padStart(5, '0')}`,
            ...datosAsiento,
            estado: 'Registrado'
        };
        
        asientosContables.push(nuevoAsiento);
        cargarAsientosContables();
        mostrarNotificacion('✅ Asiento contable registrado', 'success');
        console.log('➕ Asiento agregado:', nuevoAsiento);
    }

    function inicializarGraficosContables() {
        // Gráfico Balance General
        const ctxBalance = document.getElementById('balanceChart');
        if (ctxBalance) {
            new Chart(ctxBalance, {
                type: 'bar',
                data: {
                    labels: ['Activos', 'Pasivos', 'Patrimonio'],
                    datasets: [{
                        label: 'Balance General',
                        data: [185450000, 72800000, 112650000],
                        backgroundColor: ['#2ecc71', '#e74c3c', '#f39c12']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + (value / 1000000) + 'M';
                            }
                        }
                    }
                }
            });
            console.log(' Gráfico Balance inicializado');
        }
        
        // Gráfico Estado de Resultados
        const ctxIncome = document.getElementById('incomeChart');
        if (ctxIncome) {
            new Chart(ctxIncome, {
                type: 'line',
                data: {
                    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                    datasets: [
                        {
                            label: 'Ingresos',
                            data: [95000, 102000, 98000, 105000, 110000, 125450],
                            borderColor: '#2ecc71',
                            backgroundColor: 'rgba(46, 204, 113, 0.1)',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Gastos',
                            data: [45000, 48000, 52000, 50000, 58000, 72800],
                            borderColor: '#e74c3c',
                            backgroundColor: 'rgba(231, 76, 60, 0.1)',
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + (value / 1000) + 'K';
                            }
                        }
                    }
                }
            });
            console.log(' Gráfico Estado de Resultados inicializado');
        }
    }

    function mostrarNotificacion(mensaje, tipo = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 150);
        }, 3000);
    }

})();
