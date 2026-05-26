// notifications.js - Sistema de notificaciones

(function(global) {
    'use strict';

    var notificationBell = null;
    var notificationBadge = null;
    var notificationDropdown = null;
    var notificationsList = null;
    var toastContainer = null;
    var notificationCache = [];
    var notificationMeta = { unread_count: 0 };

    // Init

    function init() {
        // --- Buscar elementos del DOM ---
        notificationBell = document.getElementById('notificationBell');
        notificationBadge = document.getElementById('notificationBadge');
        notificationDropdown = document.getElementById('notificationDropdown');
        notificationsList = document.getElementById('notificationsList');

        if (!notificationBell || !notificationBadge || !notificationsList) {
            console.error('Elementos de notificaciones no encontrados');
            return;
        }

        // Eventos
        notificationBell.addEventListener('click', toggleDropdown);
        notificationsList.addEventListener('click', handleNotificationAction);
        
        // --- Cerrar dropdown al hacer clic fuera ---
        document.addEventListener('click', function(e) {
            if (!notificationBell.contains(e.target) && !notificationDropdown.contains(e.target)) {
                closeDropdown();
            }
        });

        // --- Cargar notificaciones ---
        updateNotifications();
        updateBadge();
        ensureToastContainer();

        // --- Verificar notificaciones cada 30 segundos ---
        setInterval(function() {
            updateBadge();
        }, 30000);

        console.log('Sistema de notificaciones inicializado');
    }

    function ensureToastContainer() {
        if (toastContainer) return toastContainer;

        toastContainer = document.getElementById('marketworldToastContainer');
        if (toastContainer) return toastContainer;

        toastContainer = document.createElement('div');
        toastContainer.id = 'marketworldToastContainer';
        toastContainer.style.position = 'fixed';
        toastContainer.style.top = '16px';
        toastContainer.style.right = '16px';
        toastContainer.style.zIndex = '2000';
        toastContainer.style.display = 'flex';
        toastContainer.style.flexDirection = 'column';
        toastContainer.style.gap = '10px';
        document.body.appendChild(toastContainer);

        return toastContainer;
    }

    function hasBackendAPI() {
        return !!(MarketWorld && MarketWorld.api && MarketWorld.api.notifications);
    }

    function normalizeType(tipo) {
        var normalized = String(tipo || 'info').toLowerCase();
        if (normalized === 'notificación' || normalized === 'notificacion' || normalized === 'email' || normalized === 'sms' || normalized === 'push') {
            return 'info';
        }
        if (normalized === 'success' || normalized === 'warning' || normalized === 'danger' || normalized === 'info') {
            return normalized;
        }
        return 'info';
    }

    function normalizeNotification(notif) {
        return {
            id: notif.id,
            tipo: normalizeType(notif.tipo),
            titulo: notif.titulo || notif.title || 'Notificación',
            mensaje: notif.mensaje || notif.message || '',
            enlace: notif.enlace || notif.link || null,
            leida: !!notif.leida,
            fechaCreacion: notif.fechaCreacion || notif.created_at || new Date().toISOString(),
        };
    }

    function setNotificationState(notifications, meta) {
        notificationCache = (notifications || []).map(normalizeNotification);
        notificationMeta = meta || {};
    }

    function getNotificationCount() {
        return typeof notificationMeta.unread_count === 'number'
            ? notificationMeta.unread_count
            : notificationCache.filter(function(n) { return !n.leida; }).length;
    }

    function refreshNotifications(options) {
        options = options || {};

        if (!hasBackendAPI()) {
            setNotificationState([], { unread_count: 0 });
            if (!options.silent) {
                renderNotifications(notificationCache);
                updateBadge();
            }
            return Promise.resolve(notificationCache);
        }

        return MarketWorld.api.notifications.getAll()
            .then(function(response) {
                var payload = response || {};
                var items = Array.isArray(payload.data) ? payload.data : [];
                setNotificationState(items, payload.meta || {});
                if (!options.silent) {
                    renderNotifications(notificationCache);
                    updateBadge();
                }
                return notificationCache;
            })
            .catch(function(error) {
                console.warn('[Notifications] No se pudieron cargar notificaciones del backend:', error);
                if (!options.silent) {
                    renderNotifications(notificationCache);
                    updateBadge();
                }
                return notificationCache;
            });
    }

    function showToast(message, tipo) {
        var container = ensureToastContainer();
        if (!container) return;

        var toast = document.createElement('div');
        var palette = {
            success: { bg: '#d1e7dd', border: '#198754', text: '#0f5132' },
            warning: { bg: '#fff3cd', border: '#ffc107', text: '#664d03' },
            danger: { bg: '#f8d7da', border: '#dc3545', text: '#842029' },
            info: { bg: '#cfe2ff', border: '#0d6efd', text: '#084298' },
        };
        var colors = palette[tipo] || palette.info;

        toast.style.minWidth = '280px';
        toast.style.maxWidth = '380px';
        toast.style.padding = '12px 14px';
        toast.style.borderRadius = '10px';
        toast.style.border = '1px solid ' + colors.border;
        toast.style.background = colors.bg;
        toast.style.color = colors.text;
        toast.style.boxShadow = '0 10px 24px rgba(0,0,0,0.14)';
        toast.style.fontSize = '0.92rem';
        toast.style.lineHeight = '1.35';
        toast.style.display = 'flex';
        toast.style.justifyContent = 'space-between';
        toast.style.alignItems = 'flex-start';
        toast.style.gap = '12px';

        var label = document.createElement('strong');
        label.textContent = tipo ? String(tipo).toUpperCase() : 'INFO';
        label.style.display = 'block';
        label.style.marginBottom = '4px';

        var textWrap = document.createElement('div');
        textWrap.appendChild(label);
        textWrap.appendChild(document.createTextNode(message));

        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '×';
        closeBtn.style.border = '0';
        closeBtn.style.background = 'transparent';
        closeBtn.style.fontSize = '1.2rem';
        closeBtn.style.lineHeight = '1';
        closeBtn.style.color = 'inherit';
        closeBtn.style.cursor = 'pointer';

        closeBtn.addEventListener('click', function() {
            if (toast && toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });

        toast.appendChild(textWrap);
        toast.appendChild(closeBtn);
        container.appendChild(toast);

        window.setTimeout(function() {
            if (toast && toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3500);
    }

    // --- UI Functions ---

    function toggleDropdown() {
        if (notificationDropdown.style.display === 'block') {
            closeDropdown();
        } else {
            openDropdown();
        }
    }

    function openDropdown() {
        refreshNotifications();
        notificationDropdown.style.display = 'block';
    }

    function closeDropdown() {
        notificationDropdown.style.display = 'none';
    }

    function updateBadge() {
        if (!notificationBadge) return;
        
        var count = getNotificationCount();
        var notifications = notificationCache.slice();
        var dangerCount = notifications.filter(function(n) { return !n.leida && n.tipo === 'danger'; }).length;

        if (count > 0) {
            notificationBadge.textContent = count > 99 ? '99+' : count;
            notificationBadge.style.display = 'inline-block';
            if (dangerCount > 0) {
                notificationBadge.classList.add('danger-unread');
                notificationBadge.setAttribute('title', dangerCount + ' alerta(s) críticas');
            } else {
                notificationBadge.classList.remove('danger-unread');
                notificationBadge.removeAttribute('title');
            }
        } else {
            notificationBadge.style.display = 'none';
            notificationBadge.classList.remove('danger-unread');
            notificationBadge.removeAttribute('title');
        }
    }

    function updateNotifications() {
        renderNotifications(notificationCache);
    }

    function renderNotifications(notifications) {
        if (!notificationsList) return;

        notificationsList.innerHTML = '';

        // ======= HEADER CON ACCIONES =======
        var header = document.createElement('div');
        header.className = 'notification-header';
        header.innerHTML = `
            <h6 class="mb-0">Notificaciones</h6>
            <div>
                <button class="btn btn-link btn-sm p-0 me-2" data-action="mark-all" title="Marcar todas como leídas">
                    <i class="bi bi-check2-all"></i>
                </button>
                <button class="btn btn-link btn-sm p-0 text-danger me-2" data-action="delete-read" title="Eliminar leídas">
                    <i class="bi bi-trash3"></i>
                </button>
                <button class="btn btn-link btn-sm p-0 text-danger" data-action="delete-all" title="Eliminar todas">
                    <i class="bi bi-trash-fill"></i>
                </button>
            </div>
        `;
        notificationsList.appendChild(header);

        if (notifications.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'notification-item text-center text-muted py-4';
            empty.innerHTML = '<i class="bi bi-bell-slash fs-3 d-block mb-2"></i>No hay notificaciones';
            notificationsList.appendChild(empty);
            return;
        }

        // ======= MOSTRAR ÚLTIMAS 10 NOTIFICACIONES =======
        notifications.slice(0, 10).forEach(function(notif) {
            var item = createNotificationItem(notif);
            notificationsList.appendChild(item);
        });

        // ======= FOOTER CON LINK A VER TODAS =======
        if (notifications.length > 10) {
            var footer = document.createElement('div');
            footer.className = 'notification-footer';
            footer.innerHTML = `
                <a href="#" class="text-decoration-none">
                    Ver todas las notificaciones (${notifications.length})
                </a>
            `;
            notificationsList.appendChild(footer);
        }
    }

    function createNotificationItem(notif) {
        var item = document.createElement('div');
        item.className = 'notification-item' + (notif.leida ? '' : ' unread');
        item.dataset.id = notif.id;

        var iconClass = getIconClass(notif.tipo);
        var timeAgo = getTimeAgo(notif.fechaCreacion);

        item.innerHTML = `
            <div class="notification-icon ${notif.tipo}">
                <i class="bi ${iconClass}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notif.titulo}</div>
                <div class="notification-message">${notif.mensaje}</div>
                <div class="notification-time">${timeAgo}</div>
            </div>
            <div class="notification-actions">
                ${!notif.leida ? `<button class="btn btn-link btn-sm p-0" data-action="mark-read" data-id="${notif.id}" title="Marcar como leída"><i class="bi bi-check2"></i></button>` : ''}
                <button class="btn btn-link btn-sm p-0" data-action="delete" data-id="${notif.id}" title="Eliminar"><i class="bi bi-trash"></i></button>
            </div>
        `;

        // ======= ENLACE CLICKEABLE =======
        if (notif.enlace) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function(e) {
                if (!e.target.closest('.notification-actions')) {
                    window.location.href = notif.enlace;
                }
            });
        }

        return item;
    }

    function handleNotificationAction(event) {
        var button = event.target.closest('button[data-action]');
        if (!button) return;

        event.preventDefault();
        event.stopPropagation();

        var action = button.dataset.action;
        var rawId = button.dataset.id;
        var notificationId = rawId ? parseInt(rawId, 10) : null;

        if (action === 'mark-read' && notificationId) {
            markAsRead(notificationId);
            return;
        }

        if (action === 'delete' && notificationId) {
            deleteNotif(notificationId);
            return;
        }

        if (action === 'mark-all') {
            markAllAsRead();
            return;
        }

        if (action === 'delete-read') {
            deleteAllRead();
            return;
        }

        if (action === 'delete-all') {
            deleteAll();
        }
    }

    function getIconClass(tipo) {
        switch (tipo) {
            case 'success': return 'bi-check-circle-fill';
            case 'warning': return 'bi-exclamation-triangle-fill';
            case 'danger': return 'bi-x-circle-fill';
            default: return 'bi-info-circle-fill';
        }
    }

    function getTimeAgo(fechaISO) {
        var fecha = new Date(fechaISO);
        var ahora = new Date();
        var diff = Math.floor((ahora - fecha) / 1000); // segundos

        if (diff < 60) return 'Hace unos segundos';
        if (diff < 3600) {
            var mins = Math.floor(diff / 60);
            return 'Hace ' + mins + ' minuto' + (mins > 1 ? 's' : '');
        }
        if (diff < 86400) {
            var hours = Math.floor(diff / 3600);
            return 'Hace ' + hours + ' hora' + (hours > 1 ? 's' : '');
        }
        var days = Math.floor(diff / 86400);
        if (days === 1) return 'Ayer';
        if (days < 7) return 'Hace ' + days + ' días';
        if (days < 30) {
            var weeks = Math.floor(days / 7);
            return 'Hace ' + weeks + ' semana' + (weeks > 1 ? 's' : '');
        }
        return fecha.toLocaleDateString('es-CO');
    }

    // ======= PUBLIC ACTIONS =======

    function markAsRead(notificationId) {
        if (!hasBackendAPI()) return;

        MarketWorld.api.notifications.markRead(notificationId)
            .then(function() {
                return refreshNotifications();
            })
            .catch(function(error) {
                console.warn('[Notifications] No se pudo marcar como leída:', error);
            });
    }

    function markAllAsRead() {
        if (!hasBackendAPI()) return;

        MarketWorld.api.notifications.markAllRead()
            .then(function() {
                return refreshNotifications();
            })
            .catch(function(error) {
                console.warn('[Notifications] No se pudieron marcar todas como leídas:', error);
            });
    }

    function deleteNotif(notificationId) {
        if (confirm('¿Eliminar esta notificación?')) {
            if (!hasBackendAPI()) return;

            MarketWorld.api.notifications.delete(notificationId)
                .then(function() {
                    return refreshNotifications();
                })
                .catch(function(error) {
                    console.warn('[Notifications] No se pudo eliminar la notificación:', error);
                });
        }
    }

    function deleteAllRead() {
        var notifications = notificationCache.slice();
        var readCount = notifications.filter(function(n) { return n.leida; }).length;
        
        if (readCount === 0) {
            alert('No hay notificaciones leídas para eliminar');
            return;
        }
        
        if (confirm('¿Eliminar ' + readCount + ' notificación' + (readCount > 1 ? 'es' : '') + ' leída' + (readCount > 1 ? 's' : '') + '?')) {
            if (!hasBackendAPI()) return;

            MarketWorld.api.notifications.deleteRead()
                .then(function() {
                    return refreshNotifications();
                })
                .catch(function(error) {
                    console.warn('[Notifications] No se pudieron eliminar las notificaciones leídas:', error);
                });
        }
    }

    function deleteAll() {
        var notifications = notificationCache.slice();
        
        if (notifications.length === 0) {
            alert('No hay notificaciones para eliminar');
            return;
        }
        
        if (confirm('¿Eliminar TODAS las ' + notifications.length + ' notificaciones?')) {
            if (!hasBackendAPI()) return;

            MarketWorld.api.notifications.deleteAll()
                .then(function() {
                    return refreshNotifications();
                })
                .catch(function(error) {
                    console.warn('[Notifications] No se pudieron eliminar todas las notificaciones:', error);
                });
        }
    }

    function createNotification(tipo, titulo, mensaje, enlace) {
        if (!hasBackendAPI()) {
            return Promise.resolve(null);
        }

        return MarketWorld.api.notifications.create({
            tipo: normalizeType(tipo),
            titulo: titulo,
            mensaje: mensaje,
            enlace: enlace
        }).then(function() {
            return refreshNotifications();
        });
    }

    function show(message, tipo) {
        var normalizedType = tipo || 'info';
        createNotification(normalizedType, normalizedType === 'success' ? 'Éxito' : 'Notificación', String(message), null);
        showToast(String(message), normalizedType);
    }

    // ======= AUTO NOTIFICATIONS =======

    function checkLowStock() {
        if (!hasBackendAPI() || !MarketWorld.api.products) {
            return Promise.resolve([]);
        }

        return MarketWorld.api.products.stockBajo()
            .then(function(response) {
                var lowStockProducts = (response && response.data) || [];
                console.log('[Notifications] checkLowStock found:', lowStockProducts.length);

                var now = new Date();
                var pending = [];

                lowStockProducts.forEach(function(product) {
                    var exists = notificationCache.some(function(n) {
                        return n.titulo.indexOf(product.nombre) !== -1 &&
                            n.tipo === 'danger' &&
                            (now - new Date(n.fechaCreacion)) < (24 * 60 * 60 * 1000);
                    });

                    if (!exists) {
                        pending.push(createNotification(
                            'danger',
                            'Stock Bajo: ' + product.nombre,
                            'Quedan ' + product.stock + ' unidades. Stock mínimo: ' + product.stockMinimo,
                            'inventario.html'
                        ));
                    }
                });

                return Promise.all(pending);
            })
            .catch(function(error) {
                console.warn('[Notifications] No se pudo verificar stock bajo:', error);
                return [];
            });
    }

    function notifyNewUser(userName) {
        createNotification(
            'info',
            'Nuevo Usuario Registrado',
            userName + ' se ha registrado en el sistema',
            'configuracion.html'
        );
    }

    function notifyProductCreated(productName) {
        createNotification(
            'success',
            'Producto Creado',
            productName + ' ha sido agregado al inventario',
            'inventario.html'
        );
    }

    function notifyProductDeleted(productName) {
        createNotification(
            'danger',
            'Producto Eliminado',
            productName + ' ha sido eliminado del inventario',
            'inventario.html'
        );
    }

    function notifyStockUpdate(productName, oldStock, newStock) {
        var tipo = newStock > oldStock ? 'success' : 'warning';
        var mensaje = 'Stock actualizado de ' + oldStock + ' a ' + newStock + ' unidades';
        
        createNotification(
            tipo,
            'Stock Actualizado: ' + productName,
            mensaje,
            'inventario.html'
        );
    }

    // ======= PUBLIC API =======

    global.MarketWorld = global.MarketWorld || {};
    global.MarketWorld.notifications = {
        init: init,
        show: show,
        refresh: refreshNotifications,
        markAsRead: markAsRead,
        markAllAsRead: markAllAsRead,
        deleteNotif: deleteNotif,
        deleteAllRead: deleteAllRead,
        deleteAll: deleteAll,
        create: createNotification,
        checkLowStock: checkLowStock,
        notifyNewUser: notifyNewUser,
        notifyProductCreated: notifyProductCreated,
        notifyProductDeleted: notifyProductDeleted,
        notifyStockUpdate: notifyStockUpdate,
        update: updateNotifications,
        updateBadge: updateBadge
    };

})(window);
