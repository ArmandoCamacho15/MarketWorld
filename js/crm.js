
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

            const response = await MarketWorld.api.crm.clientes(requestParams);
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

    async function viewClientDetails(card) {
        const clientId = card.getAttribute('data-client-id');
        const clientName = card.querySelector('h5').textContent;
        if (!clientId) return;
        
        try {
            const res = await MarketWorld.api.customers.getById(clientId);
            if (!res.success) {
                if (MarketWorld.notifications) MarketWorld.notifications.show('No se pudo cargar el cliente', 'error');
                return;
            }
            const cliente = res.data;
            const facturas = cliente.invoices || [];
            
            let facturasHtml = '';
            if (facturas.length > 0) {
                facturasHtml = facturas.map(f => `<tr><td>${f.issue_date || 'N/A'}</td><td>${f.invoice_number || f.id}</td><td>$${parseFloat(f.total_amount || 0).toLocaleString()}</td><td>${f.status || ''}</td></tr>`).join('');
            } else {
                facturasHtml = `<tr><td colspan="4" class="text-center">No hay compras registradas.</td></tr>`;
            }

            const modalHtml = `
                <div class="modal fade" id="clientDetailsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Detalles de ${cliente.nombre}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <h6>Información Personal</h6>
                                        <p><strong>Documento:</strong> ${cliente.tipo_documento || 'CC'} ${cliente.documento || ''}</p>
                                        <p><strong>Email:</strong> ${cliente.email || 'N/A'}</p>
                                        <p><strong>Teléfono:</strong> ${cliente.telefono || 'N/A'}</p>
                                        <p><strong>Ciudad:</strong> ${cliente.ciudad || 'N/A'}</p>
                                    </div>
                                    <div class="col-md-6">
                                        <h6>Estadísticas / CRM</h6>
                                        <p><strong>Segmento:</strong> ${cliente.segmento || 'N/A'}</p>
                                        <p><strong>Límite de Crédito:</strong> $${parseFloat(cliente.limite_credito || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                <h6>Historial de Compras</h6>
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead><tr><th>Fecha</th><th>Factura</th><th>Monto</th><th>Estado</th></tr></thead>
                                        <tbody>${facturasHtml}</tbody>
                                    </table>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                                <button class="btn btn-primary btn-edit-client-modal">Editar Cliente</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            const existingModal = document.getElementById('clientDetailsModal');
            if (existingModal) existingModal.remove();
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modalEl = document.getElementById('clientDetailsModal');
            const bsModal = new bootstrap.Modal(modalEl);
            
            modalEl.querySelector('.btn-edit-client-modal').addEventListener('click', () => {
                bsModal.hide();
                showEditClientModal(cliente);
            });
            
            modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); });
            bsModal.show();
        } catch (err) {
            console.error(err);
        }
    }

    function showEditClientModal(cliente) {
        const modalHtml = `
            <div class="modal fade" id="clientEditModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Editar Cliente: ${cliente.nombre}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editClientForm">
                                <div class="mb-3">
                                    <label>Nombre</label>
                                    <input type="text" class="form-control" name="nombre" value="${cliente.nombre}" required>
                                </div>
                                <div class="mb-3">
                                    <label>Email</label>
                                    <input type="email" class="form-control" name="email" value="${cliente.email || ''}">
                                </div>
                                <div class="mb-3">
                                    <label>Teléfono</label>
                                    <input type="text" class="form-control" name="telefono" value="${cliente.telefono || ''}">
                                </div>
                                <div class="mb-3">
                                    <label>Ciudad</label>
                                    <input type="text" class="form-control" name="ciudad" value="${cliente.ciudad || ''}">
                                </div>
                                <div class="mb-3">
                                    <label>Segmento</label>
                                    <select class="form-select" name="segmento">
                                        <option value="Premium" ${cliente.segmento === 'Premium' ? 'selected' : ''}>Premium</option>
                                        <option value="Frecuente" ${cliente.segmento === 'Frecuente' ? 'selected' : ''}>Frecuente</option>
                                        <option value="Corporativo" ${cliente.segmento === 'Corporativo' ? 'selected' : ''}>Corporativo</option>
                                        <option value="Nuevo" ${cliente.segmento === 'Nuevo' ? 'selected' : ''}>Nuevo</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button class="btn btn-success btn-save-client">Guardar Cambios</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('clientEditModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('clientEditModal');
        const bsModal = new bootstrap.Modal(modalEl);
        
        modalEl.querySelector('.btn-save-client').addEventListener('click', async () => {
            const form = document.getElementById('editClientForm');
            const data = {
                nombre: form.nombre.value,
                email: form.email.value,
                telefono: form.telefono.value,
                ciudad: form.ciudad.value,
                segmento: form.segmento.value
            };
            try {
                const res = await MarketWorld.api.customers.update(cliente.id, data);
                if (res.success) {
                    if (MarketWorld.notifications) MarketWorld.notifications.show('Cliente actualizado', 'success');
                    bsModal.hide();
                    loadCustomersFromAPI();
                } else {
                    alert('Error al actualizar: ' + (res.message || ''));
                }
            } catch (err) {
                console.error(err);
            }
        });
        
        modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); });
        bsModal.show();
    }

    // ======= FILTROS DE CLIENTES =======
    function initClientFilters() {
        const buttons = document.querySelectorAll('.btn-primary');
        buttons.forEach(btn => {
            if (btn.textContent.includes('Filtrar')) {
                btn.addEventListener('click', applyClientFilters);
            }
        });
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
        const opportunityRows = document.querySelectorAll('#oportunidades .data-table tbody tr');
        
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

        // ======= BOTÓN NUEVA OPORTUNIDAD =======
        const buttons = document.querySelectorAll('.btn-primary');
        buttons.forEach(btn => {
            if (btn.textContent.includes('Nueva Oportunidad')) {
                btn.addEventListener('click', showCreateOpportunityModal);
            }
        });

        loadOpportunitiesFromAPI();
    }

    async function loadOpportunitiesFromAPI() {
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.crm) {
                console.warn('[CRM] API CRM no disponible.');
                return;
            }
            const respuesta = await MarketWorld.api.crm.oportunidades();
            if (respuesta.success) {
                renderizarOportunidades(respuesta.data);
            }
        } catch (error) {
            console.error('[API] Error al cargar oportunidades:', error);
        }
    }

    function showCreateOpportunityModal() {
        const modalHtml = `
            <div class="modal fade" id="createOppModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Nueva Oportunidad</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="createOppForm">
                                <div class="mb-3">
                                    <label>Título</label>
                                    <input type="text" class="form-control" name="titulo" required>
                                </div>
                                <div class="mb-3">
                                    <label>ID del Cliente (opcional)</label>
                                    <input type="number" class="form-control" name="customer_id">
                                </div>
                                <div class="mb-3">
                                    <label>Valor Estimado</label>
                                    <input type="number" step="0.01" class="form-control" name="valor_estimado" value="0">
                                </div>
                                <div class="mb-3">
                                    <label>Etapa</label>
                                    <select class="form-select" name="etapa">
                                        <option value="prospecto">Prospecto</option>
                                        <option value="contactado">Contactado</option>
                                        <option value="propuesta">Propuesta</option>
                                        <option value="negociacion">Negociación</option>
                                        <option value="ganado">Ganado</option>
                                        <option value="perdido">Perdido</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label>Fecha Estimada Cierre</label>
                                    <input type="date" class="form-control" name="fecha_estimada_cierre">
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button class="btn btn-primary btn-save-opp">Crear</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('createOppModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('createOppModal');
        const bsModal = new bootstrap.Modal(modalEl);
        
        modalEl.querySelector('.btn-save-opp').addEventListener('click', async () => {
            const form = document.getElementById('createOppForm');
            const data = {
                titulo: form.titulo.value,
                customer_id: form.customer_id.value || null,
                valor_estimado: parseFloat(form.valor_estimado.value) || 0,
                etapa: form.etapa.value,
                fecha_estimada_cierre: form.fecha_estimada_cierre.value || null
            };
            try {
                const res = await MarketWorld.api.crm.crearOportunidad(data);
                if (res.success) {
                    if (MarketWorld.notifications) MarketWorld.notifications.show('Oportunidad creada', 'success');
                    bsModal.hide();
                    loadOpportunitiesFromAPI();
                } else {
                    alert('Error: ' + (res.message || ''));
                }
            } catch (err) {
                console.error(err);
            }
        });
        
        modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); });
        bsModal.show();
    }

    function renderizarOportunidades(oportunidades) {
        const tbody = document.querySelector('#oportunidades .data-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!oportunidades || oportunidades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay oportunidades registradas.</td></tr>';
            return;
        }

        const stages = ['prospecto', 'contactado', 'propuesta', 'negociacion', 'ganado', 'perdido'];

        oportunidades.forEach(opp => {
            let progressClass = 'bg-success';
            let progressValue = 50;

            if (opp.etapa === 'ganado') {
                progressValue = 100;
            } else if (opp.etapa === 'perdido') {
                progressClass = 'bg-danger';
                progressValue = 0;
            } else if (opp.etapa === 'prospecto') {
                progressValue = 10;
                progressClass = 'bg-secondary';
            } else if (opp.etapa === 'contactado') {
                progressValue = 30;
                progressClass = 'bg-info';
            } else if (opp.etapa === 'propuesta') {
                progressValue = 60;
                progressClass = 'bg-warning';
            } else if (opp.etapa === 'negociacion') {
                progressValue = 80;
                progressClass = 'bg-primary';
            }

            const tr = document.createElement('tr');
            
            const stageOptions = stages.map(s => `<option value="${s}" ${s === opp.etapa ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('');

            tr.innerHTML = `
                <td>${opp.titulo}</td>
                <td>${opp.customer ? opp.customer.nombre : 'Sin Cliente'}</td>
                <td>$${parseFloat(opp.valor_estimado).toLocaleString()}</td>
                <td>
                    <select class="form-select form-select-sm stage-select" data-id="${opp.id}">
                        ${stageOptions}
                    </select>
                </td>
                <td>
                    <div class="progress" style="height: 10px;">
                        <div class="progress-bar ${progressClass}" role="progressbar" style="width: ${progressValue}%;"></div>
                    </div>
                    <div class="small text-center">${progressValue}%</div>
                </td>
                <td>${opp.fecha_estimada_cierre || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger btn-delete-opp" data-id="${opp.id}"><i class="bi bi-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Eventos para cambiar etapa y eliminar
        tbody.querySelectorAll('.stage-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const id = e.target.getAttribute('data-id');
                const newStage = e.target.value;
                try {
                    const res = await MarketWorld.api.crm.actualizarOportunidad(id, { etapa: newStage });
                    if (res.success) {
                        if (MarketWorld.notifications) MarketWorld.notifications.show('Etapa actualizada', 'success');
                        loadOpportunitiesFromAPI();
                    } else {
                        if (MarketWorld.notifications) MarketWorld.notifications.show(res.message || 'Error', 'error');
                        // revertir visualmente si hay error y es posible
                    }
                } catch (error) {
                    console.error(error);
                }
            });
        });

        tbody.querySelectorAll('.btn-delete-opp').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('¿Estás seguro de eliminar esta oportunidad?')) {
                    try {
                        const res = await MarketWorld.api.crm.eliminarOportunidad(id);
                        if (res.success) {
                            if (MarketWorld.notifications) MarketWorld.notifications.show('Oportunidad eliminada', 'success');
                            loadOpportunitiesFromAPI();
                        } else {
                            if (MarketWorld.notifications) MarketWorld.notifications.show(res.message || 'Error', 'error');
                        }
                    } catch (error) {
                        console.error(error);
                    }
                }
            });
        });
    }

    function filterOpportunitiesByStage(stage) {
        console.log(`🎯 Filtrando oportunidades en etapa: ${stage}`);
        alert(`Mostrando oportunidades en etapa: ${stage}`);
    }

    // ======= SEGMENTACIÓN DE CLIENTES =======
    function initSegmentation() {
        const buttons = document.querySelectorAll('.btn-primary');
        buttons.forEach(btn => {
            if (btn.textContent.includes('Nuevo Segmento')) {
                btn.addEventListener('click', createNewSegment);
            }
        });
        
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
        const buttons = document.querySelectorAll('.btn-primary');
        buttons.forEach(btn => {
            if (btn.textContent.includes('Nueva Campaña')) {
                btn.addEventListener('click', createCampaign);
            }
        });
        
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
