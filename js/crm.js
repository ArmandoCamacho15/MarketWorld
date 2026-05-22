
(function() {
    'use strict';

    let selectedClient = null;
    let selectedOpportunity = null;
    let selectedOpportunityData = null;
    let lastCreatedActivityId = null;
    let clientsEventsAttached = false;
    let crmOpportunityFilterStage = null;
    const crmCustomerListState = {
        page: 1,
        perPage: 9,
        lastPage: 1,
        total: 0,
        search: '',
        segmento: '',
        estado: '',
        tipoCliente: '',
        ciudad: '',
    };

    document.addEventListener('DOMContentLoaded', () => {
        console.log(' Módulo CRM cargado');
        // --- Inicializar notificaciones ---
        if (MarketWorld.notifications && MarketWorld.notifications.init) {
            MarketWorld.notifications.init();
        }
        // --- Cargar KPIs del dashboard CRM desde API ---
        loadCRMDashboardStats();
        // --- Cargar clientes desde el backend ---
        loadCustomersFromAPI();
        initClientCards();
        initClientFilters();
        initCrmPaginationEvents();
        // --- Cargar oportunidades y actualizar embudo ---
        initOpportunityManagement();
        updateFunnelSteps();
        initOpportunityDetailSave();
        initSegmentation();
        initCampaigns();
        initActivities();
        initReminders();
        initClientSearch();
        initClientInvoiceActions();
        initInlineOpportunityActions();
        initInlineReminderActions();
        initClientNotesSave();
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
            if (crmCustomerListState.tipoCliente) {
                requestParams.tipo_cliente = crmCustomerListState.tipoCliente;
            }
            if (crmCustomerListState.ciudad) {
                requestParams.ciudad = crmCustomerListState.ciudad;
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
                    <div class="card client-card h-100" data-client-id="${cliente.id}" data-client-email="${cliente.email || ''}" data-client-phone="${cliente.telefono || ''}" data-client-name="${cliente.nombre || ''}" data-client-city="${cliente.ciudad || ''}" style="border-left: 4px solid #9b59b6;">
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
        if (clientsEventsAttached) return;

        const container = getClientsContainer();
        if (!container) return;

        // Delegación de eventos para tarjetas dinámicas
        container.addEventListener('click', (e) => {
            const card = e.target.closest('.client-card');
            if (!card) return;

            // Botón ver detalles
            if (e.target.closest('.btn-view-details')) {
                e.stopPropagation();
                viewClientDetails(card);
                return;
            }

            // Botón contactar
            if (e.target.closest('.btn-contact-client')) {
                e.stopPropagation();
                contactClient(card);
                return;
            }

            // Click en la tarjeta (no en botones) — seleccionar cliente
            if (!e.target.closest('button') && !e.target.closest('a')) {
                const clientNameEl = card.querySelector('h5');
                const clientName = clientNameEl ? clientNameEl.textContent : null;
                selectClient(clientName, card);
            }
        });

        clientsEventsAttached = true;
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
            const invoicesRes = await MarketWorld.api.invoices.getAll({ customer_id: clientId, per_page: 10 });
            const facturas = (invoicesRes && invoicesRes.data) ? invoicesRes.data : [];
            
            let facturasHtml = '';
            if (facturas.length > 0) {
                facturasHtml = facturas.map(f => {
                    const fecha = f.fecha || (f.created_at ? f.created_at.substring(0, 10) : 'N/A');
                    const numero = f.numero_factura || f.id || 'N/A';
                    const total = parseFloat(f.total || 0);
                    return `<tr><td>${fecha}</td><td>${numero}</td><td>$${total.toLocaleString()}</td><td>${f.estado || ''}</td></tr>`;
                }).join('');
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
                                        <p><strong>Tipo Cliente:</strong> ${cliente.tipo_cliente || 'N/A'}</p>
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

    function contactClient(card) {
        const email = card.getAttribute('data-client-email');
        const telefono = card.getAttribute('data-client-phone');

        if (email) {
            window.location.href = `mailto:${email}`;
            return;
        }

        if (telefono) {
            window.location.href = `tel:${telefono}`;
            return;
        }

        if (MarketWorld.notifications) {
            MarketWorld.notifications.show('Cliente sin email ni teléfono registrado.', 'warning');
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
                    if (MarketWorld.notifications) MarketWorld.notifications.show(res.message || 'Error al actualizar', 'error');
                    else console.warn('Error al actualizar cliente:', res.message);
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
        const filterBtn = document.getElementById('crmFilterBtn');
        if (filterBtn) {
            filterBtn.addEventListener('click', applyClientFilters);
        }

        const newClientBtn = document.getElementById('crmNewClientBtn');
        if (newClientBtn) {
            newClientBtn.addEventListener('click', showCreateClientModal);
        }
    }

    function applyClientFilters() {
        const tipoCliente = document.getElementById('crmFilterTipo')?.value || '';
        const ciudad = document.getElementById('crmFilterCiudad')?.value || '';
        const segmento = document.getElementById('crmFilterSegmento')?.value || '';

        crmCustomerListState.page = 1;
        crmCustomerListState.estado = '';
        crmCustomerListState.segmento = '';
        crmCustomerListState.tipoCliente = tipoCliente;
        crmCustomerListState.ciudad = ciudad;

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
        // ======= BOTONES DEL EMBUDO =======
        const funnelSteps = document.querySelectorAll('.funnel-step');
        funnelSteps.forEach(step => {
            step.style.cursor = 'pointer';
            step.addEventListener('click', () => {
                const label = step.querySelector('.kpi-title').textContent.toLowerCase();
                const stage = mapFunnelLabelToStage(label);
                console.log(`🔄 Etapa seleccionada: ${stage}`);
                filterOpportunitiesByStage(stage);
            });
        });

        // ======= BOTÓN NUEVA OPORTUNIDAD =======
        const newOpportunityBtn = document.getElementById('crmNewOpportunityBtn');
        if (newOpportunityBtn) {
            newOpportunityBtn.addEventListener('click', showCreateOpportunityModal);
        }

        // ======= BOTÓN EMBUDO DE VENTAS =======
        const funnelBtn = document.getElementById('crmFunnelBtn');
        if (funnelBtn) {
            funnelBtn.addEventListener('click', () => {
                console.log('Embudo de ventas disponible en las tarjetas de etapas arriba');
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('Haz clic en las tarjetas de etapas para filtrar oportunidades', 'info');
                }
            });
        }

        loadOpportunitiesFromAPI();
    }

    function mapFunnelLabelToStage(label) {
        const normalized = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const mapping = {
            leads: 'prospecto',
            contactados: 'contactado',
            propuestas: 'propuesta',
            negociacion: 'negociacion',
        };
        return mapping[normalized] || 'prospecto';
    }

    async function loadOpportunitiesFromAPI() {
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.crm) {
                console.warn('[CRM] API CRM no disponible.');
                return;
            }
            const params = {};
            if (crmOpportunityFilterStage) params.etapa = crmOpportunityFilterStage;
            const respuesta = await MarketWorld.api.crm.oportunidades(params);
            if (respuesta.success) {
                const oportunidades = Array.isArray(respuesta.data) ? respuesta.data : [];
                const oportunidadesUnicas = [];
                const idsVistos = new Set();

                oportunidades.forEach(opp => {
                    const key = opp && opp.id != null ? String(opp.id) : `${opp.titulo || ''}|${opp.customer_id || ''}|${opp.valor_estimado || ''}|${opp.fecha_estimada_cierre || ''}`;
                    if (idsVistos.has(key)) return;
                    idsVistos.add(key);
                    oportunidadesUnicas.push(opp);
                });

                renderizarOportunidades(oportunidadesUnicas);

                if (!selectedOpportunity && oportunidadesUnicas.length > 0) {
                    selectedOpportunity = oportunidadesUnicas[0].id;
                    selectedOpportunityData = oportunidadesUnicas[0];
                }

                if (selectedOpportunity) {
                    await updateOpportunityDetail();
                } else {
                    renderEmptyOpportunityDetail();
                }
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
                                    <label>Cliente</label>
                                    <select class="form-select" name="customer_id" required>
                                        <option value="">Selecciona un cliente...</option>
                                    </select>
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

        loadCustomersIntoSelect(modalEl, { selectedId: selectedClient });
        
        modalEl.querySelector('.btn-save-opp').addEventListener('click', async () => {
            const form = document.getElementById('createOppForm');
            const customerId = form.customer_id.value;
            if (!customerId) {
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('Selecciona un cliente para crear la oportunidad.', 'warning');
                }
                return;
            }
            const data = {
                titulo: form.titulo.value,
                customer_id: parseInt(customerId, 10),
                valor_estimado: parseFloat(form.valor_estimado.value) || 0,
                etapa: form.etapa.value,
                fecha_estimada_cierre: form.fecha_estimada_cierre.value || null
            };
            try {
                const res = await MarketWorld.api.crm.crearOportunidad(data);
                if (res.success) {
                    showCenteredFeedbackModal('Oportunidad creada correctamente.', 'success');
                    bsModal.hide();
                    loadOpportunitiesFromAPI();
                } else {
                    if (MarketWorld.notifications) MarketWorld.notifications.show(res.message || 'Error', 'error');
                    else console.warn('Error al crear oportunidad:', res.message);
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
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay oportunidades registradas.</td></tr>';
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
            tr.setAttribute('data-opp-id', opp.id);
            tr.style.cursor = 'pointer';
            
            const stageOptions = stages.map(s => `<option value="${s}" ${s === opp.etapa ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`).join('');

            tr.innerHTML = `
                <td>${opp.titulo}</td>
                <td>${opp.customer?.nombre || 'Sin Cliente'}</td>
                <td>$${parseFloat(opp.valor_estimado || 0).toLocaleString()}</td>
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
                <td><span class="badge bg-info">${opp.estado || 'En proceso'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-danger btn-delete-opp" data-id="${opp.id}"><i class="bi bi-trash"></i></button>
                </td>
            `;
            
            // Agregar listener para seleccionar la oportunidad al hacer clic
            tr.addEventListener('click', (e) => {
                if (!e.target.closest('select') && !e.target.closest('button')) {
                    selectOpportunity(opp.titulo, tr);
                }
            });
            
            tbody.appendChild(tr);
        });

        // Eventos para cambiar etapa
        tbody.querySelectorAll('.stage-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                e.stopPropagation();
                const id = e.target.getAttribute('data-id');
                const newStage = e.target.value;
                try {
                    const res = await MarketWorld.api.crm.actualizarOportunidad(id, { etapa: newStage });
                    if (res.success) {
                        if (MarketWorld.notifications) MarketWorld.notifications.show('Etapa actualizada', 'success');
                        loadOpportunitiesFromAPI();
                        updateFunnelSteps();
                    } else {
                        if (MarketWorld.notifications) MarketWorld.notifications.show(res.message || 'Error', 'error');
                    }
                } catch (error) {
                    console.error('[Stage Update] Error:', error);
                }
            });
        });

        // Eventos para eliminar
        tbody.querySelectorAll('.btn-delete-opp').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm('¿Estás seguro de eliminar esta oportunidad?')) {
                    try {
                        const res = await MarketWorld.api.crm.eliminarOportunidad(id);
                        if (res.success) {
                            showCenteredFeedbackModal('Oportunidad eliminada correctamente.', 'success');
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
        crmOpportunityFilterStage = stage;
        if (MarketWorld && MarketWorld.notifications) {
            MarketWorld.notifications.show(`Mostrando oportunidades en etapa: ${stage}`, 'info');
        }
        loadOpportunitiesFromAPI();
    }

    function initInlineOpportunityActions() {
        const probInput = document.getElementById('oppProbabilidadInput');
        const probValue = document.getElementById('oppProbabilidadValue');
        if (probInput && probValue) {
            probInput.addEventListener('input', () => {
                probValue.textContent = `${probInput.value}%`;
            });
        }
    }

    function initInlineReminderActions() {
        const reminderBtn = document.getElementById('btnProgramarRecordatorios');
        if (!reminderBtn) return;

        reminderBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            if (!MarketWorld?.api?.crm) {
                console.warn('[CRM] API no disponible para recordatorios');
                return;
            }

            if (!selectedOpportunityData?.id) {
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('Selecciona una oportunidad primero', 'warning');
                }
                return;
            }

            if (!lastCreatedActivityId) {
                const resolvedActivityId = await resolveLatestActivityIdForSelectedOpportunity();
                if (resolvedActivityId) {
                    lastCreatedActivityId = resolvedActivityId;
                }
            }

            if (!lastCreatedActivityId) {
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('La oportunidad no tiene actividades asociadas para programar recordatorios.', 'warning');
                }
                return;
            }

            const fechaRaw = document.getElementById('reminderDateTime')?.value;
            const fechaEnvio = formatDateTimeForApi(fechaRaw);
            if (!fechaEnvio) {
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('Selecciona fecha y hora para el recordatorio.', 'warning');
                }
                return;
            }

            const mensaje = document.getElementById('reminderMessage')?.value || '';
            const types = [];
            if (document.getElementById('reminderEmail')?.checked) {
                types.push('Email');
            }
            if (document.getElementById('reminderWhatsapp')?.checked) {
                types.push('Notificación');
            }

            if (types.length === 0) {
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('Selecciona al menos un canal de recordatorio.', 'warning');
                }
                return;
            }

            try {
                for (const tipo of types) {
                    const res = await MarketWorld.api.crm.crearRecordatorio({
                        titulo: 'Recordatorio CRM',
                        descripcion: mensaje || null,
                        tipo: tipo,
                        fecha_envio: fechaEnvio,
                        activity_id: lastCreatedActivityId,
                    });

                    if (!res.success) {
                        if (MarketWorld.notifications) {
                            MarketWorld.notifications.show(res.message || 'Error al programar recordatorio', 'error');
                        }
                        return;
                    }
                }

                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('Recordatorio(s) programado(s)', 'success');
                }
                const messageInput = document.getElementById('reminderMessage');
                if (messageInput) messageInput.value = '';
                const dateInput = document.getElementById('reminderDateTime');
                if (dateInput) dateInput.value = '';
            } catch (err) {
                console.error('[Reminder] Error:', err);
            }
        });
    }

    // NOTE: funciones de segmentación y campañas definidas más abajo

    // ======= BÚSQUEDA DE CLIENTES =======
    function initClientSearch() {
        const searchInput = document.getElementById('clienteSearchInput');
        const searchBtn = document.getElementById('clienteSearchBtn');

        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                const query = e.target.value.trim();
                if (query.length >= 2) {
                    searchClientsForFicha(query);
                } else if (query.length === 0) {
                    clearClientSearchResults();
                }
            }, 300));
        }

        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => {
                const query = searchInput.value.trim();
                if (query.length >= 2) {
                    searchClientsForFicha(query);
                }
            });
        }
    }

    async function searchClientsForFicha(query) {
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.customers) {
                console.warn('[CRM Search] API de clientes no disponible');
                return;
            }

            const response = await MarketWorld.api.customers.getAll({ search: query, per_page: 10 });
            const parsed = normalizeApiListResponse(response, { per_page: 10, current_page: 1 });
            renderClientSearchResults(parsed.items || []);
        } catch (err) {
            console.error('[CRM Search] Error:', err);
        }
    }

    function clearClientSearchResults() {
        const container = document.getElementById('clienteSearchResults');
        if (container) container.innerHTML = '';
    }

    function renderClientSearchResults(clientes) {
        const container = document.getElementById('clienteSearchResults');
        if (!container) return;

        container.innerHTML = '';

        if (!clientes || clientes.length === 0) {
            container.innerHTML = '<div class="list-group-item text-muted">No se encontraron clientes.</div>';
            return;
        }

        clientes.forEach(cliente => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-start';
            item.innerHTML = `
                <div>
                    <div class="fw-semibold">${cliente.nombre || 'Cliente sin nombre'}</div>
                    <div class="small text-muted">${cliente.documento || 'Sin documento'} ${cliente.email ? '· ' + cliente.email : ''}</div>
                </div>
                <span class="badge bg-primary">Seleccionar</span>
            `;
            item.addEventListener('click', () => {
                loadClientDetailById(cliente.id);
            });
            container.appendChild(item);
        });
    }

    async function loadClientDetailById(clientId) {
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.customers) {
                console.warn('[Client Detail] API no disponible');
                return;
            }

            const res = await MarketWorld.api.customers.getById(clientId);
            if (!res.success) {
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show(res.message || 'No se pudo cargar el cliente.', 'error');
                }
                return;
            }

            selectedClient = res.data.id;
            updateClientSheet(res.data);
            clearClientSearchResults();

            const searchInput = document.getElementById('clienteSearchInput');
            if (searchInput && res.data.nombre) {
                searchInput.value = res.data.nombre;
            }

            if (MarketWorld.notifications) {
                MarketWorld.notifications.show(`Cliente cargado: ${res.data.nombre || 'seleccionado'}`, 'success');
            }
        } catch (err) {
            console.error('[Client Detail] Error:', err);
        }
    }

    function searchClients(query) {
        crmCustomerListState.search = query || '';
        crmCustomerListState.page = 1;
        loadCustomersFromAPI();
    }

    // ======= CORRECCIÓN 1.1: KPIs del Módulo =======
    // Cargar estadísticas desde API para actualizar tarjetas KPI
    async function loadCRMDashboardStats() {
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.crm) {
                console.warn('[CRM KPIs] API no disponible');
                return;
            }

            // Obtener clientes (solo necesitamos el total)
            const clientesRes = await MarketWorld.api.crm.clientes({ per_page: 1 });
            const totalClientes = clientesRes.meta?.total || 0;

            // Obtener oportunidades
            const oppsRes = await MarketWorld.api.crm.oportunidades();
            const totalOportunidades = oppsRes.meta?.total || (oppsRes.data?.length || 0);
            
            // Calcular ventas potenciales sumando valores estimados
            const ventasPotenciales = (oppsRes.data || [])
                .reduce((sum, opp) => sum + (parseFloat(opp.valor_estimado) || 0), 0);
            
            // Calcular tasa de cierre (oportunidades ganadas / total)
            const ganadas = (oppsRes.data || []).filter(o => o.etapa === 'ganado').length;
            const tasaCierre = totalOportunidades > 0 
                ? Math.round((ganadas / totalOportunidades) * 100)
                : 0;

            // Actualizar KPIs en el DOM
            const kpiCards = document.querySelectorAll('.kpi-card');
            if (kpiCards[0]) kpiCards[0].querySelector('.kpi-value').textContent = totalClientes;
            if (kpiCards[1]) kpiCards[1].querySelector('.kpi-value').textContent = totalOportunidades;
            if (kpiCards[2]) {
                const valor = ventasPotenciales > 1000000 
                    ? `$${(ventasPotenciales / 1000000).toFixed(1)}M`
                    : `$${ventasPotenciales.toLocaleString()}`;
                kpiCards[2].querySelector('.kpi-value').textContent = valor;
            }
            if (kpiCards[3]) kpiCards[3].querySelector('.kpi-value').textContent = `${tasaCierre}%`;

            console.log(`[CRM KPIs] Actualizados: ${totalClientes} clientes, ${totalOportunidades} oportunidades`);
        } catch (error) {
            console.error('[CRM KPIs] Error:', error);
        }
    }

    // ======= CORRECCIÓN 4.3: Indicadores del Embudo =======
    // Actualizar conteos de oportunidades por etapa
    async function updateFunnelSteps() {
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.crm) {
                console.warn('[Funnel] API no disponible');
                return;
            }

            const oportunidades = await MarketWorld.api.crm.oportunidades();
            const stages = {
                prospecto: 0,
                contactado: 0,
                propuesta: 0,
                negociacion: 0,
                ganado: 0,
                perdido: 0,
            };
            
            (oportunidades.data || []).forEach(opp => {
                if (stages.hasOwnProperty(opp.etapa)) {
                    stages[opp.etapa]++;
                }
            });
            
            // Mapear a los elementos del HTML en orden: Leads, Contactados, Propuestas, Negociación
            const funnelSteps = document.querySelectorAll('.funnel-step');
            const stepOrder = ['prospecto', 'contactado', 'propuesta', 'negociacion'];
            
            stepOrder.forEach((stage, idx) => {
                if (funnelSteps[idx]) {
                    const count = stages[stage] || 0;
                    funnelSteps[idx].querySelector('.kpi-value').textContent = count;
                    
                    // Calcular porcentaje de conversión a la siguiente etapa si hay datos
                    if (idx < stepOrder.length - 1) {
                        const nextStageCount = stages[stepOrder[idx + 1]] || 0;
                        const percentage = count > 0 ? Math.round((nextStageCount / count) * 100) : 0;
                        const smallText = funnelSteps[idx].querySelector('.small');
                        if (smallText) smallText.textContent = `${percentage}% conversión`;
                    }
                }
            });

            console.log('[Funnel] Conteos actualizados:', stages);
        } catch (error) {
            console.error('[Funnel] Error:', error);
        }
    }

    // ======= CORRECCIÓN 3.6–3.10: Ficha Completa del Cliente =======
    // Actualizar ficha del cliente cuando se selecciona uno
    async function selectClient(clientName, card) {
        selectedClient = card.getAttribute('data-client-id');
        const clientId = selectedClient;
        
        // Cargar datos completos del cliente seleccionado
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api) {
                console.warn('[Client Sheet] API no disponible');
                return;
            }

            const res = await MarketWorld.api.customers.getById(clientId);
            if (res.success) {
                updateClientSheet(res.data);
                addEditClientButton(); // Agregar botones de editar
                
                // Marcar visualmente como seleccionado
                document.querySelectorAll('.client-card').forEach(c => {
                    c.style.borderLeft = '4px solid #9b59b6';
                });
                card.style.borderLeft = '4px solid #0d6ef0';

                const searchInput = document.getElementById('clienteSearchInput');
                if (searchInput) {
                    searchInput.value = res.data.nombre || clientName || '';
                }

                clearClientSearchResults();
            }
        } catch (err) {
            console.error('[Client Sheet] Error:', err);
        }
    }

    // Actualizar los campos de la ficha con datos del cliente
    function updateClientSheet(cliente) {
        try {
            const nombreInput = document.getElementById('clienteNombre');
            const tipoDocumentoSelect = document.getElementById('clienteTipoDocumento');
            const documentoInput = document.getElementById('clienteDocumento');
            const emailInput = document.getElementById('clienteEmail');
            const telefonoInput = document.getElementById('clienteTelefono');
            const direccionInput = document.getElementById('clienteDireccion');
            const tipoClienteSelect = document.getElementById('clienteTipo');
            const limiteCreditoInput = document.getElementById('clienteLimiteCredito');
            const segmentoSelect = document.getElementById('clienteSegmento');
            const ejecutivoSelect = document.getElementById('clienteEjecutivo');
            const notasTextarea = document.getElementById('clienteNotas');

            if (nombreInput) nombreInput.value = cliente.nombre || '';
            if (tipoDocumentoSelect) tipoDocumentoSelect.value = cliente.tipo_documento || 'CC';
            if (documentoInput) documentoInput.value = cliente.documento || '';
            if (emailInput) emailInput.value = cliente.email || '';
            if (telefonoInput) telefonoInput.value = cliente.telefono || '';
            if (direccionInput) direccionInput.value = cliente.direccion || '';

            if (tipoClienteSelect) tipoClienteSelect.value = cliente.tipo_cliente || 'Persona Natural';
            if (limiteCreditoInput) {
                const limite = parseFloat(cliente.limite_credito || 0);
                limiteCreditoInput.value = limite > 0 ? `$${limite.toLocaleString()}` : '';
            }
            if (segmentoSelect) segmentoSelect.value = cliente.segmento || 'Premium';
            if (ejecutivoSelect) ejecutivoSelect.value = cliente.ejecutivo_asignado || 'Ejecutivo CRM';
            if (notasTextarea) notasTextarea.value = cliente.notas || '';
            
            // Cargar historial de compras
            loadClientInvoices(cliente.id);
            
            console.log(`[Client Sheet] Actualizada para cliente ${cliente.nombre}`);
        } catch (err) {
            console.error('[Client Sheet Update] Error:', err);
        }
    }

    // Cargar historial de compras del cliente
    async function loadClientInvoices(clientId) {
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api) {
                console.warn('[Client Invoices] API no disponible');
                return;
            }

            const res = await MarketWorld.api.invoices.getAll({ customer_id: clientId, per_page: 5 });
            const facturas = res.data || [];
            const tbody = document.getElementById('clienteFacturasBody');
            
            if (!tbody) return;
            
            tbody.innerHTML = '';
            if (facturas.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Sin compras registradas</td></tr>';
                return;
            }
            
            facturas.forEach(f => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-invoice-id', f.id || '');
                tr.setAttribute('data-invoice-number', f.numero_factura || '');
                tr.setAttribute('data-invoice-total', String(f.total || 0));
                tr.setAttribute('data-invoice-date', f.fecha || (f.created_at ? f.created_at.substring(0, 10) : 'N/A'));
                tr.setAttribute('data-invoice-status', f.estado || 'Pagada');
                tr.style.cursor = 'pointer';
                tr.innerHTML = `
                    <td>${f.fecha || (f.created_at ? f.created_at.substring(0, 10) : 'N/A')}</td>
                    <td>${f.numero_factura || f.id || 'N/A'}</td>
                    <td>$${parseFloat(f.total || 0).toLocaleString()}</td>
                    <td><span class="badge bg-success">${f.estado || 'Pagada'}</span></td>
                    <td><button class="btn btn-sm btn-outline-primary btn-view-invoice" type="button"><i class="bi bi-eye"></i></button></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('[Client Invoices] Error:', err);
        }
    }

    function initClientInvoiceActions() {
        const tbody = document.getElementById('clienteFacturasBody');
        if (!tbody) return;

        tbody.addEventListener('click', async (e) => {
            const row = e.target.closest('tr');
            if (!row) return;

            const button = e.target.closest('button.btn-view-invoice');
            const clickedInsideRow = Boolean(button || e.target.closest('td'));
            if (!clickedInsideRow) return;

            const invoiceId = row?.getAttribute('data-invoice-id');
            const invoiceNumber = row?.getAttribute('data-invoice-number') || row?.children?.[1]?.textContent?.trim() || '';
            const invoiceTotal = parseCurrencyValue(row?.getAttribute('data-invoice-total') || row?.children?.[2]?.textContent || '0');
            const invoiceDate = row?.getAttribute('data-invoice-date') || row?.children?.[0]?.textContent?.trim() || 'N/A';
            const invoiceStatus = row?.getAttribute('data-invoice-status') || row?.children?.[3]?.textContent?.trim() || 'Pagada';

            if (!invoiceId && !invoiceNumber) {
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('No se pudo identificar la factura.', 'warning');
                }
                return;
            }

            try {
                if (invoiceId) {
                    try {
                        const res = await MarketWorld.api.invoices.getById(invoiceId);
                        if (res.success) {
                            showInvoiceModal(res.data);
                            return;
                        }
                        if (MarketWorld.notifications) {
                            MarketWorld.notifications.show(res.message || 'No se pudo cargar la factura.', 'error');
                        }
                    } catch (detailErr) {
                        console.warn('[Invoice Detail] Fallback a datos de fila:', detailErr);
                    }
                }

                showInvoiceModal({
                    id: invoiceNumber,
                    numero_factura: invoiceNumber,
                    fecha: invoiceDate,
                    total: invoiceTotal,
                    estado: invoiceStatus,
                    customer: { nombre: selectedClient || 'Cliente' },
                    items: [],
                });
            } catch (err) {
                console.error('[Invoice Detail] Error:', err);
            }
        });
    }

    function showInvoiceModal(invoice) {
        const modalHtml = `
            <div class="modal fade" id="invoiceDetailModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Factura ${invoice.numero_factura || invoice.id}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <p><strong>Cliente:</strong> ${invoice.customer?.nombre || 'N/A'}</p>
                                    <p><strong>Fecha:</strong> ${invoice.fecha || (invoice.created_at ? invoice.created_at.substring(0, 10) : 'N/A')}</p>
                                </div>
                                <div class="col-md-6">
                                    <p><strong>Estado:</strong> ${invoice.estado || 'N/A'}</p>
                                    <p><strong>Total:</strong> $${parseFloat(invoice.total || 0).toLocaleString()}</p>
                                </div>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Cantidad</th>
                                            <th>Precio</th>
                                            <th>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(invoice.items || []).map(item => `
                                            <tr>
                                                <td>${item.product?.nombre || item.product_id}</td>
                                                <td>${item.cantidad || 0}</td>
                                                <td>$${parseFloat(item.precio_unitario || 0).toLocaleString()}</td>
                                                <td>$${parseFloat(item.subtotal || 0).toLocaleString()}</td>
                                            </tr>
                                        `).join('') || '<tr><td colspan="4" class="text-center">Sin items</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('invoiceDetailModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('invoiceDetailModal');
        const bsModal = new bootstrap.Modal(modalEl);
        modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); });
        bsModal.show();
    }
    function showCenteredFeedbackModal(message, type) {
        const modalId = 'crmFeedbackModal';
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        const titleMap = {
            success: 'Confirmación',
            warning: 'Aviso',
            error: 'Error',
            info: 'Información',
        };

        const buttonClassMap = {
            success: 'btn-success',
            warning: 'btn-warning',
            error: 'btn-danger',
            info: 'btn-primary',
        };

        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${titleMap[type] || 'Confirmación'}</h5>
                        </div>
                        <div class="modal-body">
                            <p class="mb-0">${message}</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn ${buttonClassMap[type] || 'btn-primary'}" data-bs-dismiss="modal">Aceptar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById(modalId);
        const bsModal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: true });
        modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); });
        bsModal.show();
    }

    // ======= CORRECCIÓN 4.5: Detalle de Oportunidad =======
    // Actualizar detalle cuando se selecciona oportunidad
    function selectOpportunity(oppTitle, row) {
        selectedOpportunity = row.getAttribute('data-opp-id') || oppTitle;
        console.log(`Oportunidad seleccionada: ${selectedOpportunity}`);
        
        // El detalle se actualiza cuando se renderiza la tabla
        updateOpportunityDetail();
    }

    // Cargar y mostrar detalle de oportunidad seleccionada
    async function updateOpportunityDetail() {
        try {
            if (!selectedOpportunity || typeof MarketWorld === 'undefined' || !MarketWorld.api) {
                renderEmptyOpportunityDetail();
                return;
            }

            const oportunidades = await MarketWorld.api.crm.oportunidades();
            const opp = (oportunidades.data || []).find(o => 
                o.id == selectedOpportunity || o.titulo === selectedOpportunity
            );
            
            if (!opp) {
                renderEmptyOpportunityDetail();
                return;
            }

            selectedOpportunityData = opp;
            
            renderOpportunityDetail(opp);

            const etapaSelect = document.getElementById('oppEtapaSelect');
            if (etapaSelect) etapaSelect.value = opp.etapa || 'prospecto';

            const valorEstimado = document.getElementById('oppValorEstimado');
            if (valorEstimado) {
                valorEstimado.value = `$${parseFloat(opp.valor_estimado || 0).toLocaleString()}`;
            }

            const fechaCierre = document.getElementById('oppFechaCierre');
            if (fechaCierre) fechaCierre.value = opp.fecha_estimada_cierre || '';

            const probabilidadInput = document.getElementById('oppProbabilidadInput');
            const probabilidadValue = document.getElementById('oppProbabilidadValue');
            if (probabilidadInput && probabilidadValue) {
                const prob = stageToProbability(opp.etapa);
                probabilidadInput.value = prob;
                probabilidadValue.textContent = `${prob}%`;
            }

            const asignadoSelect = document.getElementById('oppAsignado');
            const assignedName = opp.user?.name || opp.user?.nombre;
            if (asignadoSelect && assignedName) {
                asignadoSelect.innerHTML = `<option selected>${assignedName}</option>`;
            }

            await loadOpportunityActivities(opp.id);
        } catch (err) {
            console.error('[Opportunity Detail] Error:', err);
        }
    }

    function renderEmptyOpportunityDetail() {
        const title = document.getElementById('oppDetailTitle');
        const value = document.getElementById('oppDetailValue');
        const stage = document.getElementById('oppDetailStage');
        const date = document.getElementById('oppDetailDate');
        const description = document.getElementById('oppDetailDescription');
        const notes = document.getElementById('oppDetailNotes');
        const notesEditor = document.getElementById('oppNotas');
        const activities = document.getElementById('oppActivitiesList');

        if (title) title.textContent = 'Selecciona una oportunidad';
        if (value) value.textContent = '-';
        if (stage) stage.textContent = '-';
        if (date) date.textContent = '-';
        if (description) description.textContent = 'Selecciona una oportunidad para ver su descripción.';
        if (notes) notes.textContent = 'Sin notas registradas.';
        if (notesEditor) notesEditor.value = '';
        if (activities) {
            activities.innerHTML = '<li class="activity-item text-muted">Selecciona una oportunidad para ver sus actividades.</li>';
        }
    }

    function renderOpportunityDetail(opp) {
        const title = document.getElementById('oppDetailTitle');
        const value = document.getElementById('oppDetailValue');
        const stage = document.getElementById('oppDetailStage');
        const date = document.getElementById('oppDetailDate');
        const description = document.getElementById('oppDetailDescription');
        const notes = document.getElementById('oppDetailNotes');
        const notesEditor = document.getElementById('oppNotas');

        if (title) title.textContent = opp.titulo || 'Oportunidad';
        if (value) value.textContent = `$${parseFloat(opp.valor_estimado || 0).toLocaleString()}`;
        if (stage) {
            const labels = {
                prospecto: 'Prospecto',
                contactado: 'Contactado',
                propuesta: 'Propuesta',
                negociacion: 'Negociación',
                ganado: 'Ganado',
                perdido: 'Perdido',
            };
            stage.textContent = labels[opp.etapa] || (opp.etapa || 'Prospecto');
        }
        if (date) date.textContent = opp.fecha_estimada_cierre || 'N/A';
        if (description) {
            description.textContent = opp.notas || opp.descripcion || 'Sin descripción disponible.';
        }
        if (notes) {
            notes.textContent = opp.notas || 'Sin notas registradas.';
        }
        if (notesEditor) {
            notesEditor.value = opp.notas || '';
        }
    }

    async function loadOpportunityActivities(opportunityId) {
        const list = document.getElementById('oppActivitiesList');
        if (!list) return;

        list.innerHTML = '<li class="activity-item text-muted">Cargando actividades...</li>';
        lastCreatedActivityId = null;

        try {
            const res = await MarketWorld.api.crm.actividades({ opportunity_id: opportunityId, per_page: 500 });
            if (!res.success) {
                list.innerHTML = '<li class="activity-item text-muted">No se pudieron cargar las actividades.</li>';
                return;
            }

            const actividades = (res.data || []).filter(act => String(act.opportunity_id || act.opportunity?.id || '') === String(opportunityId));
            if (actividades.length === 0) {
                list.innerHTML = '<li class="activity-item text-muted">Esta oportunidad no tiene actividades registradas.</li>';
                return;
            }

            lastCreatedActivityId = actividades[actividades.length - 1]?.id || actividades[0]?.id || null;

            list.innerHTML = '';
            actividades.forEach(act => {
                const item = document.createElement('li');
                item.className = 'activity-item';
                item.innerHTML = `
                    <div class="activity-icon">
                        <i class="bi bi-calendar-event"></i>
                    </div>
                    <div class="activity-content">
                        <div class="fw-bold">${act.titulo || 'Actividad'}</div>
                        <div class="text-muted small">${formatActivityDate(act.fecha_programada)}</div>
                        <div>${act.descripcion || 'Sin descripción'}</div>
                        <div class="mt-2">
                            <span class="badge bg-light text-dark">${act.tipo || 'Actividad'}</span>
                            <span class="badge bg-${getActivityStateClass(act.estado)} text-white ms-1">${act.estado || 'Pendiente'}</span>
                        </div>
                    </div>
                `;
                list.appendChild(item);
            });
        } catch (err) {
            console.error('[Opportunity Activities] Error:', err);
            list.innerHTML = '<li class="activity-item text-muted">Error al cargar actividades.</li>';
        }
    }

    // ======= CORRECCIÓN 4.7: Guardar Cambios Oportunidad =======
    // Agregar listener al botón de guardar cambios en oportunidad
    function initOpportunityDetailSave() {
        document.addEventListener('click', async (e) => {
            // Detectar botón "Guardar Cambios" en oportunidades
            if (e.target.closest('.btn-success') && 
                e.target.closest('#oportunidades') &&
                e.target.textContent.includes('Guardar')) {
                
                e.preventDefault();
                e.stopPropagation();
                
                if (!selectedOpportunity) {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show('Selecciona una oportunidad primero', 'warning');
                    }
                    return;
                }
                
                // Obtener valores del formulario
                const stageSelect = document.getElementById('oppEtapaSelect');
                const probabilidadInput = document.getElementById('oppProbabilidadInput');
                const valorInput = document.getElementById('oppValorEstimado');
                const fechaInput = document.getElementById('oppFechaCierre');
                const notasInput = document.getElementById('oppNotas');
                
                try {
                    const probabilidad = probabilidadInput ? parseInt(probabilidadInput.value, 10) : null;
                    const notasBase = notasInput?.value?.trim() || selectedOpportunityData?.notas || '';
                    const updateData = {
                        etapa: stageSelect?.value || 'prospecto',
                        valor_estimado: parseCurrencyValue(valorInput?.value) || 0,
                        fecha_estimada_cierre: fechaInput?.value || null,
                        notas: probabilidad !== null
                            ? mergeOpportunityNotes(notasBase, probabilidad)
                            : (notasBase || null),
                    };
                    
                    const res = await MarketWorld.api.crm.actualizarOportunidad(selectedOpportunity, updateData);
                    
                    if (res.success) {
                        if (MarketWorld.notifications) {
                            MarketWorld.notifications.show('Oportunidad actualizada correctamente', 'success');
                        }
                        loadOpportunitiesFromAPI();
                        updateFunnelSteps();
                    } else {
                        if (MarketWorld.notifications) {
                            MarketWorld.notifications.show(res.message || 'Error al actualizar', 'error');
                        }
                    }
                } catch (err) {
                    console.error('[Save Opportunity] Error:', err);
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show('Error de conexión', 'error');
                    }
                }
            }
        });
    }

    // ======= TAREA 1: Crear Nuevo Cliente =======
    async function showCreateClientModal() {
        const modalHtml = `
            <div class="modal fade" id="createClientModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Nuevo Cliente</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="createClientForm">
                                <div class="mb-3">
                                    <label class="form-label">Nombre Completo / Razón Social</label>
                                    <input type="text" class="form-control" name="nombre" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Tipo Documento</label>
                                    <select class="form-select" name="tipo_documento">
                                        <option value="CC">Cédula de Ciudadanía</option>
                                        <option value="CE">Cédula de Extranjería</option>
                                        <option value="Pasaporte">Pasaporte</option>
                                        <option value="NIT">NIT</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Número de Documento</label>
                                    <input type="text" class="form-control" name="documento" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-control" name="email" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Teléfono</label>
                                    <input type="text" class="form-control" name="telefono">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Dirección</label>
                                    <input type="text" class="form-control" name="direccion">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Ciudad</label>
                                    <input type="text" class="form-control" name="ciudad">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Segmento</label>
                                    <select class="form-select" name="segmento">
                                        <option value="Nuevo">Nuevo</option>
                                        <option value="Frecuente">Frecuente</option>
                                        <option value="Premium">Premium</option>
                                        <option value="Corporativo">Corporativo</option>
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button class="btn btn-primary btn-save-new-client">Crear Cliente</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('createClientModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('createClientModal');
        const bsModal = new bootstrap.Modal(modalEl);
        
        modalEl.querySelector('.btn-save-new-client').addEventListener('click', async () => {
            const form = document.getElementById('createClientForm');
            const data = new FormData(form);
            const clientData = {
                nombre: data.get('nombre'),
                tipo_documento: data.get('tipo_documento'),
                documento: data.get('documento'),
                email: data.get('email'),
                telefono: data.get('telefono') || null,
                direccion: data.get('direccion') || null,
                ciudad: data.get('ciudad') || null,
                segmento: data.get('segmento'),
            };
            
            try {
                if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.customers) {
                    throw new Error('API no disponible');
                }

                const res = await MarketWorld.api.customers.create(clientData);
                if (res.success) {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show('Cliente creado exitosamente', 'success');
                    }
                    bsModal.hide();
                    loadCustomersFromAPI();
                    loadCRMDashboardStats();
                } else {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show(res.message || 'Error al crear cliente', 'error');
                    }
                }
            } catch (err) {
                console.error('[Create Client] Error:', err);
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('Error de conexión', 'error');
                }
            }
        });
        
        modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); });
        bsModal.show();
    }

    // ======= TAREA 2: Editar Cliente =======
    function addEditClientButton() {
        const contentContainer = document.querySelector('.content-container');
        if (!contentContainer) return;
        
        // Evitar agregar botones duplicados
        if (contentContainer.querySelector('.btn-edit-client-submit')) return;
        
        const btnGroup = document.createElement('div');
        btnGroup.className = 'mt-3 d-flex gap-2';
        btnGroup.innerHTML = `
            <button class="btn btn-primary btn-edit-client-submit" type="button">
                <i class="bi bi-save me-2"></i> Guardar Cambios
            </button>
            <button class="btn btn-secondary btn-cancel-edit" type="button">
                <i class="bi bi-x-circle me-2"></i> Cancelar
            </button>
        `;
        
        // Buscar un buen lugar para insertar los botones
        const formEnd = contentContainer.querySelector('textarea') || 
                       contentContainer.querySelector('input:last-of-type');
        if (formEnd && formEnd.parentNode) {
            formEnd.parentNode.parentNode.appendChild(btnGroup);
        } else {
            contentContainer.appendChild(btnGroup);
        }
        
        // Event listener para guardar
        btnGroup.querySelector('.btn-edit-client-submit').addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (!selectedClient) {
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('Selecciona un cliente primero', 'warning');
                }
                return;
            }
            
            const data = {
                nombre: document.getElementById('clienteNombre')?.value,
                tipo_documento: document.getElementById('clienteTipoDocumento')?.value,
                documento: document.getElementById('clienteDocumento')?.value,
                email: document.getElementById('clienteEmail')?.value,
                telefono: document.getElementById('clienteTelefono')?.value,
                direccion: document.getElementById('clienteDireccion')?.value,
                tipo_cliente: document.getElementById('clienteTipo')?.value,
                segmento: document.getElementById('clienteSegmento')?.value,
                limite_credito: parseCurrencyValue(document.getElementById('clienteLimiteCredito')?.value),
                ejecutivo_asignado: document.getElementById('clienteEjecutivo')?.value,
                notas: document.getElementById('clienteNotas')?.value,
            };
            
            // Filtrar campos vacíos
            Object.keys(data).forEach(key => {
                if (data[key] === undefined || data[key] === null || data[key] === '') delete data[key];
            });
            
            try {
                if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.customers) {
                    throw new Error('API no disponible');
                }

                const res = await MarketWorld.api.customers.update(selectedClient, data);
                if (res.success) {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show('Cliente actualizado correctamente', 'success');
                    }
                    loadCustomersFromAPI();
                    loadCRMDashboardStats();
                } else {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show(res.message || 'Error al guardar', 'error');
                    }
                }
            } catch (err) {
                console.error('[Edit Client] Error:', err);
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('Error de conexión', 'error');
                }
            }
        });
        
        // Botón cancelar
        btnGroup.querySelector('.btn-cancel-edit').addEventListener('click', () => {
            if (selectedClient && MarketWorld?.api?.customers) {
                MarketWorld.api.customers.getById(selectedClient)
                    .then(res => {
                        if (res && res.success) {
                            updateClientSheet(res.data);
                        }
                    })
                    .catch(err => console.error('[Edit Client] Error al recargar ficha:', err));
            }
        });
    }

    function initClientNotesSave() {
        const btn = document.getElementById('btnGuardarNotas');
        if (!btn) return;

        btn.addEventListener('click', async (e) => {
            e.preventDefault();

            if (!selectedClient) {
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('Selecciona un cliente primero', 'warning');
                }
                return;
            }

            const notas = document.getElementById('clienteNotas')?.value || '';
            try {
                const res = await MarketWorld.api.customers.update(selectedClient, { notas: notas });
                if (res.success) {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show('Notas guardadas', 'success');
                    }
                } else if (MarketWorld.notifications) {
                    MarketWorld.notifications.show(res.message || 'Error al guardar notas', 'error');
                }
            } catch (err) {
                console.error('[Client Notes] Error:', err);
            }
        });
    }

    // ======= TAREA 3: Segmentos desde API =======
    function initSegmentation() {
        const newSegmentBtn = document.getElementById('crmNewSegmentBtn');
        if (newSegmentBtn) {
            newSegmentBtn.addEventListener('click', showCreateSegmentModal);
        }
        
        initInlineSegmentForm();
        loadSegmentsFromAPI();
    }

    async function loadSegmentsFromAPI() {
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.crm) {
                console.warn('[Segments] API no disponible');
                return;
            }

            const res = await MarketWorld.api.crm.segmentos();
            if (!res.success) {
                console.warn('[Segments] Error:', res.message);
                return;
            }
            
            const container = document.querySelector('#segmentos .row');
            if (!container) {
                console.warn('[Segments] Contenedor no encontrado');
                return;
            }
            
            container.innerHTML = '';
            
            const segmentos = res.data || [];
            if (segmentos.length === 0) {
                container.innerHTML = '<div class="col-12 alert alert-info">No hay segmentos. Crea uno nuevo.</div>';
                return;
            }
            
            segmentos.forEach(seg => {
                const card = document.createElement('div');
                card.className = 'col-md-4 mb-4';
                card.innerHTML = `
                    <div class="card h-100">
                        <div class="card-header bg-light">
                            <h5 class="mb-0">${seg.nombre || 'Sin nombre'}</h5>
                        </div>
                        <div class="card-body">
                            <p class="text-muted small">${seg.descripcion || 'Sin descripción'}</p>
                            <div class="d-flex gap-2 flex-wrap">
                                <button class="btn btn-sm btn-outline-primary btn-view-segment" data-id="${seg.id}">
                                    <i class="bi bi-eye me-1"></i> Ver
                                </button>
                                <button class="btn btn-sm btn-outline-warning btn-edit-segment" data-id="${seg.id}">
                                    <i class="bi bi-pencil me-1"></i> Editar
                                </button>
                                <button class="btn btn-sm btn-outline-danger btn-delete-segment" data-id="${seg.id}">
                                    <i class="bi bi-trash me-1"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
            
            attachSegmentEventListeners();
        } catch (err) {
            console.error('[Segments] Error:', err);
            if (MarketWorld.notifications) {
                MarketWorld.notifications.show('Error al cargar segmentos', 'error');
            }
        }
    }

    function attachSegmentEventListeners() {
        document.querySelectorAll('.btn-view-segment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = e.target.closest('.card');
                const nombre = card?.querySelector('h5')?.textContent || '';
                applySegmentQuickFilter(nombre);
            });
        });

        // Botones eliminar
        document.querySelectorAll('.btn-delete-segment').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = e.target.closest('[data-id]').dataset.id;
                if (confirm('¿Estás seguro de eliminar este segmento?')) {
                    try {
                        if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.crm) {
                            throw new Error('API no disponible');
                        }

                        const res = await MarketWorld.api.crm.eliminarSegmento(id);
                        if (res.success) {
                            if (MarketWorld.notifications) {
                                MarketWorld.notifications.show('Segmento eliminado', 'success');
                            }
                            loadSegmentsFromAPI();
                        } else {
                            if (MarketWorld.notifications) {
                                MarketWorld.notifications.show(res.message || 'Error', 'error');
                            }
                        }
                    } catch (err) {
                        console.error('[Delete Segment] Error:', err);
                    }
                }
            });
        });
        
        // Botones editar
        document.querySelectorAll('.btn-edit-segment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.target.closest('[data-id]').dataset.id;
                const card = e.target.closest('.card');
                const nombre = card.querySelector('h5').textContent;
                showEditSegmentModal(id, nombre);
            });
        });
    }

    function initInlineSegmentForm() {
        const addCriteriaBtn = document.getElementById('btnAgregarCriterio');
        if (addCriteriaBtn) {
            addCriteriaBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const container = addCriteriaBtn.closest('.border');
                const row = container?.querySelector('.row');
                if (!row) return;

                const clone = row.cloneNode(true);
                clone.querySelectorAll('input').forEach(input => { input.value = ''; });
                container.insertBefore(clone, addCriteriaBtn);
            });
        }

        const saveSegmentBtn = document.getElementById('btnGuardarSegmento');
        if (saveSegmentBtn) {
            saveSegmentBtn.addEventListener('click', async (e) => {
                e.preventDefault();

                const nombre = document.getElementById('segmentNombre')?.value?.trim();
                if (!nombre) {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show('Ingresa un nombre para el segmento.', 'warning');
                    }
                    return;
                }

                const descripcion = document.getElementById('segmentDescripcion')?.value || null;
                const criterios = [];

                document.querySelectorAll('[data-criterio-field]').forEach((field, idx) => {
                    const operator = document.querySelectorAll('[data-criterio-operator]')[idx];
                    const value = document.querySelectorAll('[data-criterio-value]')[idx];
                    if (!field || !operator || !value) return;
                    if (!value.value.trim()) return;

                    criterios.push({
                        campo: field.value,
                        operador: operator.value,
                        valor: value.value.trim(),
                    });
                });

                try {
                    if (!MarketWorld?.api?.crm) {
                        console.warn('[CRM] API no disponible para segmentos');
                        return;
                    }
                    const payload = {
                        nombre: nombre,
                        descripcion: descripcion,
                    };

                    if (criterios.length > 0) {
                        payload.criterios = JSON.stringify(criterios);
                    }

                    const res = await MarketWorld.api.crm.crearSegmento(payload);
                    if (res.success) {
                        if (MarketWorld.notifications) {
                            MarketWorld.notifications.show('Segmento creado', 'success');
                        }
                        loadSegmentsFromAPI();
                    } else if (MarketWorld.notifications) {
                        MarketWorld.notifications.show(res.message || 'Error al crear segmento', 'error');
                    }
                } catch (err) {
                    console.error('[Create Segment Inline] Error:', err);
                }
            });
        }
    }

    function applySegmentQuickFilter(nombreSegmento) {
        const normalized = nombreSegmento.toLowerCase();
        let applied = true;

        crmCustomerListState.page = 1;
        crmCustomerListState.segmento = '';
        crmCustomerListState.estado = '';

        if (normalized.includes('premium')) {
            crmCustomerListState.segmento = 'Premium';
        } else if (normalized.includes('frecuente')) {
            crmCustomerListState.segmento = 'Frecuente';
        } else if (normalized.includes('inactivo')) {
            crmCustomerListState.estado = 'Inactivo';
        } else if (normalized.includes('corporativo')) {
            crmCustomerListState.segmento = 'Corporativo';
        } else if (normalized.includes('nuevo')) {
            crmCustomerListState.segmento = 'Nuevo';
        } else {
            applied = false;
        }

        if (!applied) {
            if (MarketWorld.notifications) {
                MarketWorld.notifications.show('Este segmento no tiene filtro automático. Usa los filtros manuales.', 'info');
            }
            return;
        }

        const tabLink = document.querySelector('a[href="#clientes"]');
        if (tabLink) {
            bootstrap.Tab.getOrCreateInstance(tabLink).show();
        }
        loadCustomersFromAPI();
    }

    function showCreateSegmentModal() {
        const modalHtml = `
            <div class="modal fade" id="createSegmentModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Nuevo Segmento</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="createSegmentForm">
                                <div class="mb-3">
                                    <label class="form-label">Nombre del Segmento</label>
                                    <input type="text" class="form-control" name="nombre" placeholder="Ej: Clientes Premium" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Descripción</label>
                                    <textarea class="form-control" name="descripcion" rows="3" placeholder="Criterios o características..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button class="btn btn-primary btn-save-segment">Crear Segmento</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('createSegmentModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('createSegmentModal');
        const bsModal = new bootstrap.Modal(modalEl);
        
        modalEl.querySelector('.btn-save-segment').addEventListener('click', async () => {
            const form = document.getElementById('createSegmentForm');
            const data = {
                nombre: form.nombre.value,
                descripcion: form.descripcion.value || null,
            };
            
            try {
                if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.crm) {
                    throw new Error('API no disponible');
                }

                const res = await MarketWorld.api.crm.crearSegmento(data);
                if (res.success) {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show('Segmento creado', 'success');
                    }
                    bsModal.hide();
                    loadSegmentsFromAPI();
                } else {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show(res.message || 'Error', 'error');
                    }
                }
            } catch (err) {
                console.error('[Create Segment] Error:', err);
            }
        });
        
        modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); });
        bsModal.show();
    }

    function showEditSegmentModal(segmentId, segmentName) {
        const modalHtml = `
            <div class="modal fade" id="editSegmentModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Editar: ${segmentName}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editSegmentForm">
                                <div class="mb-3">
                                    <label class="form-label">Nombre</label>
                                    <input type="text" class="form-control" name="nombre" value="${segmentName}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Descripción</label>
                                    <textarea class="form-control" name="descripcion" rows="3" placeholder="Criterios o características..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button class="btn btn-primary btn-save-edit-segment">Guardar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('editSegmentModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('editSegmentModal');
        const bsModal = new bootstrap.Modal(modalEl);
        
        modalEl.querySelector('.btn-save-edit-segment').addEventListener('click', async () => {
            const form = document.getElementById('editSegmentForm');
            const data = {
                nombre: form.nombre.value,
                descripcion: form.descripcion.value || null,
            };
            
            try {
                if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.crm) {
                    throw new Error('API no disponible');
                }

                const res = await MarketWorld.api.crm.actualizarSegmento(segmentId, data);
                if (res.success) {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show('Segmento actualizado', 'success');
                    }
                    bsModal.hide();
                    loadSegmentsFromAPI();
                } else {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show(res.message || 'Error', 'error');
                    }
                }
            } catch (err) {
                console.error('[Edit Segment] Error:', err);
            }
        });
        
        modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); });
        bsModal.show();
    }

    // ======= TAREA 4: Campañas desde API =======
    function initCampaigns() {
        const newCampaignBtn = document.getElementById('crmNewCampaignBtn');
        if (newCampaignBtn) {
            newCampaignBtn.addEventListener('click', showCreateCampaignModal);
        }
        
        initInlineCampaignForm();
        loadCampaignSegmentsSelect();
        loadCampaignsFromAPI();
    }

    async function loadCampaignsFromAPI() {
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.crm) {
                console.warn('[Campaigns] API no disponible');
                return;
            }

            const res = await MarketWorld.api.crm.campanas();
            if (!res.success) {
                return;
            }
            
            const tbody = document.querySelector('#campanas .data-table tbody');
            if (!tbody) {
                console.warn('[Campaigns] Tabla no encontrada');
                return;
            }
            
            tbody.innerHTML = '';
            
            const campanas = res.data || [];
            if (campanas.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No hay campañas. Crea una nueva.</td></tr>';
                return;
            }
            
            campanas.forEach(camp => {
                const tr = document.createElement('tr');
                const tasaRespuesta = camp.contactados > 0
                    ? Math.round(((camp.respuestas || 0) / camp.contactados) * 100)
                    : 0;
                const segmentName = camp.segment?.nombre || 'Todos';
                const segmentId = camp.segment?.id || '';
                
                tr.innerHTML = `
                    <td>${camp.nombre || 'Sin nombre'}</td>
                    <td><span class="badge bg-success">${camp.canal || 'Email'}</span></td>
                    <td>${segmentName}</td>
                    <td><span class="badge ${camp.estado === 'Activa' ? 'bg-success' : 'bg-warning'}">${camp.estado || 'Pendiente'}</span></td>
                    <td>${camp.fecha_inicio || 'N/A'}</td>
                    <td>${camp.fecha_fin || 'N/A'}</td>
                    <td>${camp.contactados || 0}</td>
                    <td>
                        <div class="progress" style="height: 10px;">
                            <div class="progress-bar bg-success" role="progressbar" style="width: ${tasaRespuesta}%;"></div>
                        </div>
                        <div class="small text-center">${tasaRespuesta}%</div>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary btn-view-campaign" data-id="${camp.id}" data-name="${camp.nombre || ''}" data-canal="${camp.canal || ''}" data-segment-id="${segmentId}" data-segment-name="${segmentName}" data-fecha-inicio="${camp.fecha_inicio || ''}" data-fecha-fin="${camp.fecha_fin || ''}" data-estado="${camp.estado || ''}" data-descripcion="${camp.descripcion || ''}">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning btn-edit-campaign" data-id="${camp.id}" data-name="${camp.nombre || ''}" data-canal="${camp.canal || ''}" data-segment-id="${segmentId}" data-segment-name="${segmentName}" data-fecha-inicio="${camp.fecha_inicio || ''}" data-fecha-fin="${camp.fecha_fin || ''}" data-estado="${camp.estado || ''}" data-descripcion="${camp.descripcion || ''}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete-campaign" data-id="${camp.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            
            attachCampaignEventListeners();
        } catch (err) {
            console.error('[Campaigns] Error:', err);
            if (MarketWorld.notifications) {
                MarketWorld.notifications.show('Error al cargar campañas', 'error');
            }
        }
    }

    function attachCampaignEventListeners() {
        document.querySelectorAll('.btn-view-campaign').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const campaign = getCampaignFromButton(btn);
                showCampaignDetailModal(campaign);
            });
        });

        document.querySelectorAll('.btn-edit-campaign').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const campaign = getCampaignFromButton(btn);
                showEditCampaignModal(campaign);
            });
        });

        document.querySelectorAll('.btn-delete-campaign').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = e.target.closest('[data-id]').dataset.id;
                if (confirm('¿Estás seguro de eliminar esta campaña?')) {
                    try {
                        if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.crm) {
                            throw new Error('API no disponible');
                        }

                        const res = await MarketWorld.api.crm.eliminarCampana(id);
                        if (res.success) {
                            if (MarketWorld.notifications) {
                                MarketWorld.notifications.show('Campaña eliminada', 'success');
                            }
                            loadCampaignsFromAPI();
                        } else {
                            if (MarketWorld.notifications) {
                                MarketWorld.notifications.show(res.message || 'Error', 'error');
                            }
                        }
                    } catch (err) {
                        console.error('[Delete Campaign] Error:', err);
                    }
                }
            });
        });
    }

    function getCampaignFromButton(btn) {
        return {
            id: btn.dataset.id,
            nombre: btn.dataset.name,
            canal: btn.dataset.canal,
            segment_id: btn.dataset.segmentId || null,
            segment_name: btn.dataset.segmentName || null,
            fecha_inicio: btn.dataset.fechaInicio || null,
            fecha_fin: btn.dataset.fechaFin || null,
            estado: btn.dataset.estado || null,
            descripcion: btn.dataset.descripcion || null,
        };
    }

    function showCampaignDetailModal(campaign) {
        if (!campaign || !campaign.id) {
            if (MarketWorld.notifications) {
                MarketWorld.notifications.show('Campaña no disponible.', 'warning');
            }
            return;
        }

        const modalHtml = `
            <div class="modal fade" id="campaignDetailModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Campaña: ${campaign.nombre || ''}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p><strong>Canal:</strong> ${campaign.canal || 'N/A'}</p>
                            <p><strong>Segmento:</strong> ${campaign.segment_name || 'N/A'}</p>
                            <p><strong>Estado:</strong> ${campaign.estado || 'N/A'}</p>
                            <p><strong>Inicio:</strong> ${campaign.fecha_inicio || 'N/A'}</p>
                            <p><strong>Fin:</strong> ${campaign.fecha_fin || 'N/A'}</p>
                            <p><strong>Descripción:</strong> ${campaign.descripcion || 'Sin descripción'}</p>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('campaignDetailModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('campaignDetailModal');
        const bsModal = new bootstrap.Modal(modalEl);
        modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); });
        bsModal.show();
    }

    function showEditCampaignModal(campaign) {
        if (!campaign || !campaign.id) {
            if (MarketWorld.notifications) {
                MarketWorld.notifications.show('Campaña no disponible.', 'warning');
            }
            return;
        }

        const modalHtml = `
            <div class="modal fade" id="campaignEditModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Editar Campaña</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editCampaignForm">
                                <div class="mb-3">
                                    <label class="form-label">Nombre</label>
                                    <input type="text" class="form-control" name="nombre" value="${campaign.nombre || ''}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Canal</label>
                                    <select class="form-select" name="canal">
                                        <option value="Email">Email</option>
                                        <option value="WhatsApp">WhatsApp</option>
                                        <option value="SMS">SMS</option>
                                        <option value="Llamada">Llamada</option>
                                        <option value="Presencial">Presencial</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Segmento</label>
                                    <select class="form-select" name="segment_id">
                                        <option value="">Sin segmento</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Fecha Inicio</label>
                                    <input type="date" class="form-control" name="fecha_inicio" value="${campaign.fecha_inicio || ''}">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Fecha Fin</label>
                                    <input type="date" class="form-control" name="fecha_fin" value="${campaign.fecha_fin || ''}">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Descripción</label>
                                    <textarea class="form-control" name="descripcion" rows="3">${campaign.descripcion || ''}</textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button class="btn btn-primary btn-save-edit-campaign">Guardar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('campaignEditModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('campaignEditModal');
        const bsModal = new bootstrap.Modal(modalEl);

        loadSegmentsIntoSelect(modalEl, campaign.segment_id);

        const form = modalEl.querySelector('#editCampaignForm');
        if (form && campaign.canal) {
            form.canal.value = campaign.canal;
        }

        modalEl.querySelector('.btn-save-edit-campaign').addEventListener('click', async () => {
            const data = {
                nombre: form.nombre.value,
                canal: form.canal.value,
                segment_id: form.segment_id.value || null,
                fecha_inicio: form.fecha_inicio.value || null,
                fecha_fin: form.fecha_fin.value || null,
                descripcion: form.descripcion.value || null,
            };

            try {
                const res = await MarketWorld.api.crm.actualizarCampana(campaign.id, data);
                if (res.success) {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show('Campaña actualizada', 'success');
                    }
                    bsModal.hide();
                    loadCampaignsFromAPI();
                } else if (MarketWorld.notifications) {
                    MarketWorld.notifications.show(res.message || 'Error al actualizar campaña', 'error');
                }
            } catch (err) {
                console.error('[Edit Campaign] Error:', err);
            }
        });

        modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); });
        bsModal.show();
    }

    function showCreateCampaignModal() {
        const modalHtml = `
            <div class="modal fade" id="createCampaignModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Nueva Campaña</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="createCampaignForm">
                                <div class="mb-3">
                                    <label class="form-label">Nombre de la Campaña</label>
                                    <input type="text" class="form-control" name="nombre" placeholder="Ej: Oferta Verano 2025" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Canal</label>
                                    <select class="form-select" name="canal">
                                        <option value="Email">Email</option>
                                        <option value="WhatsApp">WhatsApp</option>
                                        <option value="SMS">SMS</option>
                                        <option value="Llamada">Llamada</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Segmento Target</label>
                                    <select class="form-select" name="segment_id">
                                        <option value="">Todos los clientes</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Fecha Inicio</label>
                                    <input type="date" class="form-control" name="fecha_inicio" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Fecha Fin</label>
                                    <input type="date" class="form-control" name="fecha_fin" required>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button class="btn btn-primary btn-save-campaign">Crear Campaña</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const existingModal = document.getElementById('createCampaignModal');
        if (existingModal) existingModal.remove();
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('createCampaignModal');
        const bsModal = new bootstrap.Modal(modalEl);

        loadSegmentsIntoSelect(modalEl);
        
        modalEl.querySelector('.btn-save-campaign').addEventListener('click', async () => {
            const form = document.getElementById('createCampaignForm');
            const data = {
                nombre: form.nombre.value,
                canal: form.canal.value,
                segment_id: form.segment_id.value || null,
                fecha_inicio: form.fecha_inicio.value,
                fecha_fin: form.fecha_fin.value || null,
                estado: 'Pendiente',
            };
            
            try {
                if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.crm) {
                    throw new Error('API no disponible');
                }

                const res = await MarketWorld.api.crm.crearCampana(data);
                if (res.success) {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show('Campaña creada', 'success');
                    }
                    bsModal.hide();
                    loadCampaignsFromAPI();
                } else {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show(res.message || 'Error', 'error');
                    }
                }
            } catch (err) {
                console.error('[Create Campaign] Error:', err);
            }
        });
        
        modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); });
        bsModal.show();
    }

    function loadSegmentsIntoSelect(container, selectedId) {
        const select = container.querySelector('select[name="segment_id"]');
        if (!select) return;

        const keepFirst = select.options.length > 0 ? select.options[0].cloneNode(true) : null;
        select.innerHTML = '';
        if (keepFirst) select.appendChild(keepFirst);

        if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.crm) return;

        MarketWorld.api.crm.segmentos().then(res => {
            if (!res.success) return;
            (res.data || []).forEach(seg => {
                const option = document.createElement('option');
                option.value = seg.id;
                option.textContent = seg.nombre || 'Sin nombre';
                if (selectedId && String(seg.id) === String(selectedId)) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }).catch(err => console.warn('[Segments Select] Error:', err));
    }

    function loadCampaignSegmentsSelect() {
        const select = document.getElementById('campaignSegmento');
        if (!select) return;

        select.innerHTML = '<option value="">Selecciona un segmento...</option>';
        if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.crm) return;

        MarketWorld.api.crm.segmentos().then(res => {
            if (!res.success) return;
            (res.data || []).forEach(seg => {
                const option = document.createElement('option');
                option.value = seg.id;
                option.textContent = seg.nombre || 'Sin nombre';
                select.appendChild(option);
            });
        }).catch(err => console.warn('[Campaign Segments] Error:', err));
    }

    function initInlineCampaignForm() {
        const btn = document.getElementById('btnProgramarCampana');
        if (!btn) return;

        btn.addEventListener('click', async (e) => {
            e.preventDefault();

            if (!MarketWorld?.api?.crm) {
                console.warn('[CRM] API no disponible para campañas');
                return;
            }

            const nombre = document.getElementById('campaignNombre')?.value?.trim();
            const asunto = document.getElementById('campaignAsunto')?.value?.trim();
            const contenido = document.getElementById('campaignContenido')?.value?.trim();
            const fechaInicio = document.getElementById('campaignFechaInicio')?.value;
            const fechaFin = document.getElementById('campaignFechaFin')?.value || null;
            const segmentId = document.getElementById('campaignSegmento')?.value || null;

            if (!nombre) {
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('Ingresa el nombre de la campaña.', 'warning');
                }
                return;
            }

            if (!fechaInicio) {
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('Selecciona la fecha de inicio.', 'warning');
                }
                return;
            }

            if (fechaFin && fechaFin < fechaInicio) {
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('La fecha fin no puede ser anterior a la fecha de inicio.', 'warning');
                }
                return;
            }

            const canales = [];
            if (document.getElementById('campaignEmail')?.checked) canales.push('Email');
            if (document.getElementById('campaignWhatsapp')?.checked) canales.push('WhatsApp');
            if (document.getElementById('campaignSms')?.checked) canales.push('SMS');

            if (canales.length === 0) {
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('Selecciona al menos un canal.', 'warning');
                }
                return;
            }

            const canal = canales[0];
            if (canales.length > 1 && MarketWorld.notifications) {
                MarketWorld.notifications.show('Solo se registrará el primer canal seleccionado.', 'info');
            }

            const descripcion = [asunto, contenido].filter(Boolean).join(' - ') || null;

            try {
                const res = await MarketWorld.api.crm.crearCampana({
                    nombre: nombre,
                    descripcion: descripcion,
                    canal: canal,
                    segment_id: segmentId || null,
                    fecha_inicio: fechaInicio,
                    fecha_fin: fechaFin,
                    estado: 'Pendiente',
                });

                if (res.success) {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show('Campaña programada', 'success');
                    }
                    document.getElementById('campaignNombre').value = '';
                    document.getElementById('campaignAsunto').value = '';
                    document.getElementById('campaignContenido').value = '';
                    document.getElementById('campaignFechaInicio').value = '';
                    document.getElementById('campaignFechaFin').value = '';
                    const campaignSegmentSelect = document.getElementById('campaignSegmento');
                    if (campaignSegmentSelect) campaignSegmentSelect.value = '';
                    const campaignEmail = document.getElementById('campaignEmail');
                    const campaignWhatsapp = document.getElementById('campaignWhatsapp');
                    const campaignSms = document.getElementById('campaignSms');
                    if (campaignEmail) campaignEmail.checked = true;
                    if (campaignWhatsapp) campaignWhatsapp.checked = false;
                    if (campaignSms) campaignSms.checked = false;
                    loadCampaignsFromAPI();
                } else if (MarketWorld.notifications) {
                    MarketWorld.notifications.show(res.message || 'Error al programar campaña', 'error');
                }
            } catch (err) {
                console.error('[Create Campaign Inline] Error:', err);
            }
        });
    }

    // ======= TAREA 5: Agendar Actividades =======
    function initActivities() {
        const activitiesTab = document.querySelector('a[data-bs-target="#actividades"]');
        if (activitiesTab) {
            activitiesTab.addEventListener('click', () => {
                loadActivitiesFromAPI();
            });
        }

        const newActivityBtn = document.querySelector('#actividades .btn-primary');
        if (newActivityBtn && newActivityBtn.textContent.includes('Nueva Actividad')) {
            newActivityBtn.addEventListener('click', showCreateActivityModal);
        }
    }

    async function loadActivitiesFromAPI() {
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.crm) {
                console.warn('[Activities] API no disponible');
                return;
            }

            const res = await MarketWorld.api.crm.actividades({ per_page: 200 });
            if (!res.success) {
                console.warn('[Activities] Error:', res.message);
                return;
            }

            const tbody = document.querySelector('#actividades .data-table tbody');
            if (!tbody) {
                console.warn('[Activities] Tabla no encontrada');
                return;
            }

            tbody.innerHTML = '';
            const actividades = res.data || [];

            if (actividades.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay actividades. Crea una nueva.</td></tr>';
                return;
            }

            actividades.forEach(act => {
                const tr = document.createElement('tr');
                const estado_clase = {
                    'Pendiente': 'bg-warning',
                    'En Progreso': 'bg-info',
                    'Completada': 'bg-success',
                    'Cancelada': 'bg-danger'
                }[act.estado] || 'bg-secondary';

                tr.innerHTML = `
                    <td>${act.titulo || 'Sin título'}</td>
                    <td>${act.customer?.nombre || 'N/A'}</td>
                    <td><span class="badge bg-primary">${act.tipo || 'Llamada'}</span></td>
                    <td><span class="badge ${estado_clase}">${act.estado || 'Pendiente'}</span></td>
                    <td>${new Date(act.fecha_programada).toLocaleDateString('es-ES')}</td>
                    <td>${act.user?.nombre || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary btn-view-activity" title="Ver actividad" aria-label="Ver actividad" data-id="${act.id}" data-titulo="${act.titulo || ''}" data-cliente="${act.customer?.nombre || 'N/A'}" data-tipo="${act.tipo || 'Llamada'}" data-estado="${act.estado || 'Pendiente'}" data-fecha="${act.fecha_programada || ''}" data-descripcion="${act.descripcion || ''}" data-notas="${act.notas || ''}" data-opportunity-id="${act.opportunity_id || ''}">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-warning btn-edit-activity" title="Editar actividad" aria-label="Editar actividad" data-id="${act.id}" data-titulo="${act.titulo || ''}" data-cliente="${act.customer?.nombre || 'N/A'}" data-tipo="${act.tipo || 'Llamada'}" data-estado="${act.estado || 'Pendiente'}" data-fecha="${act.fecha_programada || ''}" data-descripcion="${act.descripcion || ''}" data-notas="${act.notas || ''}" data-opportunity-id="${act.opportunity_id || ''}">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success btn-complete-activity" title="Marcar como completada" aria-label="Marcar como completada" data-id="${act.id}" data-opportunity-id="${act.opportunity_id || ''}">
                            <i class="bi bi-check-circle"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete-activity" title="Eliminar actividad" aria-label="Eliminar actividad" data-id="${act.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            attachActivityEventListeners();
        } catch (err) {
            console.error('[Activities] Error:', err);
        }
    }

    function attachActivityEventListeners() {
        document.querySelectorAll('.btn-delete-activity').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = e.target.closest('[data-id]').dataset.id;
                if (confirm('¿Estás seguro de eliminar esta actividad?')) {
                    try {
                        const res = await MarketWorld.api.crm.eliminarActividad(id);
                        if (res.success) {
                            if (MarketWorld.notifications) {
                                MarketWorld.notifications.show('Actividad eliminada', 'success');
                            }
                            await refreshActivityViews();
                        }
                    } catch (err) {
                        console.error('[Delete Activity] Error:', err);
                    }
                }
            });
        });

        document.querySelectorAll('.btn-view-activity').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const btn = e.currentTarget;
                const fecha = btn.dataset.fecha ? new Date(btn.dataset.fecha).toLocaleString('es-ES') : 'N/A';

                showCenteredFeedbackModal(`
                    <div class="text-start">
                        <p class="mb-2"><strong>Título:</strong> ${btn.dataset.titulo || 'N/A'}</p>
                        <p class="mb-2"><strong>Cliente:</strong> ${btn.dataset.cliente || 'N/A'}</p>
                        <p class="mb-2"><strong>Tipo:</strong> ${btn.dataset.tipo || 'N/A'}</p>
                        <p class="mb-2"><strong>Estado:</strong> ${btn.dataset.estado || 'Pendiente'}</p>
                        <p class="mb-2"><strong>Fecha programada:</strong> ${fecha}</p>
                        <p class="mb-0"><strong>Descripción:</strong> ${btn.dataset.descripcion || 'Sin descripción'}</p>
                    </div>
                `, 'info');
            });
        });

        document.querySelectorAll('.btn-edit-activity').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const activity = {
                    id: btn.dataset.id,
                    titulo: btn.dataset.titulo || '',
                    cliente: btn.dataset.cliente || 'N/A',
                    tipo: btn.dataset.tipo || 'Llamada',
                    estado: btn.dataset.estado || 'Pendiente',
                    fecha_programada: btn.dataset.fecha || '',
                    descripcion: btn.dataset.descripcion || '',
                    notas: btn.dataset.notas || '',
                        opportunity_id: btn.dataset.opportunityId || '',
                };
                showEditActivityModal(activity);
            });
        });

        document.querySelectorAll('.btn-complete-activity').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const target = e.currentTarget || e.target.closest('[data-id]');
                const id = target?.dataset?.id;
                const opportunityId = target?.dataset?.opportunityId || '';
                try {
                    const res = await MarketWorld.api.crm.actualizarActividad(id, {
                        estado: 'Completada',
                        fecha_completada: new Date().toISOString(),
                    });
                    if (res.success) {
                        if (MarketWorld.notifications) {
                            MarketWorld.notifications.show('Actividad completada', 'success');
                        }
                        await loadActivitiesFromAPI();
                        if (opportunityId) {
                            await loadOpportunityActivities(opportunityId);
                        } else if (selectedOpportunityData?.id) {
                            await loadOpportunityActivities(selectedOpportunityData.id);
                        }
                    }
                } catch (err) {
                    console.error('[Complete Activity] Error:', err);
                }
            });
        });
    }

    async function showCreateActivityModal() {
        const modalHtml = `
            <div class="modal fade" id="createActivityModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Nueva Actividad</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="createActivityForm">
                                <div class="mb-3">
                                    <label class="form-label">Título</label>
                                    <input type="text" class="form-control" name="titulo" placeholder="Ej: Llamada de seguimiento" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Cliente</label>
                                    <select class="form-select" name="customer_id" required>
                                        <option value="">Selecciona un cliente...</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Oportunidad (opcional)</label>
                                    <select class="form-select" name="opportunity_id">
                                        <option value="">Sin oportunidad vinculada</option>
                                    </select>
                                    <small class="text-muted">Selecciona una oportunidad si esta actividad debe aparecer en su seguimiento.</small>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Tipo de Actividad</label>
                                    <select class="form-select" name="tipo">
                                        <option value="Llamada">Llamada</option>
                                        <option value="Email">Email</option>
                                        <option value="Reunión">Reunión</option>
                                        <option value="Seguimiento">Seguimiento</option>
                                        <option value="Propuesta">Propuesta</option>
                                        <option value="Otra">Otra</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Fecha y Hora</label>
                                    <input type="datetime-local" class="form-control" name="fecha_programada" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Estado</label>
                                    <select class="form-select" name="estado">
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="En Progreso">En Progreso</option>
                                        <option value="Completada">Completada</option>
                                        <option value="Cancelada">Cancelada</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Descripción</label>
                                    <textarea class="form-control" name="descripcion" rows="3" placeholder="Notas sobre la actividad..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button class="btn btn-primary btn-save-activity">Crear Actividad</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('createActivityModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('createActivityModal');
        const bsModal = new bootstrap.Modal(modalEl);

        // Cargar clientes en el select
        loadCustomersIntoSelect(modalEl);
        await loadOpportunitiesIntoSelect(modalEl, { selectedId: selectedOpportunityData?.id });

        modalEl.querySelector('.btn-save-activity').addEventListener('click', async () => {
            const form = document.getElementById('createActivityForm');
            const data = {
                titulo: form.titulo.value,
                descripcion: form.descripcion.value || null,
                tipo: form.tipo.value,
                estado: form.estado.value || 'Pendiente',
                fecha_programada: formatDateTimeForApi(form.fecha_programada.value),
                customer_id: parseInt(form.customer_id.value),
                opportunity_id: form.opportunity_id.value ? parseInt(form.opportunity_id.value) : null,
            };

            if (!data.customer_id) {
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('Selecciona un cliente válido.', 'warning');
                }
                return;
            }

            if (!data.fecha_programada) {
                if (MarketWorld.notifications) {
                    MarketWorld.notifications.show('Selecciona fecha y hora válidas.', 'warning');
                }
                return;
            }

            try {
                if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.crm) {
                    throw new Error('API no disponible');
                }

                const res = await MarketWorld.api.crm.crearActividad(data);
                if (res.success) {
                    lastCreatedActivityId = res.data?.id || null;
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show('Actividad creada', 'success');
                    }
                    bsModal.hide();
                    await loadActivitiesFromAPI();
                    // Refrescar el timeline de la oportunidad seleccionada en el formulario
                    if (data.opportunity_id) {
                        await loadOpportunityActivities(data.opportunity_id);
                    } else if (selectedOpportunityData?.id) {
                        // Si no hay oportunidad seleccionada, refrescar la seleccionada actualmente
                        await loadOpportunityActivities(selectedOpportunityData.id);
                    }
                } else {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show(res.message || 'Error', 'error');
                    }
                }
            } catch (err) {
                console.error('[Create Activity] Error:', err);
            }
        });

        modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); });
        bsModal.show();
    }

    async function showEditActivityModal(activity) {
        const formatForInput = formatDateTimeForInput(activity.fecha_programada);
        const modalHtml = `
            <div class="modal fade" id="editActivityModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Editar Actividad</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editActivityForm">
                                <div class="mb-3">
                                    <label class="form-label">Cliente</label>
                                    <input type="text" class="form-control" value="${activity.cliente || 'N/A'}" readonly>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Título</label>
                                    <input type="text" class="form-control" name="titulo" value="${activity.titulo || ''}" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Tipo de Actividad</label>
                                    <select class="form-select" name="tipo">
                                        <option value="Llamada" ${activity.tipo === 'Llamada' ? 'selected' : ''}>Llamada</option>
                                        <option value="Email" ${activity.tipo === 'Email' ? 'selected' : ''}>Email</option>
                                        <option value="Reunión" ${activity.tipo === 'Reunión' ? 'selected' : ''}>Reunión</option>
                                        <option value="Seguimiento" ${activity.tipo === 'Seguimiento' ? 'selected' : ''}>Seguimiento</option>
                                        <option value="Propuesta" ${activity.tipo === 'Propuesta' ? 'selected' : ''}>Propuesta</option>
                                        <option value="Otra" ${activity.tipo === 'Otra' ? 'selected' : ''}>Otra</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Estado</label>
                                    <select class="form-select" name="estado">
                                        <option value="Pendiente" ${activity.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                                        <option value="En Progreso" ${activity.estado === 'En Progreso' ? 'selected' : ''}>En Progreso</option>
                                        <option value="Completada" ${activity.estado === 'Completada' ? 'selected' : ''}>Completada</option>
                                        <option value="Cancelada" ${activity.estado === 'Cancelada' ? 'selected' : ''}>Cancelada</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Oportunidad vinculada</label>
                                    <select class="form-select" name="opportunity_id">
                                        <option value="">Sin oportunidad vinculada</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Fecha y Hora</label>
                                    <input type="datetime-local" class="form-control" name="fecha_programada" value="${formatForInput || ''}">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Descripción</label>
                                    <textarea class="form-control" name="descripcion" rows="3">${activity.descripcion || ''}</textarea>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Notas</label>
                                    <textarea class="form-control" name="notas" rows="3">${activity.notas || ''}</textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button class="btn btn-primary btn-update-activity" data-activity-id="${activity.id}">Guardar Cambios</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('editActivityModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('editActivityModal');
        const bsModal = new bootstrap.Modal(modalEl);

        await loadOpportunitiesIntoSelect(modalEl, { selectedId: activity.opportunity_id || selectedOpportunityData?.id });

        modalEl.querySelector('.btn-update-activity').addEventListener('click', async () => {
            const form = document.getElementById('editActivityForm');
            const newOpportunityId = form.opportunity_id.value ? parseInt(form.opportunity_id.value) : null;
            const data = {
                titulo: form.titulo.value,
                tipo: form.tipo.value,
                estado: form.estado.value,
                fecha_programada: formatDateTimeForApi(form.fecha_programada.value),
                descripcion: form.descripcion.value || null,
                notas: form.notas.value || null,
                opportunity_id: newOpportunityId,
            };

            try {
                const res = await MarketWorld.api.crm.actualizarActividad(activity.id, data);
                if (res.success) {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show('Actividad actualizada', 'success');
                    }
                    bsModal.hide();
                    await loadActivitiesFromAPI();
                    // Refrescar el timeline de la oportunidad seleccionada en el formulario
                    if (newOpportunityId) {
                        await loadOpportunityActivities(newOpportunityId);
                    } else if (selectedOpportunityData?.id) {
                        // Si no hay oportunidad seleccionada, refrescar la seleccionada actualmente
                        await loadOpportunityActivities(selectedOpportunityData.id);
                    }
                } else if (MarketWorld.notifications) {
                    MarketWorld.notifications.show(res.message || 'Error al actualizar actividad', 'error');
                }
            } catch (err) {
                console.error('[Edit Activity] Error:', err);
            }
        });

        modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); });
        bsModal.show();
    }

    async function loadCustomersIntoSelect(container, options = {}) {
        const select = container.querySelector('select[name="customer_id"]');
        if (!select) return;

        const selectedId = options.selectedId ? String(options.selectedId) : null;

        if (select.options.length > 1) {
            Array.from(select.options)
                .slice(1)
                .forEach(option => option.remove());
        }

        // Intentar cargar clientes desde la API (fuente de verdad)
        try {
            if (typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.customers) {
                const res = await MarketWorld.api.customers.getAll({ per_page: 200 });
                const items = (res && res.data) || [];
                items.forEach(c => {
                    const option = document.createElement('option');
                    option.value = c.id;
                    option.textContent = c.nombre || (c.razon_social || 'Cliente');
                    if (selectedId && String(c.id) === selectedId) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
                return;
            }
        } catch (err) {
            console.warn('[loadCustomersIntoSelect] Error cargando desde API, fallback al DOM:', err);
        }

        // Fallback: leer tarjetas ya renderizadas en el DOM
        const cardElements = document.querySelectorAll('.client-card');
        cardElements.forEach(card => {
            const id = card.getAttribute('data-client-id');
            const nombre = card.querySelector('h5')?.textContent || 'Cliente';
            const option = document.createElement('option');
            option.value = id;
            option.textContent = nombre;
            if (selectedId && String(id) === selectedId) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    async function loadOpportunitiesIntoSelect(container, options = {}) {
        const select = container.querySelector('select[name="opportunity_id"]');
        if (!select) return;

        const selectedId = options.selectedId ? String(options.selectedId) : null;

        try {
            if (typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.crm) {
                const res = await MarketWorld.api.crm.oportunidades({ per_page: 100 });
                const items = (res && res.data) || [];
                items.forEach(opp => {
                    const option = document.createElement('option');
                    option.value = opp.id;
                    option.textContent = `${opp.titulo || 'Oportunidad'} - ${opp.customer?.nombre || 'Sin cliente'}`;
                    if (selectedId && String(opp.id) === selectedId) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
            }
        } catch (err) {
            console.warn('[loadOpportunitiesIntoSelect] Error cargando oportunidades:', err);
        }
    }

    // ======= TAREA 6: Recordatorios =======
    function initReminders() {
        const remindersTab = document.querySelector('a[data-bs-target="#recordatorios"]');
        if (remindersTab) {
            remindersTab.addEventListener('click', () => {
                loadRemindersFromAPI();
            });
        }

        const newReminderBtn = document.querySelector('#recordatorios .btn-primary');
        if (newReminderBtn && newReminderBtn.textContent.includes('Nuevo Recordatorio')) {
            newReminderBtn.addEventListener('click', showCreateReminderModal);
        }
    }

    async function loadRemindersFromAPI() {
        try {
            if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.crm) {
                console.warn('[Reminders] API no disponible');
                return;
            }

            const res = await MarketWorld.api.crm.recordatorios();
            if (!res.success) {
                console.warn('[Reminders] Error:', res.message);
                return;
            }

            const tbody = document.querySelector('#recordatorios .data-table tbody');
            if (!tbody) {
                console.warn('[Reminders] Tabla no encontrada');
                return;
            }

            tbody.innerHTML = '';
            const recordatorios = res.data || [];

            if (recordatorios.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay recordatorios pendientes.</td></tr>';
                return;
            }

            recordatorios.forEach(rem => {
                const tr = document.createElement('tr');
                const estado_clase = {
                    'Pendiente': 'bg-warning',
                    'Enviado': 'bg-success',
                    'Fallido': 'bg-danger'
                }[rem.estado] || 'bg-secondary';

                tr.innerHTML = `
                    <td>${rem.titulo || 'Sin título'}</td>
                    <td>${rem.activity?.titulo || 'N/A'}</td>
                    <td><span class="badge bg-info">${rem.tipo || 'Notificación'}</span></td>
                    <td>${new Date(rem.fecha_envio).toLocaleDateString('es-ES')} ${new Date(rem.fecha_envio).toLocaleTimeString('es-ES')}</td>
                    <td><span class="badge ${estado_clase}">${rem.estado || 'Pendiente'}</span></td>
                    <td>
                        ${!rem.leido ? '<span class="badge bg-primary">No leído</span>' : '<span class="badge bg-secondary">Leído</span>'}
                    </td>
                    <td>
                        ${!rem.leido ? `<button class="btn btn-sm btn-outline-success btn-read-reminder" data-id="${rem.id}"><i class="bi bi-check-all"></i></button>` : ''}
                        <button class="btn btn-sm btn-outline-danger btn-delete-reminder" data-id="${rem.id}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            attachReminderEventListeners();
        } catch (err) {
            console.error('[Reminders] Error:', err);
        }
    }

    function attachReminderEventListeners() {
        document.querySelectorAll('.btn-delete-reminder').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = e.target.closest('[data-id]').dataset.id;
                if (confirm('¿Estás seguro de eliminar este recordatorio?')) {
                    try {
                        const res = await MarketWorld.api.crm.eliminarRecordatorio(id);
                        if (res.success) {
                            if (MarketWorld.notifications) {
                                MarketWorld.notifications.show('Recordatorio eliminado', 'success');
                            }
                            loadRemindersFromAPI();
                        }
                    } catch (err) {
                        console.error('[Delete Reminder] Error:', err);
                    }
                }
            });
        });

        document.querySelectorAll('.btn-read-reminder').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = e.target.closest('[data-id]').dataset.id;
                try {
                    const res = await MarketWorld.api.crm.marcarRecordatorioLeido(id);
                    if (res.success) {
                        if (MarketWorld.notifications) {
                            MarketWorld.notifications.show('Recordatorio marcado como leído', 'success');
                        }
                        loadRemindersFromAPI();
                    }
                } catch (err) {
                    console.error('[Mark Reminder Read] Error:', err);
                }
            });
        });
    }

    function showCreateReminderModal() {
        const modalHtml = `
            <div class="modal fade" id="createReminderModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Nuevo Recordatorio</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="createReminderForm">
                                <div class="mb-3">
                                    <label class="form-label">Título</label>
                                    <input type="text" class="form-control" name="titulo" placeholder="Ej: Llamar a cliente X" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Actividad Relacionada</label>
                                    <select class="form-select" name="activity_id" required>
                                        <option value="">Selecciona una actividad...</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Tipo de Recordatorio</label>
                                    <select class="form-select" name="tipo">
                                        <option value="Notificación">Notificación</option>
                                        <option value="Email">Email</option>
                                        <option value="SMS">SMS</option>
                                        <option value="Push">Push</option>
                                    </select>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Fecha y Hora de Envío</label>
                                    <input type="datetime-local" class="form-control" name="fecha_envio" required>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Descripción (Opcional)</label>
                                    <textarea class="form-control" name="descripcion" rows="3" placeholder="Detalles adicionales..."></textarea>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button class="btn btn-primary btn-save-reminder">Crear Recordatorio</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('createReminderModal');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modalEl = document.getElementById('createReminderModal');
        const bsModal = new bootstrap.Modal(modalEl);

        // Cargar actividades en el select
        loadActivitiesIntoReminderSelect(modalEl);

        modalEl.querySelector('.btn-save-reminder').addEventListener('click', async () => {
            const form = document.getElementById('createReminderForm');
            const data = {
                titulo: form.titulo.value,
                descripcion: form.descripcion.value || null,
                tipo: form.tipo.value,
                fecha_envio: formatDateTimeForApi(form.fecha_envio.value),
                activity_id: parseInt(form.activity_id.value),
            };

            try {
                if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.crm) {
                    throw new Error('API no disponible');
                }

                const res = await MarketWorld.api.crm.crearRecordatorio(data);
                if (res.success) {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show('Recordatorio creado', 'success');
                    }
                    bsModal.hide();
                    loadRemindersFromAPI();
                } else {
                    if (MarketWorld.notifications) {
                        MarketWorld.notifications.show(res.message || 'Error', 'error');
                    }
                }
            } catch (err) {
                console.error('[Create Reminder] Error:', err);
            }
        });

        modalEl.addEventListener('hidden.bs.modal', () => { modalEl.remove(); });
        bsModal.show();
    }

    function loadActivitiesIntoReminderSelect(container) {
        const select = container.querySelector('select[name="activity_id"]');
        if (!select) return;

        // Cargar actividades desde API si está disponible
        if (typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.crm) {
            MarketWorld.api.crm.actividades({ per_page: 200 }).then(res => {
                if (res.success) {
                    (res.data || []).forEach(act => {
                        const option = document.createElement('option');
                        option.value = act.id;
                        option.textContent = act.titulo;
                        if (lastCreatedActivityId && String(act.id) === String(lastCreatedActivityId)) {
                            option.selected = true;
                        }
                        select.appendChild(option);
                    });
                }
            }).catch(err => console.warn('[Load Activities] Error:', err));
        }
    }

    async function resolveLatestActivityIdForSelectedOpportunity() {
        if (!selectedOpportunityData?.id || !MarketWorld?.api?.crm) return null;

        try {
            const res = await MarketWorld.api.crm.actividades({ opportunity_id: selectedOpportunityData.id, per_page: 500 });
            if (!res.success) return null;

            const activities = Array.isArray(res.data) ? res.data : [];
            if (activities.length === 0) return null;

            const latest = activities.reduce((current, item) => {
                if (!current) return item;
                const currentDate = new Date(current.fecha_programada || 0).getTime();
                const itemDate = new Date(item.fecha_programada || 0).getTime();
                return itemDate >= currentDate ? item : current;
            }, null);

            return latest?.id || null;
        } catch (err) {
            console.warn('[Resolve Latest Activity] Error:', err);
            return null;
        }
    }

    function parseCurrencyValue(rawValue) {
        if (rawValue === undefined || rawValue === null) return null;
        let cleaned = String(rawValue).trim();
        if (!cleaned) return null;

        cleaned = cleaned.replace(/[^0-9,.-]/g, '');

        if (cleaned.includes(',') && cleaned.includes('.')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else if (cleaned.includes(',')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else if ((cleaned.match(/\./g) || []).length > 1) {
            cleaned = cleaned.replace(/\./g, '');
        }

        const parsed = parseFloat(cleaned);
        return Number.isNaN(parsed) ? null : parsed;
    }

    function formatDateTimeForApi(value) {
        if (!value) return null;
        if (value.includes('T')) {
            const normalized = value.replace('T', ' ');
            return normalized.length === 16 ? `${normalized}:00` : normalized;
        }
        return value;
    }

    function formatDateTimeForInput(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';

        const pad = (n) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    function formatActivityDate(value) {
        if (!value) return 'Sin fecha';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString('es-ES');
    }

    function getActivityStateClass(state) {
        const normalized = String(state || '').toLowerCase();
        if (normalized === 'completada') return 'success';
        if (normalized === 'en progreso') return 'info';
        if (normalized === 'cancelada') return 'danger';
        return 'warning';
    }

    async function refreshActivityViews() {
        await loadActivitiesFromAPI();
        if (selectedOpportunityData?.id) {
            await loadOpportunityActivities(selectedOpportunityData.id);
        }
    }

    function mergeOpportunityNotes(existingNotes, probability) {
        const prefix = 'Probabilidad cierre:';
        const noteLine = `${prefix} ${probability}%`;
        if (!existingNotes) return noteLine;

        const lines = existingNotes.split(/\r?\n/).filter(Boolean);
        const filtered = lines.filter(line => !line.startsWith(prefix));
        filtered.unshift(noteLine);
        return filtered.join('\n');
    }

    function stageToProbability(stage) {
        switch (stage) {
            case 'ganado':
                return 100;
            case 'perdido':
                return 0;
            case 'negociacion':
                return 80;
            case 'propuesta':
                return 60;
            case 'contactado':
                return 30;
            default:
                return 10;
        }
    }

    // Llamar a initOpportunityDetailSave en DOMContentLoaded
    // (se agregará en el reemplazo de DOMContentLoaded)

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
