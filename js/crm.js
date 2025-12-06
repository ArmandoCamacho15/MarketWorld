/**
 * Script para el módulo CRM
 * Funcionalidades: gestión clientes, oportunidades, segmentación, campañas
 */

(function() {
    'use strict';

    let selectedClient = null;
    let selectedOpportunity = null;

    document.addEventListener('DOMContentLoaded', () => {
        console.log('📊 Módulo CRM cargado');
        
        initClientCards();
        initClientFilters();
        initOpportunityManagement();
        initSegmentation();
        initCampaigns();
        initClientSearch();
    });

    // Tarjetas de clientes interactivas
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
            
            // Botones de acción
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
        
        // Remover selección anterior
        document.querySelectorAll('.client-card').forEach(c => {
            c.style.borderLeft = '4px solid #9b59b6';
        });
        
        // Marcar como seleccionado
        card.style.borderLeft = '4px solid #0d6ef0';
        
        // Mostrar ficha completa
        showClientSheet(clientName);
    }

    function viewClientDetails(card) {
        const clientName = card.querySelector('h5').textContent;
        console.log(`👁️ Ver detalles de: ${clientName}`);
        
        // Crear modal de detalles
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
        // Aquí se cargarían los datos completos del cliente
    }

    // Filtros de clientes
    function initClientFilters() {
        const btnFilter = document.querySelector('.btn-primary');
        
        if (btnFilter && btnFilter.textContent.includes('Filtrar')) {
            btnFilter.addEventListener('click', applyClientFilters);
        }
    }

    function applyClientFilters() {
        const tipo = document.querySelector('select[aria-label*="Tipo"]')?.value || 'Todos';
        const ciudad = document.querySelector('select[aria-label*="Ciudad"]')?.value || 'Todas';
        const segmento = document.querySelector('select[aria-label*="Segmento"]')?.value || 'Todos';
        
        console.log(`🔍 Filtrando clientes:`, { tipo, ciudad, segmento });
        
        // Simulación de filtrado
        alert(`Filtros aplicados:\n- Tipo: ${tipo}\n- Ciudad: ${ciudad}\n- Segmento: ${segmento}`);
    }

    // Gestión de oportunidades
    function initOpportunityManagement() {
        const opportunityRows = document.querySelectorAll('.data-table tbody tr');
        
        opportunityRows.forEach(row => {
            row.style.cursor = 'pointer';
            
            row.addEventListener('click', () => {
                const oppName = row.cells[0].textContent;
                selectOpportunity(oppName, row);
            });
        });
        
        // Botones del embudo
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
        
        // Resaltar fila
        document.querySelectorAll('.data-table tbody tr').forEach(r => {
            r.style.backgroundColor = '';
        });
        row.style.backgroundColor = '#f0f6ff';
        
        // Mostrar seguimiento
        showOpportunityTracking(oppName);
    }

    function showOpportunityTracking(oppName) {
        console.log(`📈 Mostrando seguimiento de: ${oppName}`);
        // Aquí se mostraría el seguimiento detallado
    }

    function filterOpportunitiesByStage(stage) {
        console.log(`🎯 Filtrando oportunidades en etapa: ${stage}`);
        alert(`Mostrando oportunidades en etapa: ${stage}`);
    }

    // Segmentación de clientes
    function initSegmentation() {
        const btnNewSegment = document.querySelector('.btn-primary');
        
        if (btnNewSegment && btnNewSegment.textContent.includes('Nuevo Segmento')) {
            btnNewSegment.addEventListener('click', createNewSegment);
        }
        
        // Botones de editar/eliminar segmentos
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

    // Campañas de marketing
    function initCampaigns() {
        const btnNewCampaign = document.querySelector('.btn-primary');
        
        if (btnNewCampaign && btnNewCampaign.textContent.includes('Nueva Campaña')) {
            btnNewCampaign.addEventListener('click', createCampaign);
        }
        
        // Checkboxes de canales
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

    // Búsqueda de clientes
    function initClientSearch() {
        const searchInput = document.querySelector('.search-bar input');
        
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                const query = e.target.value.trim();
                if (query.length > 2) {
                    searchClients(query);
                }
            }, 300));
        }
    }

    function searchClients(query) {
        console.log(`🔍 Buscando clientes: "${query}"`);
        // Aquí iría la búsqueda AJAX
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

/**
 * ===========================
 * CRM.JS - CRUD COMPLETO DE CLIENTES
 * ===========================
 */

/**
 * CRM.JS - Gestión de clientes
 */

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
    console.log('✅ Sistema CRM iniciado');
    
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
    console.log('✅ Cliente agregado:', nuevoCliente);
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
