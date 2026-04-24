
(function() {
    'use strict';

    let selectedClient = null;
    let selectedOpportunity = null;
    const crmCustomerListState = {
        page: 1,
        perPage: 9,
        lastPage: 1,
        total: 0,
        search: '',
        segmento: '',
        estado: '',
    };

    document.addEventListener('DOMContentLoaded', () => {
        console.log(' Módulo CRM cargado');
                // --- Inicializar notificaciones ---
        if (MarketWorld.notifications && MarketWorld.notifications.init) {
            MarketWorld.notifications.init();
        }
        // --- Cargar clientes desde el backend ---
        loadCustomersFromAPI();
                initClientCards();
        initClientFilters();
        initCrmPaginationEvents();
        initOpportunityManagement();
        initSegmentation();
        initCampaigns();
        initClientSearch();
    });

    function normalizeApiListResponse(response, fallbackMeta) {
        if (typeof MarketWorld !== 'undefined' &&
            MarketWorld.api &&
            typeof MarketWorld.api.normalizeListResponse === 'function') {
            return MarketWorld.api.normalizeListResponse(response, fallbackMeta);
        }

        const items = response && Array.isArray(response.data) ? response.data : [];
        return {
            items: items,
            meta: Object.assign({
                total: items.length,
                per_page: (fallbackMeta && fallbackMeta.per_page) || 9,
                current_page: (fallbackMeta && fallbackMeta.current_page) || 1,
                last_page: 1,
            }, (response && response.meta) || {}),
            success: !response || response.success !== false,
        };
    }

    function getClientsContainer() {
        let container = document.getElementById('clientsList');
        if (container) return container;

        const existingCard = document.querySelector('#clientes .client-card');
        if (existingCard) {
            container = existingCard.closest('.row');
        }

        if (!container) {
            container = document.querySelector('#clientes .row');
        }

        return container;
    }

    function ensureCrmPaginationContainer() {
        const clientsContainer = getClientsContainer();
        if (!clientsContainer || !clientsContainer.parentNode) return null;

        let pagination = document.getElementById('crmCustomersPagination');
        if (pagination) return pagination;

        pagination = document.createElement('nav');
        pagination.id = 'crmCustomersPagination';
        pagination.className = 'mt-3 d-flex justify-content-center';
        pagination.setAttribute('aria-label', 'Paginación de clientes CRM');
        clientsContainer.parentNode.appendChild(pagination);

        return pagination;
    }

    function renderCrmPagination() {
        const pagination = ensureCrmPaginationContainer();
        if (!pagination) return;

        const current = crmCustomerListState.page;
        const last = Math.max(1, crmCustomerListState.lastPage);

        if (last <= 1) {
            pagination.innerHTML = '';
            return;
        }

        const startPage = Math.max(1, current - 2);
        const endPage = Math.min(last, current + 2);
        const items = [];

        items.push('<li class="page-item' + (current <= 1 ? ' disabled' : '') + '"><a class="page-link" href="#" data-crm-page="prev">Anterior</a></li>');

        for (let i = startPage; i <= endPage; i++) {
            items.push('<li class="page-item' + (i === current ? ' active' : '') + '"><a class="page-link" href="#" data-crm-page="' + i + '">' + i + '</a></li>');
        }

        items.push('<li class="page-item' + (current >= last ? ' disabled' : '') + '"><a class="page-link" href="#" data-crm-page="next">Siguiente</a></li>');
        pagination.innerHTML = '<ul class="pagination mb-0">' + items.join('') + '</ul>';
    }

    function initCrmPaginationEvents() {
        const pagination = ensureCrmPaginationContainer();
        if (!pagination) return;

        pagination.addEventListener('click', function(event) {
            const link = event.target.closest('[data-crm-page]');
            if (!link) return;

            event.preventDefault();
            const target = link.getAttribute('data-crm-page');
            let nextPage = crmCustomerListState.page;

            if (target === 'prev') {
                nextPage = Math.max(1, crmCustomerListState.page - 1);
            } else if (target === 'next') {
                nextPage = Math.min(crmCustomerListState.lastPage, crmCustomerListState.page + 1);
            } else {
                const page = parseInt(target, 10);
                if (!isNaN(page)) {
                    nextPage = page;
                }
            }

            if (nextPage !== crmCustomerListState.page) {
                crmCustomerListState.page = nextPage;
                loadCustomersFromAPI();
            }
        });
    }

    // --- Carga de clientes desde API Laravel ---
    async function loadCustomersFromAPI() {
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.customers) {
                console.warn('[CRM] API de clientes no disponible.');
                return;
            }

            const requestParams = {
                page: crmCustomerListState.page,
                per_page: crmCustomerListState.perPage,
            };

            if (crmCustomerListState.search) {
                requestParams.search = crmCustomerListState.search;
            }
            if (crmCustomerListState.segmento) {
                requestParams.segmento = crmCustomerListState.segmento;
            }
            if (crmCustomerListState.estado) {
                requestParams.estado = crmCustomerListState.estado;
            }

            const response = await MarketWorld.api.customers.getAll(requestParams);
            const parsed = normalizeApiListResponse(response, {
                current_page: crmCustomerListState.page,
                per_page: crmCustomerListState.perPage,
            });

            if (!parsed.success) {
                console.error('[CRM] Error al cargar clientes:', response && response.message ? response.message : 'respuesta inválida');
                return;
            }

            crmCustomerListState.page = parsed.meta.current_page;
            crmCustomerListState.perPage = parsed.meta.per_page;
            crmCustomerListState.lastPage = parsed.meta.last_page;
            crmCustomerListState.total = parsed.meta.total;

            console.log('[API] Clientes cargados desde MySQL:', parsed.meta.total);

            const container = getClientsContainer();
            
            if (!container) {
                console.warn('[CRM] No se encontró el contenedor de clientes en el DOM.');
                return;
            }

            container.innerHTML = '';

            if (!parsed.items || parsed.items.length === 0) {
                container.innerHTML = '<div class="col-12"><div class="alert alert-info">No hay clientes para mostrar con los filtros actuales.</div></div>';
                renderCrmPagination();
                return;
            }

            parsed.items.forEach(cliente => {

                const segmentoBadge = {
                    'Premium': 'bg-warning',
                    'Frecuente': 'bg-success',
                    'Corporativo': 'bg-primary',
                    'Nuevo': 'bg-secondary',
                }[cliente.segmento] || 'bg-secondary';

                const col = document.createElement('div');
                col.className = 'col-md-4 mb-3';
                col.innerHTML = `
                    <div class="card client-card h-100" data-client-id="${cliente.id}" style="border-left: 4px solid #9b59b6;">
                        <div class="card-body">
                            <div class="d-flex justify-content-between mb-2">
                                <span class="badge ${segmentoBadge}">${cliente.segmento || 'General'}</span>
                                <small class="text-muted">${cliente.tipo_documento || 'ID'}: ${cliente.documento || '---'}</small>
                            </div>
                            <h5 class="card-title">${cliente.nombre}</h5>
                            <p class="text-muted small mb-1"><i class="bi bi-envelope me-1"></i>${cliente.email || 'Sin email'}</p>
                            <p class="text-muted small mb-2"><i class="bi bi-telephone me-1"></i>${cliente.telefono || 'Sin teléfono'}</p>
                            <p class="text-muted small mb-2"><i class="bi bi-geo-alt me-1"></i>${cliente.ciudad || 'Sin ciudad'}</p>
                            <div class="d-flex gap-2 mt-3">
                                <button class="btn btn-sm btn-outline-primary flex-fill btn-view-details">Ver detalles</button>
                                <button class="btn btn-sm btn-outline-success flex-fill btn-contact-client">Contactar</button>
                            </div>
                        </div>
                    </div>`;
                container.appendChild(col);
            });

            // Re-inicializar eventos en todas las tarjetas (viejas y nuevas)
            initClientCards();
            renderCrmPagination();

        } catch (error) {
            console.error('[API] Error de conexión en CRM:', error);
        }
    }

    // --- Tarjetas de clientes ---
    function initClientCards() {
        const clientCards = document.querySelectorAll('.client-card');
        
        clientCards.forEach(card => {
            card.style.cursor = 'pointer';
            
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button') && !e.target.closest('a')) {
                    const clientName = card.querySelector('h5').textContent;
                    selectClient(clientName, card);
                }
            });
            
            // --- Botones de acción ---
            const btnView = card.querySelector('.btn-outline-primary');
            const btnContact = card.querySelector('.btn-outline-success');
            
            if (btnView) {
                btnView.addEventListener('click', (e) => {
                    e.stopPropagation();
                    viewClientDetails(card);
                });
            }
            
            if (btnContact) {
                btnContact.addEventListener('click', (e) => {
                    e.stopPropagation();
                    contactClient(card);
                });
            }
        });
    }

    function selectClient(clientName, card) {
        selectedClient = clientName;
        console.log(`👤 Cliente seleccionado: ${clientName}`);
        
        // --- Remover selección anterior ---
        document.querySelectorAll('.client-card').forEach(c => {
            c.style.borderLeft = '4px solid #9b59b6';
        });
        
        // ======= MARCAR COMO SELECCIONADO =======
        card.style.borderLeft = '4px solid #0d6ef0';
        
        // ======= MOSTRAR FICHA COMPLETA =======
        showClientSheet(clientName);
    }

    function viewClientDetails(card) {
        const clientName = card.querySelector('h5').textContent;
        console.log(`👁️ Ver detalles de: ${clientName}`);
        
        // ======= CREAR MODAL DE DETALLES =======
        const modal = document.createElement('div');
        modal.className = 'modal fade show';
        modal.style.display = 'block';
        modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modal.innerHTML = `
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Detalles de ${clientName}</h5>
                        <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6>Información Personal</h6>
                                <p><strong>Email:</strong> ${card.querySelector('[class*="bi-envelope"]').parentElement.textContent.trim()}</p>
                                <p><strong>Teléfono:</strong> ${card.querySelector('[class*="bi-telephone"]').parentElement.textContent.trim()}</p>
                                <p><strong>Ciudad:</strong> ${card.querySelector('[class*="bi-geo-alt"]').parentElement.textContent.trim()}</p>
                            </div>
                            <div class="col-md-6">
                                <h6>Estadísticas</h6>
                                <p><strong>Total Compras:</strong> $15,250</p>
                                <p><strong>Última Compra:</strong> 15/06/2025</p>
                                <p><strong>Compras Realizadas:</strong> 12</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cerrar</button>
                        <button class="btn btn-primary">Editar Cliente</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    function contactClient(card) {
        const clientName = card.querySelector('h5').textContent;
        const email = card.querySelector('[class*="bi-envelope"]').parentElement.textContent.trim();
        
        console.log(`📧 Contactar a: ${clientName} (${email})`);
        
        const action = confirm(`¿Deseas enviar un email a ${clientName}?`);
        if (action) {
            alert(`✅ Email enviado a ${email}`);
        }
    }

    function showClientSheet(clientName) {
        console.log(`📄 Mostrando ficha completa de: ${clientName}`);
        // ======= CARGAR DATOS COMPLETOS DEL CLIENTE =======
    }

    // ======= FILTROS DE CLIENTES =======
    function initClientFilters() {
        const btnFilter = document.querySelector('.btn-primary');
        
        if (btnFilter && btnFilter.textContent.includes('Filtrar')) {
            btnFilter.addEventListener('click', applyClientFilters);
        }
    }

    function applyClientFilters() {
        const selects = document.querySelectorAll('#clientes .filter-bar select');
        const segmento = (selects[2] && selects[2].value) ? selects[2].value : 'Todos';

        crmCustomerListState.page = 1;
        crmCustomerListState.estado = '';
        crmCustomerListState.segmento = '';

        if (segmento && segmento !== 'Todos') {
            if (segmento === 'Inactivo') {
                crmCustomerListState.estado = 'Inactivo';
            } else {
                crmCustomerListState.segmento = segmento;
            }
        }

        loadCustomersFromAPI();
    }

    // ======= GESTIÓN DE OPORTUNIDADES =======
    function initOpportunityManagement() {
        const opportunityRows = document.querySelectorAll('.data-table tbody tr');
        
        opportunityRows.forEach(row => {
            row.style.cursor = 'pointer';
            
            row.addEventListener('click', () => {
                const oppName = row.cells[0].textContent;
                selectOpportunity(oppName, row);
            });
        });
        
        // ======= BOTONES DEL EMBUDO =======
        const funnelSteps = document.querySelectorAll('.funnel-step');
        funnelSteps.forEach(step => {
            step.style.cursor = 'pointer';
            step.addEventListener('click', () => {
                const stage = step.querySelector('.kpi-title').textContent;
                console.log(`🔄 Etapa seleccionada: ${stage}`);
                filterOpportunitiesByStage(stage);
            });
        });
    }

    function selectOpportunity(oppName, row) {
        selectedOpportunity = oppName;
        console.log(`💼 Oportunidad seleccionada: ${oppName}`);
        
        // ======= RESALTAR FILA =======
        document.querySelectorAll('.data-table tbody tr').forEach(r => {
            r.style.backgroundColor = '';
        });
        row.style.backgroundColor = '#f0f6ff';
        
        // ======= MOSTRAR SEGUIMIENTO =======
        showOpportunityTracking(oppName);
    }

    function showOpportunityTracking(oppName) {
        console.log(`📈 Mostrando seguimiento de: ${oppName}`);
        // ======= MOSTRAR SEGUIMIENTO DETALLADO =======
    }

    function filterOpportunitiesByStage(stage) {
        console.log(`🎯 Filtrando oportunidades en etapa: ${stage}`);
        alert(`Mostrando oportunidades en etapa: ${stage}`);
    }

    // ======= SEGMENTACIÓN DE CLIENTES =======
    function initSegmentation() {
        const btnNewSegment = document.querySelector('.btn-primary');
        
        if (btnNewSegment && btnNewSegment.textContent.includes('Nuevo Segmento')) {
            btnNewSegment.addEventListener('click', createNewSegment);
        }
        
        // ======= BOTONES EDITAR/ELIMINAR SEGMENTOS =======
        const editButtons = document.querySelectorAll('.btn-outline-warning');
        editButtons.forEach(btn => {
            if (btn.textContent.includes('Editar')) {
                btn.addEventListener('click', () => {
                    const segmentName = btn.closest('.card').querySelector('h5').textContent;
                    editSegment(segmentName);
                });
            }
        });
    }

    function createNewSegment() {
        console.log('➕ Creando nuevo segmento');
        
        const segmentName = prompt('Nombre del nuevo segmento:');
        if (segmentName) {
            console.log(`✅ Segmento creado: ${segmentName}`);
            alert(`Segmento "${segmentName}" creado correctamente`);
        }
    }

    function editSegment(segmentName) {
        console.log(`✏️ Editando segmento: ${segmentName}`);
        alert(`Editando segmento: ${segmentName}`);
    }

    // ======= CAMPAÑAS DE MARKETING =======
    function initCampaigns() {
        const btnNewCampaign = document.querySelector('.btn-primary');
        
        if (btnNewCampaign && btnNewCampaign.textContent.includes('Nueva Campaña')) {
            btnNewCampaign.addEventListener('click', createCampaign);
        }
        
        // ======= CHECKBOXES DE CANALES =======
        const channelCheckboxes = document.querySelectorAll('input[type="checkbox"]');
        channelCheckboxes.forEach(cb => {
            cb.addEventListener('change', (e) => {
                console.log(`📢 Canal ${e.target.checked ? 'seleccionado' : 'deseleccionado'}: ${e.target.nextElementSibling.textContent}`);
            });
        });
    }

    function createCampaign() {
        console.log('📣 Creando nueva campaña');
        
        const campaignName = prompt('Nombre de la campaña:');
        if (campaignName) {
            console.log(`✅ Campaña creada: ${campaignName}`);
            alert(`Campaña "${campaignName}" creada y programada`);
        }
    }

    // ======= BÚSQUEDA DE CLIENTES =======
    function initClientSearch() {
        const searchInput = document.querySelector('.search-bar input');
        
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                const query = e.target.value.trim();
                if (query.length > 2 || query.length === 0) {
                    searchClients(query);
                }
            }, 300));
        }
    }

    function searchClients(query) {
        crmCustomerListState.search = query || '';
        crmCustomerListState.page = 1;
        loadCustomersFromAPI();
    }

    // Utilidad: debounce
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

})();



let clientes = [
    {
        id: 1,
        nombre: 'Juan Pérez García',
        documento: 'CC 1234567890',
        email: 'juan.perez@email.com',
        telefono: '(601) 234 5678',
        ciudad: 'Bogotá',
        tipo: 'Persona Natural',
        segmento: 'Premium',
        estado: 'Activo'
    }
];

let nextClientId = 2;

document.addEventListener('DOMContentLoaded', function() {
    console.log(' Sistema CRM iniciado');
    
    const btnNuevoCliente = document.querySelector('.btn-primary');
    
    if (btnNuevoCliente) {
        btnNuevoCliente.addEventListener('click', function() {
            console.log('➕ Botón Nuevo Cliente clickeado');
            alert('Funcionalidad de agregar cliente en desarrollo');
        });
    }
});

function agregarCliente(datosCliente) {
    const nuevoCliente = {
        id: nextClientId++,
        ...datosCliente,
        estado: 'Activo'
    };
    
    clientes.push(nuevoCliente);
    console.log(' Cliente agregado:', nuevoCliente);
}

function editarCliente(id) {
    const cliente = clientes.find(c => c.id === id);
    if (cliente) {
        console.log('✏️ Editando cliente:', cliente);
    }
}

function eliminarCliente(id) {
    if (confirm('¿Eliminar cliente?')) {
        clientes = clientes.filter(c => c.id !== id);
        console.log('🗑️ Cliente eliminado:', id);
    }
}

window.editarCliente = editarCliente;
window.eliminarCliente = eliminarCliente;
