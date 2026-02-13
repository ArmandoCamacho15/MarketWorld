
(function() {
    'use strict';

    // --- Estado del módulo ---
    const moduleState = {
        initialized: false,
        notificationPanelOpen: false,
        searchTimeout: null
    };

    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ Módulo Inicio cargado correctamente');
        console.log('🔍 Verificando disponibilidad de MarketWorld.data...');
        
        // --- Verificar MarketWorld.data ---
        if (typeof MarketWorld === 'undefined') {
            console.error('❌ MarketWorld no está definido. Verifica que data.js se cargue antes que inicio.js');
            return;
        }
        
        if (!MarketWorld.data) {
            console.error('❌ MarketWorld.data no está disponible');
            return;
        }
        
        console.log('✅ MarketWorld.data disponible');
        
        try {
            // --- Verificar sesión ---
            if (typeof MarketWorld !== 'undefined' && MarketWorld.data && typeof MarketWorld.data.isLoggedIn === 'function') {
                checkSession();
            }
            
            // --- Cargar información del usuario ---
            loadUserInfo();
            
            // --- Inicializar componentes con validación ---
            initLogout();
            initSearch();
            initQuickAccess();
            
            // --- Cargar datos dinámicos ---
            console.log('🚀 Iniciando carga de componentes dinámicos...');
            loadRealAlerts();
            loadRealTasks();
            loadRealStatCards();
            
            initKeyboardNavigation();
            
            // --- Inicializar sistema de notificaciones ---
            if (typeof MarketWorld !== 'undefined' && typeof MarketWorld.notifications !== 'undefined') {
                MarketWorld.notifications.init();
            }
            
            moduleState.initialized = true;
            console.log('✅ Todos los componentes inicializados correctamente');
            
        } catch (error) {
            console.error('❌ Error al inicializar el módulo inicio:', error);
            showErrorNotification('Error al cargar el módulo. Por favor, recarga la página.');
        }
    });

    // ======= VERIFICAR SESIÓN ACTIVA =======
    function checkSession() {
        try {
            if (!MarketWorld.data.isLoggedIn()) {
                console.log('⚠️ Sesión no activa, redirigiendo al login...');
                window.location.href = 'Login.html';
            }
        } catch (error) {
            console.error('❌ Error al verificar sesión:', error);
            window.location.href = 'Login.html';
        }
    }

    // ======= CARGAR INFORMACIÓN DEL USUARIO (SANITIZACIÓN) =======
    function loadUserInfo() {
        try {
            const user = MarketWorld.data.getCurrentUser();
            if (!user) {
                console.warn('⚠️ No se encontró información del usuario');
                return;
            }
            
            const userName = document.getElementById('userName');
            const userRole = document.getElementById('userRole');
            const userAvatar = document.querySelector('.user-info img');
            
            if (userName) {
                const fullName = `${user.nombre || ''} ${user.apellido || ''}`.trim();
                userName.textContent = fullName || 'Usuario';
            }
            
            if (userRole) {
                userRole.textContent = user.rol || 'Sin rol';
            }
            
            // ======= ACTUALIZAR AVATAR CON INICIALES =======
            if (userAvatar && user.nombre && user.apellido) {
                const initials = `${user.nombre.charAt(0)}${user.apellido.charAt(0)}`;
                userAvatar.alt = `Avatar de ${user.nombre} ${user.apellido}`;
                userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=0d6ef0&color=fff`;
            }
            
            console.log('✅ Información del usuario cargada correctamente');
        } catch (error) {
            console.error('❌ Error al cargar información del usuario:', error);
        }
    }

    // ======= CERRAR SESIÓN (CONFIRMACIÓN MEJORADA) =======
    function initLogout() {
        const logoutButtons = [
            document.getElementById('logoutBtn'),
            document.getElementById('logoutBtnTop')
        ];
        
        logoutButtons.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', handleLogout);
                // ======= MEJORAR ACCESIBILIDAD =======
                btn.setAttribute('role', 'button');
                btn.setAttribute('tabindex', '0');
                
                // ======= SOPORTE PARA TECLADO =======
                btn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleLogout(e);
                    }
                });
            }
        });
    }

    function handleLogout(e) {
        e.preventDefault();
        
        try {
            // ======= MODAL PERSONALIZADO EN LUGAR DE CONFIRM =======
            if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
                console.log('🚪 Cerrando sesión...');
                
                // ======= LIMPIAR ESTADO LOCAL =======
                moduleState.initialized = false;
                
                // ======= CERRAR SESIÓN =======
                MarketWorld.data.logout();
                
                // ======= MOSTRAR FEEDBACK =======
                showSuccessNotification('Sesión cerrada correctamente');
                
                // ======= REDIRIGIR DESPUÉS DE DELAY =======
                setTimeout(() => {
                    window.location.href = 'Login.html';
                }, 500);
            }
        } catch (error) {
            console.error('❌ Error al cerrar sesión:', error);
            showErrorNotification('Error al cerrar sesión. Intentando de nuevo...');
            // ======= INTENTAR CERRAR SESIÓN =======
            setTimeout(() => {
                window.location.href = 'Login.html';
            }, 1000);
        }
    }

    // ======= BÚSQUEDA GLOBAL (VALIDACIÓN MEJORADA) =======
    function initSearch() {
        const searchInput = document.getElementById('globalSearch');
        
        if (!searchInput) {
            console.warn('⚠️ Campo de búsqueda no encontrado');
            return;
        }
        
        try {
            // ======= BÚSQUEDA CON DEBOUNCE =======
            searchInput.addEventListener('input', debounce((e) => {
                const query = sanitizeSearchQuery(e.target.value);
                
                if (query.length > 2) {
                    performSearch(query);
                } else if (query.length === 0) {
                    clearSearchResults();
                }
            }, 300));

            // Búsqueda con Enter
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = sanitizeSearchQuery(e.target.value);
                    if (query.length > 0) {
                        performSearch(query);
                    }
                }
                
                // Cerrar resultados con Escape
                if (e.key === 'Escape') {
                    clearSearchResults();
                    searchInput.blur();
                }
            });
            
            // Añadir indicador de búsqueda activa
            searchInput.addEventListener('focus', () => {
                searchInput.setAttribute('aria-expanded', 'false');
            });
            
            console.log('✅ Sistema de búsqueda inicializado');
        } catch (error) {
            console.error('❌ Error al inicializar búsqueda:', error);
        }
    }

    function sanitizeSearchQuery(query) {
        if (!query || typeof query !== 'string') return '';
        // Eliminar caracteres peligrosos y espacios extras
        return query.trim().replace(/[<>\"']/g, '').substring(0, 100);
    }

    function performSearch(query) {
        console.log(`🔍 Buscando: "${query}"`);
        
        try {
            const searchInput = document.getElementById('globalSearch');
            if (searchInput) {
                searchInput.setAttribute('aria-busy', 'true');
            }
            
            // Simular búsqueda en múltiples módulos
            const results = searchInModules(query);
            
            if (searchInput) {
                searchInput.setAttribute('aria-busy', 'false');
                searchInput.setAttribute('aria-expanded', results.length > 0 ? 'true' : 'false');
            }
            
            showSearchResults(results, query);
        } catch (error) {
            console.error('❌ Error en búsqueda:', error);
            showSearchError();
        }
    }

    function searchInModules(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        try {
            // Buscar en productos
            if (typeof MarketWorld !== 'undefined' && MarketWorld.data) {
                const products = MarketWorld.data.getProducts();
                products.filter(p => 
                    p.nombre.toLowerCase().includes(queryLower) || 
                    p.codigo.toLowerCase().includes(queryLower)
                ).slice(0, 5).forEach(p => {
                    results.push({
                        type: 'producto',
                        icon: 'bi-box-seam',
                        name: p.nombre,
                        subtitle: `Código: ${p.codigo}`,
                        url: `inventario.html?id=${p.id}`
                    });
                });
                
                // Buscar en clientes
                const customers = MarketWorld.data.getCustomers();
                customers.filter(c => 
                    c.nombre.toLowerCase().includes(queryLower) ||
                    (c.documento && c.documento.includes(query))
                ).slice(0, 3).forEach(c => {
                    results.push({
                        type: 'cliente',
                        icon: 'bi-person',
                        name: c.nombre,
                        subtitle: `Doc: ${c.documento}`,
                        url: `crm.html?id=${c.id}`
                    });
                });
            }
            
            // Buscar en módulos del sistema
            const modules = [
                { name: 'Dashboard', keywords: ['panel', 'inicio', 'dashboard', 'metricas'], url: 'dashboard.html', icon: 'bi-speedometer2' },
                { name: 'Inventario', keywords: ['inventario', 'productos', 'stock'], url: 'inventario.html', icon: 'bi-box-seam' },
                { name: 'Facturación', keywords: ['factura', 'ventas', 'facturacion'], url: 'facturacion.html', icon: 'bi-receipt' },
                { name: 'CRM', keywords: ['clientes', 'crm', 'contactos'], url: 'crm.html', icon: 'bi-people' },
                { name: 'Contabilidad', keywords: ['contabilidad', 'cuentas', 'balance'], url: 'contabilidad.html', icon: 'bi-cash-coin' },
                { name: 'Compras', keywords: ['compras', 'proveedores', 'ordenes'], url: 'compras.html', icon: 'bi-cart' },
                { name: 'Reportes', keywords: ['reportes', 'informes', 'estadisticas'], url: 'reporte.html', icon: 'bi-bar-chart' },
                { name: 'Configuración', keywords: ['configuracion', 'ajustes', 'opciones'], url: 'configuracion.html', icon: 'bi-gear' }
            ];
            
            modules.forEach(module => {
                if (module.keywords.some(k => k.includes(queryLower)) || 
                    module.name.toLowerCase().includes(queryLower)) {
                    results.push({
                        type: 'modulo',
                        icon: module.icon,
                        name: module.name,
                        subtitle: 'Módulo del sistema',
                        url: module.url
                    });
                }
            });
            
        } catch (error) {
            console.error('❌ Error al buscar en módulos:', error);
        }
        
        return results.slice(0, 10); // Limitar a 10 resultados
    }

    function showSearchResults(results, query) {
        // Remover panel anterior
        clearSearchResults();
        
        if (results.length === 0) {
            showNoSearchResults(query);
            return;
        }

        console.log(`📋 Mostrando ${results.length} resultados de búsqueda`);

        const panel = createSearchResultsPanel(results, query);
        document.body.appendChild(panel);

        // Cerrar al hacer clic fuera
        setTimeout(() => {
            const closeHandler = (e) => {
                const searchInput = document.getElementById('globalSearch');
                if (searchInput && searchInput.contains(e.target)) return;
                if (!panel.contains(e.target)) {
                    clearSearchResults();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 100);
    }

    function createSearchResultsPanel(results, query) {
        const panel = document.createElement('div');
        panel.className = 'search-results-panel';
        panel.setAttribute('role', 'listbox');
        panel.setAttribute('aria-label', 'Resultados de búsqueda');
        panel.style.cssText = `
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            padding: 0;
            width: 90%;
            max-width: 600px;
            max-height: 400px;
            overflow-y: auto;
            z-index: 2000;
            animation: slideDown 0.3s ease;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'padding: 15px 20px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;';
        
        const title = document.createElement('h6');
        title.style.margin = '0';
        title.style.color = '#0d6ef0';
        title.textContent = `Resultados para "${query}" (${results.length})`;
        
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-close';
        closeBtn.setAttribute('aria-label', 'Cerrar resultados de búsqueda');
        closeBtn.style.cssText = 'background: none; border: none; cursor: pointer;';
        closeBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
        closeBtn.addEventListener('click', clearSearchResults);
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        // Lista de resultados
        const list = document.createElement('div');
        list.style.padding = '10px 0';
        
        results.forEach((result, index) => {
            const item = createSearchResultItem(result, index);
            list.appendChild(item);
        });
        
        panel.appendChild(list);
        
        return panel;
    }

    function createSearchResultItem(result, index) {
        const item = document.createElement('a');
        item.href = result.url;
        item.className = 'search-result-item';
        item.setAttribute('role', 'option');
        item.setAttribute('tabindex', '0');
        item.style.cssText = `
            display: flex;
            align-items: center;
            padding: 12px 20px;
            text-decoration: none;
            color: #2c3e50;
            transition: background 0.2s;
        `;
        
        item.addEventListener('mouseenter', () => {
            item.style.background = '#f0f6ff';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.background = 'transparent';
        });
        
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                window.location.href = result.url;
            }
        });
        
        const icon = document.createElement('i');
        icon.className = `bi ${result.icon} fs-4`;
        icon.style.cssText = 'color: #0d6ef0; margin-right: 15px; min-width: 24px;';
        
        const content = document.createElement('div');
        content.style.flex = '1';
        
        const name = document.createElement('div');
        name.style.fontWeight = '600';
        name.textContent = result.name;
        
        const subtitle = document.createElement('div');
        subtitle.style.cssText = 'font-size: 0.85rem; color: #6c757d;';
        subtitle.textContent = result.subtitle;
        
        content.appendChild(name);
        content.appendChild(subtitle);
        
        const badge = document.createElement('span');
        badge.style.cssText = 'font-size: 0.75rem; padding: 3px 8px; border-radius: 4px; background: #e6f0ff; color: #0d6ef0;';
        badge.textContent = result.type;
        
        item.appendChild(icon);
        item.appendChild(content);
        item.appendChild(badge);
        
        return item;
    }

    function showNoSearchResults(query) {
        const panel = document.createElement('div');
        panel.className = 'search-results-panel';
        panel.style.cssText = `
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            padding: 30px;
            width: 90%;
            max-width: 400px;
            text-align: center;
            z-index: 2000;
            animation: slideDown 0.3s ease;
        `;
        
        panel.innerHTML = `
            <i class="bi bi-search fs-1 text-muted mb-3" style="display: block;"></i>
            <h6 class="mb-2">No se encontraron resultados</h6>
            <p class="text-muted small mb-0">No hay coincidencias para "${escapeHtml(query)}"</p>
        `;
        
        document.body.appendChild(panel);
        
        setTimeout(() => {
            const closeHandler = () => {
                clearSearchResults();
                document.removeEventListener('click', closeHandler);
            };
            document.addEventListener('click', closeHandler);
        }, 100);
    }

    function showSearchError() {
        showErrorNotification('Error al realizar la búsqueda. Intenta de nuevo.');
    }

    function clearSearchResults() {
        const existingPanel = document.querySelector('.search-results-panel');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        const searchInput = document.getElementById('globalSearch');
        if (searchInput) {
            searchInput.setAttribute('aria-expanded', 'false');
        }
    }

    // Accesos rápidos a módulos con feedback mejorado
    function initQuickAccess() {
        const quickAccessCards = document.querySelectorAll('.quick-access-card');
        
        if (quickAccessCards.length === 0) {
            console.warn('⚠️ No se encontraron tarjetas de acceso rápido');
            return;
        }
        
        quickAccessCards.forEach((card, index) => {
            try {
                // Asegurar que la tarjeta sea accesible por teclado
                if (!card.hasAttribute('tabindex')) {
                    card.setAttribute('tabindex', '0');
                }
                
                // Click handler
                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    handleQuickAccessNavigation(card);
                });

                // Soporte de teclado
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleQuickAccessNavigation(card);
                    }
                });

                // Efectos hover mejorados
                card.addEventListener('mouseenter', () => {
                    card.style.boxShadow = '0 15px 30px rgba(13, 110, 240, 0.2)';
                    card.style.transform = 'translateY(-5px)';
                });

                card.addEventListener('mouseleave', () => {
                    card.style.boxShadow = '';
                    card.style.transform = '';
                });
                
                // Focus visible
                card.addEventListener('focus', () => {
                    card.style.outline = '3px solid #0d6ef0';
                    card.style.outlineOffset = '2px';
                });
                
                card.addEventListener('blur', () => {
                    card.style.outline = '';
                    card.style.outlineOffset = '';
                });
                
            } catch (error) {
                console.error(`❌ Error al inicializar tarjeta ${index}:`, error);
            }
        });
        
        console.log(`✅ ${quickAccessCards.length} tarjetas de acceso rápido inicializadas`);
    }

    function handleQuickAccessNavigation(card) {
        const targetUrl = card.getAttribute('href');
        
        if (!targetUrl) {
            console.error('❌ URL no encontrada en la tarjeta');
            return;
        }
        
        console.log(`🚀 Navegando a: ${targetUrl}`);
        
        // Feedback visual de clic
        card.style.transform = 'scale(0.95)';
        card.style.transition = 'transform 0.15s ease';
        
        // Agregar indicador de carga
        const originalContent = card.innerHTML;
        const loader = document.createElement('div');
        loader.className = 'spinner-border spinner-border-sm text-primary';
        loader.setAttribute('role', 'status');
        loader.innerHTML = '<span class="visually-hidden">Cargando...</span>';
        
        setTimeout(() => {
            try {
                window.location.href = targetUrl;
            } catch (error) {
                console.error('❌ Error al navegar:', error);
                card.style.transform = '';
                showErrorNotification('Error al navegar. Intenta de nuevo.');
            }
        }, 150);
    }

    /* SISTEMA DE NOTIFICACIONES PERSONALIZADO - DESHABILITADO
     * Se usa el sistema estándar de notifications.js para mantener diseño unificado
     * 
    function initNotifications() {
        const bellButton = document.querySelector('[aria-label="Ver notificaciones"]');
        const notificationBadge = document.getElementById('notificationBadge');
        
        if (!bellButton) {
            console.warn('⚠️ Botón de notificaciones no encontrado');
            return;
        }
        
        try {
            // Remover cualquier listener previo clonando el elemento
            const bellButtonNew = bellButton.cloneNode(true);
            bellButton.parentNode.replaceChild(bellButtonNew, bellButton);
            
            // Agregar listeners al botón limpio
            bellButtonNew.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔔 Abriendo panel de notificaciones');
                
                if (moduleState.notificationPanelOpen) {
                    closeNotificationPanel();
                } else {
                    loadAndShowNotifications();
                }
            });
            
            // Soporte de teclado
            bellButtonNew.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    loadAndShowNotifications();
                }
            });
            
            // Actualizar badge inicial
            updateNotificationBadge();
            
            console.log('✅ Sistema de notificaciones mejorado inicializado');
        } catch (error) {
            console.error('❌ Error al inicializar notificaciones:', error);
        }
    }

    function loadAndShowNotifications() {
        try {
            let notifications = [];
            
            // Intentar obtener notificaciones reales del sistema
            if (typeof MarketWorld !== 'undefined' && MarketWorld.data) {
                try {
                    const systemNotifications = MarketWorld.data.getNotifications();
                    if (systemNotifications && systemNotifications.length > 0) {
                        notifications = systemNotifications.slice(0, 10).map(n => ({
                            type: n.tipo || 'info',
                            message: n.titulo || n.mensaje,
                            time: formatNotificationTime(n.fechaCreacion),
                            id: n.id,
                            read: n.leida
                        }));
                    }
                } catch (e) {
                    console.warn('No se pudieron obtener notificaciones del sistema:', e);
                }
            }
            
            // Si no hay notificaciones, mostrar algunas de demostración
            if (notifications.length === 0) {
                notifications = [
                    { type: 'warning', message: '5 productos con stock bajo', time: 'Hace 10 min', read: false },
                    { type: 'info', message: '3 facturas por vencer esta semana', time: 'Hace 1 hora', read: false },
                    { type: 'success', message: 'Nueva venta registrada: $1,250', time: 'Hace 2 horas', read: true }
                ];
            }
            
            showNotificationPanel(notifications);
        } catch (error) {
            console.error('❌ Error al cargar notificaciones:', error);
            showErrorNotification('Error al cargar notificaciones');
        }
    }

    function formatNotificationTime(dateString) {
        if (!dateString) return 'Reciente';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) return 'Ahora';
            if (diffMins < 60) return `Hace ${diffMins} min`;
            
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
            
            const diffDays = Math.floor(diffHours / 24);
            return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
        } catch (e) {
            return 'Reciente';
        }
    }

    function updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        if (!badge) return;
        
        try {
            let count = 0;
            
            if (typeof MarketWorld !== 'undefined' && MarketWorld.data && typeof MarketWorld.data.getUnreadCount === 'function') {
                count = MarketWorld.data.getUnreadCount();
            }
            
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        } catch (error) {
            console.error('❌ Error al actualizar badge de notificaciones:', error);
        }
    }

    function startNotificationPolling() {
        // Actualizar notificaciones cada 30 segundos
        setInterval(() => {
            if (moduleState.initialized) {
                updateNotificationBadge();
            }
        }, 30000);
    }

    function closeNotificationPanel() {
        const existingPanel = document.querySelector('.notification-panel');
        if (existingPanel) {
            existingPanel.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => existingPanel.remove(), 300);
        }
        moduleState.notificationPanelOpen = false;
    }

    function showNotificationPanel(notificationsParam) {
        // Cerrar panel existente
        closeNotificationPanel();
        
        const notifications = notificationsParam || [];
        
        console.log(`📬 Mostrando ${notifications.length} notificaciones`);

        // Crear panel de notificaciones de forma segura
        const panel = document.createElement('div');
        panel.className = 'notification-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Panel de notificaciones');
        panel.setAttribute('aria-modal', 'false');
        panel.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            padding: 0;
            width: 380px;
            max-height: 500px;
            overflow: hidden;
            z-index: 2000;
            animation: slideIn 0.3s ease;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid #e0e0e0; background: #f8f9fa;';

        const title = document.createElement('h5');
        title.style.cssText = 'margin: 0; color: #0d6ef0; font-weight: 600;';
        title.textContent = `Notificaciones (${notifications.length})`;

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-close';
        closeBtn.setAttribute('aria-label', 'Cerrar notificaciones');
        closeBtn.style.cssText = 'border: none; background: none; font-size: 1.2rem; cursor: pointer; padding: 5px;';
        closeBtn.innerHTML = '<i class="bi bi-x-lg"></i>';
        closeBtn.addEventListener('click', closeNotificationPanel);
        
        // Soporte de teclado para cerrar
        closeBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                closeNotificationPanel();
            }
        });

        header.appendChild(title);
        header.appendChild(closeBtn);
        panel.appendChild(header);

        // Lista de notificaciones
        const listContainer = document.createElement('div');
        listContainer.style.cssText = 'max-height: 350px; overflow-y: auto; padding: 10px 0;';
        
        if (notifications.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.style.cssText = 'padding: 40px 20px; text-align: center; color: #6c757d;';
            emptyState.innerHTML = `
                <i class="bi bi-bell-slash fs-1 mb-3" style="display: block;"></i>
                <p class="mb-0">No hay notificaciones</p>
            `;
            listContainer.appendChild(emptyState);
        } else {
            notifications.forEach(function(n, index) {
                const item = createNotificationItem(n, index);
                listContainer.appendChild(item);
            });
        }

        panel.appendChild(listContainer);

        // Footer con acciones
        if (notifications.length > 0) {
            const footer = document.createElement('div');
            footer.style.cssText = 'padding: 12px 20px; border-top: 1px solid #e0e0e0; background: #f8f9fa; display: flex; gap: 10px;';

            const markAllBtn = document.createElement('button');
            markAllBtn.className = 'btn btn-sm btn-primary flex-grow-1';
            markAllBtn.type = 'button';
            markAllBtn.textContent = 'Marcar todas como leídas';
            markAllBtn.addEventListener('click', function() {
                handleMarkAllAsRead();
            });

            const clearBtn = document.createElement('button');
            clearBtn.className = 'btn btn-sm btn-outline-secondary';
            clearBtn.type = 'button';
            clearBtn.innerHTML = '<i class="bi bi-trash"></i>';
            clearBtn.setAttribute('aria-label', 'Eliminar todas las notificaciones');
            clearBtn.setAttribute('title', 'Eliminar todas');
            clearBtn.addEventListener('click', function() {
                handleClearAllNotifications();
            });

            footer.appendChild(markAllBtn);
            footer.appendChild(clearBtn);
            panel.appendChild(footer);
        }

        document.body.appendChild(panel);
        moduleState.notificationPanelOpen = true;

        // Cerrar al hacer clic fuera
        setTimeout(() => {
            function closeOnOutsideClick(e) {
                const bell = document.querySelector('[aria-label="Ver notificaciones"]');
                if (bell && bell.contains(e.target)) return;
                if (!panel.contains(e.target)) {
                    closeNotificationPanel();
                    document.removeEventListener('click', closeOnOutsideClick);
                }
            }
            document.addEventListener('click', closeOnOutsideClick);
            
            // Cerrar con tecla Escape
            function closeOnEscape(e) {
                if (e.key === 'Escape') {
                    closeNotificationPanel();
                    document.removeEventListener('keydown', closeOnEscape);
                }
            }
            document.addEventListener('keydown', closeOnEscape);
        }, 100);
        
        // Focus en el botón de cerrar para accesibilidad
        closeBtn.focus();
    }

    function createNotificationItem(notification, index) {
        const item = document.createElement('div');
        item.className = 'notification-item';
        item.setAttribute('role', 'listitem');
        item.style.cssText = `
            padding: 15px 20px;
            border-bottom: 1px solid #f0f0f0;
            background: ${notification.read ? '#ffffff' : '#f0f6ff'};
            transition: background 0.2s;
            cursor: pointer;
        `;
        
        // Indicador de color según tipo
        const colorMap = {
            'warning': '#f39c12',
            'info': '#3498db',
            'success': '#2ecc71',
            'danger': '#e74c3c'
        };
        const color = colorMap[notification.type] || '#3498db';
        item.style.borderLeft = `4px solid ${color}`;
        
        item.addEventListener('mouseenter', () => {
            item.style.background = '#f8f9fa';
        });
        
        item.addEventListener('mouseleave', () => {
            item.style.background = notification.read ? '#ffffff' : '#f0f6ff';
        });
        
        // Click handler
        item.addEventListener('click', () => {
            handleNotificationClick(notification);
        });

        // Contenido
        const content = document.createElement('div');
        
        const msgContainer = document.createElement('div');
        msgContainer.style.cssText = 'display: flex; align-items: start; justify-content: space-between;';
        
        const msg = document.createElement('div');
        msg.style.cssText = 'font-weight: 600; margin-bottom: 5px; flex: 1;';
        msg.textContent = sanitizeText(notification.message);
        
        if (!notification.read) {
            const unreadBadge = document.createElement('span');
            unreadBadge.style.cssText = 'display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #0d6ef0; margin-left: 8px;';
            unreadBadge.setAttribute('aria-label', 'No leída');
            msg.appendChild(unreadBadge);
        }

        const time = document.createElement('div');
        time.style.cssText = 'font-size: 0.80rem; color: #6c757d; margin-top: 3px;';
        time.textContent = notification.time || 'Reciente';

        msgContainer.appendChild(msg);
        content.appendChild(msgContainer);
        content.appendChild(time);
        item.appendChild(content);

        return item;
    }

    function handleNotificationClick(notification) {
        console.log('📌 Notificación clickeada:', notification);
        
        // Marcar como leída si tiene ID
        if (notification.id && typeof MarketWorld !== 'undefined' && MarketWorld.data) {
            try {
                MarketWorld.data.markNotificationAsRead(notification.id);
                updateNotificationBadge();
            } catch (e) {
                console.warn('No se pudo marcar como leída:', e);
            }
        }
        
        // Si tiene enlace, navegar
        if (notification.enlace) {
            window.location.href = notification.enlace;
        }
        
        closeNotificationPanel();
    }

    function handleMarkAllAsRead() {
        try {
            if (typeof MarketWorld !== 'undefined' && MarketWorld.data && typeof MarketWorld.data.markAllNotificationsAsRead === 'function') {
                MarketWorld.data.markAllNotificationsAsRead();
                updateNotificationBadge();
                showSuccessNotification('Todas las notificaciones marcadas como leídas');
            }
            closeNotificationPanel();
        } catch (error) {
            console.error('❌ Error al marcar todas como leídas:', error);
            showErrorNotification('Error al marcar notificaciones');
        }
    }

    function handleClearAllNotifications() {
        if (confirm('¿Estás seguro de que deseas eliminar todas las notificaciones?')) {
            try {
                if (typeof MarketWorld !== 'undefined' && MarketWorld.data && typeof MarketWorld.data.deleteAllNotifications === 'function') {
                    MarketWorld.data.deleteAllNotifications();
                    updateNotificationBadge();
                    showSuccessNotification('Todas las notificaciones eliminadas');
                }
                closeNotificationPanel();
            } catch (error) {
                console.error('❌ Error al eliminar notificaciones:', error);
                showErrorNotification('Error al eliminar notificaciones');
            }
        }
    }
    */
    // FIN DEL SISTEMA PERSONALIZADO DESHABILITADO
    
    // ========== ALERTAS Y TAREAS CON DATOS REALES ==========
    
    /**
     * Cargar y renderizar alertas desde datos reales del sistema
     */
    function loadRealAlerts() {
        console.log('🚨 Iniciando carga de alertas...');
        
        try {
            const alertsContainer = document.querySelector('.alerts-container');
            if (!alertsContainer) {
                console.warn('⚠️ Contenedor de alertas no encontrado');
                return;
            }
            
            // Limpiar contenedor
            alertsContainer.innerHTML = '';
            
            const alerts = [];
            
            // Verificar que MarketWorld.data esté disponible
            if (typeof MarketWorld === 'undefined' || !MarketWorld.data) {
                console.warn('⚠️ MarketWorld.data no disponible para alertas');
                showNoAlertsMessage(alertsContainer);
                return;
            }
            
            // 1. Alerta de stock bajo
            try {
                const productos = MarketWorld.data.getProducts();
                console.log(`📦 Total productos: ${productos.length}`);
                const lowStockProducts = productos.filter(p => p.stock < 10);
                console.log(`⚠️ Productos con stock bajo (<10): ${lowStockProducts.length}`);
                
                if (lowStockProducts.length > 0) {
                    alerts.push({
                        type: 'warning',
                        icon: 'bi-exclamation-triangle',
                        title: 'Stock bajo',
                        description: `${lowStockProducts.length} producto${lowStockProducts.length > 1 ? 's requieren' : ' requiere'} reabastecimiento`,
                        link: 'inventario.html'
                    });
                }
            } catch (e) {
                console.warn('No se pudieron verificar productos con stock bajo:', e);
            }
            
            // 2. Alerta de facturas pendientes/vencidas
            try {
                const facturas = MarketWorld.data.getInvoices();
                console.log(`📄 Total facturas: ${facturas.length}`);
                const today = new Date();
                const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                
                const pendingInvoices = facturas.filter(f => {
                    if (f.estado !== 'Pendiente') return false;
                    if (!f.fechaVencimiento) return false;
                    const dueDate = new Date(f.fechaVencimiento);
                    return dueDate <= nextWeek;
                });
                
                console.log(`⏰ Facturas pendientes esta semana: ${pendingInvoices.length}`);
                
                if (pendingInvoices.length > 0) {
                    alerts.push({
                        type: 'info',
                        icon: 'bi-info-circle',
                        title: 'Facturas pendientes',
                        description: `${pendingInvoices.length} factura${pendingInvoices.length > 1 ? 's vencen' : ' vence'} esta semana`,
                        link: 'facturacion.html'
                    });
                }
            } catch (e) {
                console.warn('No se pudieron verificar facturas pendientes:', e);
            }
            console.log(`📋 Total de alertas a mostrar: ${alerts.length}`);
            
            // Renderizar alertas
            if (alerts.length === 0) {
                showNoAlertsMessage(alertsContainer);
            } else {
                alerts.forEach(alert => {
                    const alertElement = createAlertElement(alert);
                    alertsContainer.appendChild(alertElement);
                });
            }
            
            // Inicializar interactividad
            initAlerts();
            
            console.log(`✅ ${alerts.length} alertas reales cargadas`);
            
        } catch (error) {
            console.error('❌ Error al cargar alertas reales:', error);
            const alertsContainer = document.querySelector('.alerts-container');
            if (alertsContainer) {
                showNoAlertsMessage(alertsContainer);
            }
        }
    }
    
    /**
     * Mostrar mensaje cuando no hay alertas
     */
    function showNoAlertsMessage(container) {
        const emptyState = document.createElement('div');
        emptyState.className = 'text-center py-4 text-muted';
        emptyState.innerHTML = `
            <i class="bi bi-check-circle fs-2 d-block mb-2 text-success"></i>
            <p class="mb-0">No hay alertas</p>
        `;
        container.appendChild(emptyState);
    }
    
    /**
     * Crear elemento DOM para una alerta
     */
    function createAlertElement(alert) {
        const div = document.createElement('div');
        div.className = `alert-item ${alert.type}`;
        div.setAttribute('role', 'alert');
        
        if (alert.link) {
            div.setAttribute('data-link', alert.link);
        }
        
        div.innerHTML = `
            <div class="alert-title">
                <i class="bi ${alert.icon} me-2" aria-hidden="true"></i>
                ${sanitizeText(alert.title)}
            </div>
            <div class="alert-desc">${sanitizeText(alert.description)}</div>
        `;
        
        return div;
    }
    
    /**
     * Cargar y renderizar tareas desde datos reales del sistema
     */
    function loadRealTasks() {
        console.log('✅ Iniciando carga de tareas...');
        
        try {
            const tasksContainer = document.querySelector('.tasks-container');
            if (!tasksContainer) {
                console.warn('⚠️ Contenedor de tareas no encontrado');
                return;
            }
            
            // Limpiar contenedor
            tasksContainer.innerHTML = '';
            
            const tasks = [];
            
            // Verificar que MarketWorld.data esté disponible
            if (typeof MarketWorld === 'undefined' || !MarketWorld.data) {
                console.warn('⚠️ MarketWorld.data no disponible para tareas');
                showNoTasksMessage(tasksContainer);
                return;
            }
            
            // 1. Órdenes de compra pendientes
            try {
                const compras = MarketWorld.data.getPurchases();
                console.log(`🛒 Total compras: ${compras.length}`);
                const pendingOrders = compras.filter(c => c.estado === 'Pendiente' || c.estado === 'En Proceso');
                
                pendingOrders.slice(0, 3).forEach(orden => {
                    const dueTime = orden.fechaVencimiento ? formatDueTime(orden.fechaVencimiento) : 'Sin fecha';
                    tasks.push({
                        icon: 'bi-cart',
                        title: `Revisar orden de compra #${orden.numeroOrden || orden.id}`,
                        time: dueTime,
                        priority: isPastDue(orden.fechaVencimiento) ? 'high' : 'normal',
                        link: 'compras.html'
                    });
                });
            } catch (e) {
                console.warn('No se pudieron obtener órdenes de compra:', e);
            }
            
            // 2. Productos con stock crítico que requieren pedido urgente
            try {
                const productos = MarketWorld.data.getProducts();
                console.log(`📦 Total productos para tareas: ${productos.length}`);
                const criticalProducts = productos.filter(p => p.stock < 5 && p.stock > 0);
                    
                if (criticalProducts.length > 0) {
                    tasks.push({
                        icon: 'bi-box-seam',
                        title: `Realizar pedido urgente - ${criticalProducts.length} producto${criticalProducts.length > 1 ? 's' : ''}`,
                        time: 'Urgente',
                        priority: 'high',
                        link: 'inventario.html'
                    });
                }
            } catch (e) {
                console.warn('No se pudieron verificar productos críticos:', e);
            }
            
            // 3. Facturas próximas a vencer (en 2-3 días)
            try {
                const facturas = MarketWorld.data.getInvoices();
                const today = new Date();
                const twoDaysFromNow = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000);
                
                const urgentInvoices = facturas.filter(f => {
                    if (f.estado !== 'Pendiente') return false;
                    if (!f.fechaVencimiento) return false;
                    const dueDate = new Date(f.fechaVencimiento);
                    return dueDate <= twoDaysFromNow && dueDate >= today;
                });
                
                urgentInvoices.slice(0, 2).forEach(factura => {
                    const dueTime = formatDueTime(factura.fechaVencimiento);
                    tasks.push({
                        icon: 'bi-file-earmark-text',
                        title: `Gestionar factura #${factura.numeroFactura || factura.id}`,
                        time: dueTime,
                        priority: 'high',
                        link: 'facturacion.html'
                    });
                });
            } catch (e) {
                console.warn('No se pudieron verificar facturas urgentes:', e);
            }
            
            console.log(`📝 Total de tareas a mostrar: ${tasks.length}`);
            
            // Renderizar tareas
            if (tasks.length === 0) {
                console.log('📝 No hay tareas, mostrando mensaje...');
                tasksContainer.innerHTML = `
                    <div class="text-center py-4 text-muted">
                        <i class="bi bi-check-circle fs-2 d-block mb-2 text-success"></i>
                        <p class="mb-0">No hay tareas pendientes</p>
                    </div>
                `;
            } else {
                // Ordenar por prioridad
                tasks.sort((a, b) => {
                    if (a.priority === 'high' && b.priority !== 'high') return -1;
                    if (a.priority !== 'high' && b.priority === 'high') return 1;
                    return 0;
                });
                
                tasks.forEach(task => {
                    const taskElement = createTaskElement(task);
                    tasksContainer.appendChild(taskElement);
                });
                
                // Inicializar interactividad solo si hay tareas
                initTasks();
            }
            
            console.log(`✅ ${tasks.length} tareas reales cargadas`);
            
        } catch (error) {
            console.error('❌ Error al cargar tareas reales:', error);
            const tasksContainer = document.querySelector('.tasks-container');
            if (tasksContainer) {
                tasksContainer.innerHTML = `
                    <div class="text-center py-4 text-muted">
                        <i class="bi bi-check-circle fs-2 d-block mb-2 text-success"></i>
                        <p class="mb-0">No hay tareas pendientes</p>
                    </div>
                `;
            }
        }
    }
    
    /**
     * Mostrar mensaje cuando no hay tareas
     */
    function showNoTasksMessage(container) {
        if (!container) {
            console.error('❌ Contenedor de tareas no válido');
            return;
        }
        
        console.log('📝 Creando mensaje de no hay tareas...');
        
        const emptyState = document.createElement('div');
        emptyState.className = 'text-center py-4 text-muted';
        emptyState.innerHTML = `
            <i class="bi bi-check-circle fs-2 d-block mb-2 text-success"></i>
            <p class="mb-0">No hay tareas pendientes</p>
        `;
        container.appendChild(emptyState);
        
        console.log('✅ Mensaje de no hay tareas agregado al DOM');
    }
    
    /**
     * Crear elemento DOM para una tarea
     */
    function createTaskElement(task) {
        const div = document.createElement('div');
        div.className = 'task-item';
        
        if (task.priority === 'high') {
            div.classList.add('priority-high');
        }
        
        if (task.link) {
            div.setAttribute('data-link', task.link);
        }
        
        div.innerHTML = `
            <i class="bi ${task.icon}" aria-hidden="true"></i>
            <div class="task-content">
                <div class="task-title">${sanitizeText(task.title)}</div>
                <div class="task-time">${sanitizeText(task.time)}</div>
            </div>
        `;
        
        return div;
    }
    
    /**
     * Formatear tiempo de vencimiento
     */
    function formatDueTime(dateString) {
        if (!dateString) return 'Sin fecha';
        
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = date - now;
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) return 'Vencido';
            if (diffDays === 0) return 'Vence hoy';
            if (diffDays === 1) return 'Vence mañana';
            if (diffDays <= 7) return `Vence en ${diffDays} días`;
            
            return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        } catch (e) {
            return 'Fecha inválida';
        }
    }
    
    /**
     * Verificar si una fecha ya pasó
     */
    function isPastDue(dateString) {
        if (!dateString) return false;
        try {
            return new Date(dateString) < new Date();
        } catch (e) {
            return false;
        }
    }
    
    // Tareas pendientes interactivas mejoradas
    function initTasks() {
        const taskItems = document.querySelectorAll('.task-item');
        
        if (taskItems.length === 0) {
            return;
        }
        
        taskItems.forEach((task, index) => {
            try {
                // Hacer la tarea accesible
                task.setAttribute('role', 'button');
                task.setAttribute('tabindex', '0');
                task.setAttribute('aria-label', `Tarea: ${task.textContent.trim()}. Clic para marcar como completada`);
                task.style.cursor = 'pointer';
                task.title = 'Clic para marcar como completada';
                
                // Click handler
                task.addEventListener('click', () => {
                    handleTaskCompletion(task);
                });
                
                // Soporte de teclado
                task.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleTaskCompletion(task);
                    }
                });
                
                // Efectos hover
                task.addEventListener('mouseenter', () => {
                    task.style.background = '#f0f6ff';
                    task.style.transform = 'translateX(5px)';
                });
                
                task.addEventListener('mouseleave', () => {
                    task.style.background = '';
                    task.style.transform = '';
                });
                
            } catch (error) {
                console.error(`❌ Error al inicializar tarea ${index}:`, error);
            }
        });
        
        console.log(`✅ ${taskItems.length} tareas inicializadas`);
    }

    function handleTaskCompletion(task) {
        console.log('✅ Tarea clickeada');
        
        // Navegar si tiene enlace
        const link = task.getAttribute('data-link');
        if (link) {
            window.location.href = link;
            return;
        }
        
        // Feedback visual inmediato
        task.style.background = '#e8f5e9';
        task.style.transition = 'all 0.3s ease';
        
        // Agregar icono de check
        const icon = task.querySelector('i');
        if (icon) {
            icon.className = 'bi bi-check-circle-fill';
            icon.style.color = '#2ecc71';
        }
        
        // Deshabilitar interacción
        task.style.pointerEvents = 'none';
        task.setAttribute('aria-disabled', 'true');
        
        // Animación de salida
        setTimeout(() => {
            task.style.opacity = '0';
            task.style.transform = 'translateX(20px)';
            
            setTimeout(() => {
                task.remove();
                showSuccessNotification('Tarea completada');
                
                // Si no quedan más tareas, mostrar mensaje
                const remainingTasks = document.querySelectorAll('.task-item');
                if (remainingTasks.length === 0) {
                    showNoTasksMessage();
                }
            }, 300);
        }, 1000);
    }

    function showNoTasksMessage() {
        const tasksContainer = document.querySelector('.task-item')?.parentElement;
        if (tasksContainer) {
            const emptyState = document.createElement('div');
            emptyState.style.cssText = 'padding: 30px; text-align: center; color: #6c757d;';
            emptyState.innerHTML = `
                <i class="bi bi-check-circle fs-1 text-success mb-2" style="display: block;"></i>
                <p class="mb-0">¡Todas las tareas completadas!</p>
            `;
            tasksContainer.appendChild(emptyState);
        }
    }

    // Alertas interactivas mejoradas
    function initAlerts() {
        const alertItems = document.querySelectorAll('.alert-item');
        
        if (alertItems.length === 0) {
            return;
        }
        
        alertItems.forEach((alert, index) => {
            try {
                // Hacer la alerta accesible
                alert.setAttribute('role', 'button');
                alert.setAttribute('tabindex', '0');
                alert.style.cursor = 'pointer';
                alert.style.transition = 'all 0.2s ease';
                
                // Determinar tipo de alerta
                const alertType = alert.classList.contains('warning') ? 'warning' : 
                                 alert.classList.contains('info') ? 'info' : 
                                 alert.classList.contains('danger') ? 'danger' : 'info';
                
                const alertTitle = alert.querySelector('.alert-title')?.textContent || 'Alerta';
                alert.setAttribute('aria-label', `${alertTitle}. Clic para ver detalles`);
                
                // Click handler
                alert.addEventListener('click', () => {
                    handleAlertClick(alert, alertType);
                });
                
                // Soporte de teclado
                alert.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleAlertClick(alert, alertType);
                    }
                });
                
                // Efectos hover
                alert.addEventListener('mouseenter', () => {
                    alert.style.transform = 'translateX(5px)';
                    alert.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                });
                
                alert.addEventListener('mouseleave', () => {
                    alert.style.transform = '';
                    alert.style.boxShadow = '';
                });
                
            } catch (error) {
                console.error(`❌ Error al inicializar alerta ${index}:`, error);
            }
        });
        
        console.log(`✅ ${alertItems.length} alertas inicializadas`);
    }

    function handleAlertClick(alert, alertType) {
        console.log(`⚠️ Alerta clickeada: ${alertType}`);
        
        // Navegar si tiene enlace
        const link = alert.getAttribute('data-link');
        if (link) {
            window.location.href = link;
            return;
        }
        
        // Feedback visual
        alert.style.transform = 'scale(0.98)';
        
        setTimeout(() => {
            alert.style.transform = '';
            
            // Redirigir según el tipo de alerta
            try {
                if (alertType === 'warning') {
                    window.location.href = 'inventario.html?filter=stock-bajo';
                } else if (alertType === 'info') {
                    window.location.href = 'facturacion.html?filter=pendientes';
                } else if (alertType === 'danger') {
                    window.location.href = 'dashboard.html';
                }
            } catch (error) {
                console.error('❌ Error al navegar desde alerta:', error);
                showErrorNotification('Error al navegar. Intenta de nuevo.');
            }
        }, 150);
    }

    // Inicializar navegación por teclado mejorada
    function initKeyboardNavigation() {
        // Manejo de Tab para navegación secuencial
        document.addEventListener('keydown', (e) => {
            // Mejora de navegación con teclado
            if (e.key === '?' && e.shiftKey) {
                // Mostrar ayuda de atajos de teclado
                showKeyboardShortcutsHelp();
            }
        });
    }

    function showKeyboardShortcutsHelp() {
        const helpPanel = document.createElement('div');
        helpPanel.className = 'keyboard-help-panel';
        helpPanel.setAttribute('role', 'dialog');
        helpPanel.setAttribute('aria-label', 'Atajos de teclado');
        helpPanel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            padding: 30px;
            width: 90%;
            max-width: 500px;
            z-index: 3000;
            animation: fadeIn 0.3s ease;
        `;
        
        helpPanel.innerHTML = `
            <h4 class="mb-3">⌨️ Atajos de Teclado</h4>
            <div class="mb-2"><kbd>Tab</kbd> - Navegar entre elementos</div>
            <div class="mb-2"><kbd>Enter</kbd> o <kbd>Espacio</kbd> - Activar elemento</div>
            <div class="mb-2"><kbd>Esc</kbd> - Cerrar diálogos</div>
            <div class="mb-4"><kbd>Shift + ?</kbd> - Mostrar esta ayuda</div>
            <button class="btn btn-primary w-100" id="closeHelpBtn">Cerrar</button>
        `;
        
        // Overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 2999;
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(helpPanel);
        
        const closeBtn = helpPanel.querySelector('#closeHelpBtn');
        const closeHelp = () => {
            overlay.remove();
            helpPanel.remove();
        };
        
        closeBtn.addEventListener('click', closeHelp);
        overlay.addEventListener('click', closeHelp);
        
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closeHelp();
                document.removeEventListener('keydown', escHandler);
            }
        });
        
        closeBtn.focus();
    }

    // Inicializar tarjetas de estadísticas
    /**
     * Cargar y renderizar estadísticas reales del sistema
     */
    function loadRealStatCards() {
        console.log('📊 Iniciando carga de estadísticas...');
        
        try {            
            // Verificar que MarketWorld.data esté disponible
            if (typeof MarketWorld === 'undefined') {
                console.error('❌ MarketWorld no está definido');
                loadFallbackStats();
                return;
            }
            
            if (!MarketWorld.data) {
                console.error('❌ MarketWorld.data no está disponible');
                loadFallbackStats();
                return;
            }
            
            console.log('✅ MarketWorld.data disponible');
            
            // 1. Calcular Crecimiento Mensual
            try {
                calculateMonthlyGrowth();
            } catch (e) {
                console.error('Error en calculateMonthlyGrowth:', e);
                document.getElementById('statGrowth').textContent = '0%';
            }
            
            // 2. Contar Clientes Activos
            try {
                calculateActiveClients();
            } catch (e) {
                console.error('Error en calculateActiveClients:', e);
                document.getElementById('statClients').textContent = '0';
            }
            
            // 3. Contar Productos en Stock
            try {
                calculateProductsInStock();
            } catch (e) {
                console.error('Error en calculateProductsInStock:', e);
                document.getElementById('statProducts').textContent = '0';
            }
            
            // 4. Calcular Ventas del Mes
            try {
                calculateMonthlySales();
            } catch (e) {
                console.error('Error en calculateMonthlySales:', e);
                document.getElementById('statSales').textContent = '$0';
            }
            
            // Animaciones de entrada
            animateStatCards();
            
            console.log('✅ Estadísticas reales cargadas');
            
        } catch (error) {
            console.error('❌ Error general al cargar estadísticas:', error);
            loadFallbackStats();
        }
    }
    
    /**
     * Calcular crecimiento mensual comparando mes actual vs anterior
     */
    function calculateMonthlyGrowth() {
        try {
            const facturas = MarketWorld.data.getInvoices();
            console.log(`📈 Calculando crecimiento - ${facturas.length} facturas encontradas`);
            
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            // Ventas del mes actual
            const currentMonthSales = facturas
                .filter(f => {
                    if (f.estado === 'Anulada' || f.estado === 'Cancelada' || !f.fechaCreacion) return false;
                    const date = new Date(f.fechaCreacion);
                    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                })
                .reduce((sum, f) => sum + (parseFloat(f.total) || 0), 0);
            
            // Ventas del mes anterior
            const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            
            const lastMonthSales = facturas
                .filter(f => {
                    if (f.estado === 'Anulada' || f.estado === 'Cancelada' || !f.fechaCreacion) return false;
                    const date = new Date(f.fechaCreacion);
                    return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
                })
                .reduce((sum, f) => sum + (parseFloat(f.total) || 0), 0);
            
            // Calcular porcentaje de crecimiento
            let growth = 0;
            if (lastMonthSales > 0) {
                growth = ((currentMonthSales - lastMonthSales) / lastMonthSales) * 100;
            } else if (currentMonthSales > 0) {
                growth = 100; // Si no había ventas el mes pasado pero hay este mes
            }
            
            const growthElement = document.getElementById('statGrowth');
            if (growthElement) {
                const sign = growth >= 0 ? '+' : '';
                const color = growth >= 0 ? 'text-success' : 'text-danger';
                const icon = growth >= 0 ? 'bi-arrow-up' : 'bi-arrow-down';
                growthElement.innerHTML = `
                    <span class="${color}">
                        ${sign}${growth.toFixed(1)}%
                        <i class="bi ${icon} ms-1"></i>
                    </span>
                `;
            }
            
        } catch (error) {
            console.error('Error al calcular crecimiento mensual:', error);
            const growthElement = document.getElementById('statGrowth');
            if (growthElement) growthElement.textContent = '0%';
        }
    }
    
    /**
     * Contar clientes activos
     */
    function calculateActiveClients() {
        try {
            const clientes = MarketWorld.data.getCustomers();
            const activeClients = clientes.filter(c => c.activo !== false).length;
            
            console.log(`👥 ${activeClients} clientes activos de ${clientes.length} totales`);
            
            const clientsElement = document.getElementById('statClients');
            if (clientsElement) {
                clientsElement.textContent = formatNumber(activeClients);
            }
            
        } catch (error) {
            console.error('Error al contar clientes activos:', error);
            const clientsElement = document.getElementById('statClients');
            if (clientsElement) clientsElement.textContent = '0';
        }
    }
    
    /**
     * Contar productos en stock
     */
    function calculateProductsInStock() {
        try {
            const productos = MarketWorld.data.getProducts();
            const totalProducts = productos.length;
            const totalStock = productos.reduce((sum, p) => sum + (parseInt(p.stock) || 0), 0);
            
            console.log(`📦 ${totalProducts} productos diferentes con ${totalStock} unidades totales`);
            
            const productsElement = document.getElementById('statProducts');
            if (productsElement) {
                productsElement.innerHTML = `
                    <div style="line-height: 1.2;">
                        <div style="font-size: 2rem; font-weight: 700;">${formatNumber(totalProducts)}</div>
                        <div style="font-size: 0.75rem; color: #64748b; margin-top: 4px;">${formatNumber(totalStock)} unidades</div>
                    </div>
                `;
            }
            
        } catch (error) {
            console.error('Error al contar productos en stock:', error);
            const productsElement = document.getElementById('statProducts');
            if (productsElement) productsElement.textContent = '0';
        }
    }
    
    /**
     * Calcular ventas del mes
     */
    function calculateMonthlySales() {
        try {
            const facturas = MarketWorld.data.getInvoices();
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            const monthlySales = facturas
                .filter(f => {
                    if (f.estado === 'Anulada' || f.estado === 'Cancelada' || !f.fechaCreacion) return false;
                    const date = new Date(f.fechaCreacion);
                    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                })
                .reduce((sum, f) => sum + (parseFloat(f.total) || 0), 0);
            
            console.log(`💰 Ventas del mes: ${formatCurrency(monthlySales)}`);
            
            const salesElement = document.getElementById('statSales');
            if (salesElement) {
                salesElement.textContent = formatCurrency(monthlySales);
            }
            
        } catch (error) {
            console.error('Error al calcular ventas del mes:', error);
            const salesElement = document.getElementById('statSales');
            if (salesElement) salesElement.textContent = '$0';
        }
    }
    
    /**
     * Datos de respaldo si el sistema no está disponible
     */
    function loadFallbackStats() {
        console.log('🔄 Cargando estadísticas de respaldo...');
        
        const stats = [
            { id: 'statGrowth', value: '0%' },
            { id: 'statClients', value: '0' },
            { id: 'statProducts', value: '0' },
            { id: 'statSales', value: '$0' }
        ];
        
        stats.forEach(stat => {
            const element = document.getElementById(stat.id);
            if (element) {
                element.textContent = stat.value;
                console.log(`✅ ${stat.id} establecido a ${stat.value}`);
            } else {
                console.warn(`⚠️ Elemento ${stat.id} no encontrado`);
            }
        });
        
        animateStatCards();
    }
    
    /**
     * Animaciones de entrada para las tarjetas
     */
    function animateStatCards() {
        const statCards = document.querySelectorAll('.stat-card');
        
        statCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
    
    /**
     * Formatear número con separadores de miles
     */
    function formatNumber(num) {
        if (typeof num !== 'number') num = parseFloat(num) || 0;
        return num.toLocaleString('es-ES');
    }
    
    /**
     * Formatear moneda
     */
    function formatCurrency(amount) {
        if (typeof amount !== 'number') amount = parseFloat(amount) || 0;
        
        // Formato compacto para números grandes
        if (amount >= 1000000) {
            return '$' + (amount / 1000000).toFixed(1) + 'M';
        } else if (amount >= 1000) {
            return '$' + (amount / 1000).toFixed(1) + 'K';
        }
        
        return '$' + amount.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    // ==================== FUNCIONES AUXILIARES ====================
    
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

    // Sanitizar texto para prevenir XSS
    function sanitizeText(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Escapar HTML para mostrar de forma segura
    function escapeHtml(text) {
        if (!text) return '';
        return sanitizeText(text);
    }

    // Mostrar notificación de éxito
    function showSuccessNotification(message) {
        showToast(message, 'success');
    }

    // Mostrar notificación de error
    function showErrorNotification(message) {
        showToast(message, 'error');
    }

    // Mostrar notificación de información
    function showInfoNotification(message) {
        showToast(message, 'info');
    }

    // Mostrar notificación de advertencia
    function showWarningNotification(message) {
        showToast(message, 'warning');
    }

    // Sistema de notificaciones toast
    function showToast(message, type = 'info') {
        const toastContainer = getOrCreateToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        toast.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 15px 20px;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease;
            min-width: 300px;
            max-width: 400px;
        `;
        
        const iconMap = {
            'success': { icon: 'bi-check-circle-fill', color: '#2ecc71', bg: '#d4edda' },
            'error': { icon: 'bi-x-circle-fill', color: '#e74c3c', bg: '#f8d7da' },
            'warning': { icon: 'bi-exclamation-triangle-fill', color: '#f39c12', bg: '#fff3cd' },
            'info': { icon: 'bi-info-circle-fill', color: '#3498db', bg: '#d1ecf1' }
        };
        
        const config = iconMap[type] || iconMap.info;
        toast.style.background = config.bg;
        toast.style.borderLeft = `4px solid ${config.color}`;
        
        const icon = document.createElement('i');
        icon.className = `bi ${config.icon}`;
        icon.style.color = config.color;
        icon.style.fontSize = '1.5rem';
        
        const text = document.createElement('span');
        text.style.flex = '1';
        text.textContent = message;
        
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-close btn-close-sm';
        closeBtn.setAttribute('aria-label', 'Cerrar notificación');
        closeBtn.style.cssText = 'background: none; border: none; cursor: pointer; opacity: 0.6;';
        closeBtn.innerHTML = '<i class="bi bi-x"></i>';
        closeBtn.addEventListener('click', () => removeToast(toast));
        
        toast.appendChild(icon);
        toast.appendChild(text);
        toast.appendChild(closeBtn);
        
        toastContainer.appendChild(toast);
        
        // Auto-remover después de 4 segundos
        setTimeout(() => removeToast(toast), 4000);
    }

    function getOrCreateToastContainer() {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                pointer-events: none;
            `;
            container.style.pointerEvents = 'auto';
            document.body.appendChild(container);
        }
        return container;
    }

    function removeToast(toast) {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    // Validar elementos del DOM antes de interactuar
    function validateElement(selector, name = 'Elemento') {
        const element = typeof selector === 'string' ? document.querySelector(selector) : selector;
        if (!element) {
            console.warn(`⚠️ ${name} no encontrado`);
            return false;
        }
        return true;
    }

    // ==================== EXPOSICIÓN DE API ====================
    
    // Exponer funciones del módulo para pruebas y control externo
    if (typeof window !== 'undefined') {
        window.MarketWorld = window.MarketWorld || {};
        window.MarketWorld.inicio = window.MarketWorld.inicio || {};
        
        // Funciones públicas (solo las que están activas, no las comentadas)
        window.MarketWorld.inicio.performSearch = performSearch;
        window.MarketWorld.inicio.showSearchResults = showSearchResults;
        window.MarketWorld.inicio.initQuickAccess = initQuickAccess;
        window.MarketWorld.inicio.initTasks = initTasks;
        window.MarketWorld.inicio.initAlerts = initAlerts;
        window.MarketWorld.inicio.showSuccessNotification = showSuccessNotification;
        window.MarketWorld.inicio.showErrorNotification = showErrorNotification;
        window.MarketWorld.inicio.showInfoNotification = showInfoNotification;
        window.MarketWorld.inicio.showWarningNotification = showWarningNotification;
        window.MarketWorld.inicio.debounce = debounce;
        
        // Estado del módulo (solo lectura recomendada)
        window.MarketWorld.inicio.getState = () => ({ ...moduleState });
    }

    // ==================== ESTILOS DINÁMICOS ====================
    
    // Agregar estilos para animaciones y componentes
    const style = document.createElement('style');
    style.textContent = `
        /* Animaciones */
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes slideOut {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(-20px);
            }
        }
        
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        @keyframes slideOutRight {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100px);
            }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        /* Componentes interactivos */
        .quick-access-card {
            transition: all 0.3s ease;
        }
        
        .task-item {
            transition: all 0.3s ease;
        }
        
        .task-item:hover {
            background: #f0f6ff !important;
            transform: translateX(5px);
        }
        
        .alert-item {
            transition: all 0.2s ease;
        }
        
        .search-result-item:hover {
            background: #f0f6ff !important;
        }
        
        .notification-item:hover {
            background: #f8f9fa !important;
        }
        
        /* Mejoras de accesibilidad */
        *:focus-visible {
            outline: 3px solid #0d6ef0 !important;
            outline-offset: 2px !important;
        }
        
        .visually-hidden {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border-width: 0;
        }
        
        /* Estilo para kbd */
        kbd {
            background-color: #f4f4f4;
            border: 1px solid #ccc;
            border-radius: 3px;
            box-shadow: 0 1px 0 rgba(0,0,0,0.2);
            color: #333;
            display: inline-block;
            font-family: monospace;
            font-size: 0.85em;
            line-height: 1;
            padding: 2px 6px;
            white-space: nowrap;
        }
        
        /* Scroll suave */
        html {
            scroll-behavior: smooth;
        }
        
        /* Mejoras de rendimiento */
        .notification-panel,
        .search-results-panel {
            will-change: transform, opacity;
        }
    `;
    document.head.appendChild(style);

    console.log('✅ Módulo inicio completamente inicializado y optimizado');

})();
