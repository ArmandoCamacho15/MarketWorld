
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        console.log(' Módulo Inicio cargado correctamente');
        
        // Verificar sesion
        checkSession();
        loadUserInfo();
        
        // Inicializar
        initLogout();
        initSearch();
        initQuickAccess();
        initNotifications();
        initTasks();
        initAlerts();
        
        // Inicializar sistema de notificaciones
        if (typeof MarketWorld.notifications !== 'undefined') {
            MarketWorld.notifications.init();
        }
    });

    // Verificar sesion activa
    function checkSession() {
        if (!MarketWorld.data.isLoggedIn()) {
            window.location.href = 'Login.html';
        }
    }

    // Cargar info del usuario
    function loadUserInfo() {
        var user = MarketWorld.data.getCurrentUser();
        if (user) {
            var userName = document.getElementById('userName');
            var userRole = document.getElementById('userRole');
            
            if (userName) userName.textContent = user.nombre + ' ' + user.apellido;
            if (userRole) userRole.textContent = user.rol;
        }
    }

    // Cerrar sesion
    function initLogout() {
        var logoutBtn = document.getElementById('logoutBtn');
        var logoutBtnTop = document.getElementById('logoutBtnTop');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        if (logoutBtnTop) {
            logoutBtnTop.addEventListener('click', handleLogout);
        }
    }

    function handleLogout(e) {
        e.preventDefault();
        
        if (confirm('¿Seguro que deseas cerrar sesion?')) {
            MarketWorld.data.logout();
            window.location.href = 'Login.html';
        }
    }

    // Búsqueda global en el sistema
    function initSearch() {
        const searchInput = document.getElementById('globalSearch');
        
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                const query = e.target.value.trim();
                if (query.length > 2) {
                    performSearch(query);
                }
            }, 300));

            // Búsqueda con Enter
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const query = e.target.value.trim();
                    if (query.length > 0) {
                        performSearch(query);
                    }
                }
            });
        }
    }

    function performSearch(query) {
        console.log(`🔍 Buscando: "${query}"`);
        
        // búsqueda
        const results = [
            { type: 'cliente', name: 'Juan Pérez', url: 'crm.html?id=1' },
            { type: 'producto', name: 'Laptop HP ProBook', url: 'inventario.html?sku=ELEC-1001' },
            { type: 'factura', name: 'FAC-2025-00128', url: 'facturacion.html?id=128' }
        ];

        
        showSearchResults(results);
    }

    function showSearchResults(results) {
        console.log('📋 Resultados de búsqueda:', results);
        // Aquí se mostraría un dropdown con los resultados
    }

    // Accesos rápidos a módulos
    function initQuickAccess() {
        const quickAccessCards = document.querySelectorAll('.quick-access-card');
        
        quickAccessCards.forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const targetUrl = card.getAttribute('href');
                console.log(`🚀 Navegando a: ${targetUrl}`);
                
                // clic
                card.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    card.style.transform = '';
                    window.location.href = targetUrl;
                }, 150);
            });

            // Efecto hover
            card.addEventListener('mouseenter', () => {
                card.style.boxShadow = '0 15px 30px rgba(13, 110, 240, 0.2)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.boxShadow = '';
            });
        });
    }

    // Notificaciones
    function initNotifications() {
        const bellButton = document.querySelector('[aria-label="Ver notificaciones"]');
        
        if (bellButton) {
            bellButton.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(' Abriendo notificaciones');
                showNotificationPanel();
            });
        }
    }

    function showNotificationPanel() {
        const notifications = [
            { type: 'warning', message: '5 productos con stock bajo', time: 'Hace 10 min' },
            { type: 'info', message: '3 facturas por vencer esta semana', time: 'Hace 1 hora' },
            { type: 'success', message: 'Nueva venta registrada: $1,250', time: 'Hace 2 horas' }
        ];

        console.log('📬 Notificaciones:', notifications);
        
        // Crear panel de notificaciones
        const panel = document.createElement('div');
        panel.className = 'notification-panel';
        panel.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            padding: 20px;
            width: 350px;
            z-index: 2000;
            animation: slideIn 0.3s ease;
        `;

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h5 style="margin: 0; color: #0d6ef0;">Notificaciones (${notifications.length})</h5>
                <button onclick="this.closest('.notification-panel').remove()" style="border: none; background: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
            </div>
            ${notifications.map(n => `
                <div style="padding: 12px; margin-bottom: 10px; border-left: 3px solid ${n.type === 'warning' ? '#f39c12' : n.type === 'info' ? '#3498db' : '#2ecc71'}; background: #f8f9fa; border-radius: 5px;">
                    <div style="font-weight: 600; margin-bottom: 5px;">${n.message}</div>
                    <div style="font-size: 0.85rem; color: #6c757d;">${n.time}</div>
                </div>
            `).join('')}
            <button class="btn btn-primary w-100 mt-2" onclick="this.closest('.notification-panel').remove()">Marcar todas como leídas</button>
        `;

        // Remover panel anterior si existe
        const existingPanel = document.querySelector('.notification-panel');
        if (existingPanel) existingPanel.remove();

        document.body.appendChild(panel);

        // Cerrar al hacer clic fuera
        setTimeout(() => {
            document.addEventListener('click', function closePanel(e) {
                if (!panel.contains(e.target)) {
                    panel.remove();
                    document.removeEventListener('click', closePanel);
                }
            });
        }, 100);
    }

    // Tareas pendientes interactivas
    function initTasks() {
        const taskItems = document.querySelectorAll('.task-item');
        
        taskItems.forEach(task => {
            task.addEventListener('click', () => {
                task.style.background = '#e8f5e9';
                console.log(' Tarea marcada como completada');
                
                setTimeout(() => {
                    task.style.opacity = '0';
                    setTimeout(() => task.remove(), 300);
                }, 1000);
            });

            task.style.cursor = 'pointer';
            task.title = 'Clic para marcar como completada';
        });
    }

    // Alertas interactivas
    function initAlerts() {
        const alertItems = document.querySelectorAll('.alert-item');
        
        alertItems.forEach(alert => {
            alert.style.cursor = 'pointer';
            alert.addEventListener('click', () => {
                const alertType = alert.classList.contains('warning') ? 'warning' : 
                                 alert.classList.contains('info') ? 'info' : 'danger';
                console.log(`⚠️ Alerta clickeada: ${alertType}`);
                
                // Redirigir según el tipo de alerta
                if (alertType === 'warning') {
                    window.location.href = 'inventario.html?filter=stock-bajo';
                } else if (alertType === 'info') {
                    window.location.href = 'facturacion.html?filter=pendientes';
                }
            });
        });
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

    // Agregar estilos para animaciones
    const style = document.createElement('style');
    style.textContent = `
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
    `;
    document.head.appendChild(style);

})();
