// notifications.js - Sistema de notificaciones

(function(global) {
    'use strict';

    var notificationBell = null;
    var notificationBadge = null;
    var notificationDropdown = null;
    var notificationsList = null;

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
        
        // --- Cerrar dropdown al hacer clic fuera ---
        document.addEventListener('click', function(e) {
            if (!notificationBell.contains(e.target) && !notificationDropdown.contains(e.target)) {
                closeDropdown();
            }
        });

        // --- Cargar notificaciones ---
        updateNotifications();
        updateBadge();

        // --- Verificar notificaciones cada 30 segundos ---
        setInterval(function() {
            updateBadge();
        }, 30000);

        console.log('Sistema de notificaciones inicializado');
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
        updateNotifications();
        notificationDropdown.style.display = 'block';
    }

    function closeDropdown() {
        notificationDropdown.style.display = 'none';
    }

    function updateBadge() {
        if (!notificationBadge) return;
        
        var count = MarketWorld.data.getUnreadCount();
        
        if (count > 0) {
            notificationBadge.textContent = count > 99 ? '99+' : count;
            notificationBadge.style.display = 'inline-block';
        } else {
            notificationBadge.style.display = 'none';
        }
    }

    function updateNotifications() {
        var notifications = MarketWorld.data.getNotifications();
        
        if (!notificationsList) return;

        notificationsList.innerHTML = '';

        // ======= HEADER CON ACCIONES =======
        var header = document.createElement('div');
        header.className = 'notification-header';
        header.innerHTML = `
            <h6 class="mb-0">Notificaciones</h6>
            <div>
                <button class="btn btn-link btn-sm p-0 me-2" onclick="MarketWorld.notifications.markAllAsRead()" title="Marcar todas como leídas">
                    <i class="bi bi-check2-all"></i>
                </button>
                <button class="btn btn-link btn-sm p-0 text-danger me-2" onclick="MarketWorld.notifications.deleteAllRead()" title="Eliminar leídas">
                    <i class="bi bi-trash3"></i>
                </button>
                <button class="btn btn-link btn-sm p-0 text-danger" onclick="MarketWorld.notifications.deleteAll()" title="Eliminar todas">
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
                ${!notif.leida ? '<button class="btn btn-link btn-sm p-0" onclick="MarketWorld.notifications.markAsRead(' + notif.id + ')" title="Marcar como leída"><i class="bi bi-check2"></i></button>' : ''}
                <button class="btn btn-link btn-sm p-0" onclick="MarketWorld.notifications.deleteNotif(' + notif.id + ')" title="Eliminar"><i class="bi bi-trash"></i></button>
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
        MarketWorld.data.markNotificationAsRead(notificationId);
        updateNotifications();
        updateBadge();
    }

    function markAllAsRead() {
        MarketWorld.data.markAllNotificationsAsRead();
        updateNotifications();
        updateBadge();
    }

    function deleteNotif(notificationId) {
        if (confirm('¿Eliminar esta notificación?')) {
            MarketWorld.data.deleteNotification(notificationId);
            updateNotifications();
            updateBadge();
        }
    }

    function deleteAllRead() {
        var notifications = MarketWorld.data.getNotifications();
        var readCount = notifications.filter(function(n) { return n.leida; }).length;
        
        if (readCount === 0) {
            alert('No hay notificaciones leídas para eliminar');
            return;
        }
        
        if (confirm('¿Eliminar ' + readCount + ' notificación' + (readCount > 1 ? 'es' : '') + ' leída' + (readCount > 1 ? 's' : '') + '?')) {
            MarketWorld.data.deleteReadNotifications();
            updateNotifications();
            updateBadge();
        }
    }

    function deleteAll() {
        var notifications = MarketWorld.data.getNotifications();
        
        if (notifications.length === 0) {
            alert('No hay notificaciones para eliminar');
            return;
        }
        
        if (confirm('¿Eliminar TODAS las ' + notifications.length + ' notificaciones?')) {
            MarketWorld.data.deleteAllNotifications();
            updateNotifications();
            updateBadge();
        }
    }

    function createNotification(tipo, titulo, mensaje, enlace) {
        MarketWorld.data.createNotification({
            tipo: tipo,
            titulo: titulo,
            mensaje: mensaje,
            enlace: enlace
        });
        updateBadge();
        
        // ======= ACTUALIZAR DROPDOWN ABIERTO =======
        if (notificationDropdown && notificationDropdown.style.display === 'block') {
            updateNotifications();
        }
    }

    // ======= AUTO NOTIFICATIONS =======

    function checkLowStock() {
        var lowStockProducts = MarketWorld.data.getLowStockProducts();
        
        if (lowStockProducts.length > 0) {
            lowStockProducts.forEach(function(product) {
                // ======= VERIFICAR NOTIFICACIÓN SIMILAR RECIENTE =======
                var notifications = MarketWorld.data.getNotifications();
                var exists = notifications.some(function(n) {
                    return n.titulo.includes(product.nombre) && 
                           n.tipo === 'warning' &&
                           // ======= ÚLTIMAS 24H =======
                });

                if (!exists) {
                    createNotification(
                        'warning',
                        'Stock Bajo: ' + product.nombre,
                        'Quedan ' + product.stock + ' unidades. Stock mínimo: ' + product.stockMinimo,
                        'inventario.html'
                    );
                }
            });
        }
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
