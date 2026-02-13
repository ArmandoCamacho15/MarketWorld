// configuracion.js - Gestion de usuarios y configuracion

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', function() {
        console.log('Modulo Configuracion cargado');
        initUserManagement();
    });

    // --- Gestión de usuarios ---
    function initUserManagement() {
        loadUsers();
        initNewUserButton();
        initUserForm();
        initUserActions();
        initFilter();
        
        // Inicializar sistema de notificaciones
        if (typeof MarketWorld.notifications !== 'undefined') {
            MarketWorld.notifications.init();
        }
    }

    // --- Cargar lista de usuarios ---
    function loadUsers() {
        var users = MarketWorld.data.getUsers();
        var container = document.getElementById('usersList');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        if (users.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No hay usuarios registrados</div>';
            return;
        }
        
        users.forEach(function(user) {
            var userCard = createUserCard(user);
            container.appendChild(userCard);
        });
    }

    // --- Crear tarjeta de usuario ---
    function createUserCard(user) {
        var col = document.createElement('div');
        col.className = 'col-md-4 mb-3';
        
        var roleBadgeClass = user.rol === 'Administrador' ? 'badge-admin' : 
                             user.rol === 'Vendedor' ? 'badge-seller' : 'badge-user';
        
        var statusBadgeClass = user.estado === 'Activo' ? 'status-active' : 'status-inactive';
        
        // Obtener iniciales para el avatar
        var iniciales = user.nombre.charAt(0) + user.apellido.charAt(0);
        
        col.innerHTML = `
            <div class="user-card">
                <div class="text-center">
                    <div class="user-avatar" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; margin: 0 auto 15px;">
                        ${iniciales}
                    </div>
                    <h5>${user.nombre} ${user.apellido}</h5>
                    <div class="role-badge ${roleBadgeClass}">${user.rol}</div>
                    <div class="status-badge ${statusBadgeClass} mt-2">${user.estado}</div>
                </div>
                <div class="mt-3">
                    <div class="d-flex justify-content-between mb-2">
                        <span><i class="bi bi-envelope me-2"></i> Email:</span>
                        <span class="text-truncate" style="max-width: 150px;">${user.email}</span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span><i class="bi bi-calendar me-2"></i> Registro:</span>
                        <span>${user.fechaCreacion}</span>
                    </div>
                </div>
                <div class="action-buttons mt-3">
                    <button class="btn btn-sm btn-outline-warning flex-grow-1 btn-edit-user" data-user-id="${user.id}">
                        <i class="bi bi-pencil me-1"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-outline-${user.estado === 'Activo' ? 'secondary' : 'success'} flex-grow-1 btn-toggle-status" data-user-id="${user.id}">
                        <i class="bi bi-${user.estado === 'Activo' ? 'pause' : 'play'}-circle me-1"></i> 
                        ${user.estado === 'Activo' ? 'Desactivar' : 'Activar'}
                    </button>
                    <button class="btn btn-sm btn-outline-danger flex-grow-1 btn-delete-user" data-user-id="${user.id}">
                        <i class="bi bi-trash me-1"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
        
        return col;
    }

    // Boton nuevo usuario
    function initNewUserButton() {
        var btnNew = document.querySelector('[data-bs-target="#userModal"]');
        if (btnNew) {
            btnNew.addEventListener('click', function() {
                resetUserForm();
                document.getElementById('userModalLabel').textContent = 'Nuevo Usuario';
                document.getElementById('userId').value = '';
            });
        }
    }

    // Formulario de usuario
    function initUserForm() {
        var form = document.getElementById('userForm');
        if (!form) return;
        
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            saveUser();
        });
    }

    // Inicializar acciones de usuarios (delegacion de eventos)
    function initUserActions() {
        var container = document.getElementById('usersList');
        console.log('initUserActions - container:', container);
        if (!container) {
            console.error('ERROR: No se encontro el contenedor usersList');
            return;
        }
        
        container.addEventListener('click', function(e) {
            console.log('Click detectado en usersList');
            var target = e.target.closest('button');
            console.log('Target button:', target);
            if (!target) return;
            
            var userId = target.getAttribute('data-user-id');
            console.log('userId:', userId);
            if (!userId) return;
            
            if (target.classList.contains('btn-edit-user')) {
                console.log('Ejecutando editUser para ID:', userId);
                editUser(parseInt(userId));
            } else if (target.classList.contains('btn-toggle-status')) {
                console.log('Ejecutando toggleStatus para ID:', userId);
                toggleStatus(parseInt(userId));
            } else if (target.classList.contains('btn-delete-user')) {
                console.log('Ejecutando deleteUserConfirm para ID:', userId);
                deleteUserConfirm(parseInt(userId));
            }
        });
        
        console.log('Event listener agregado a usersList');
    }

    // Guardar usuario
    function saveUser() {
        var userId = document.getElementById('userId').value;
        var nombre = document.getElementById('userNombre').value.trim();
        var apellido = document.getElementById('userApellido').value.trim();
        var email = document.getElementById('userEmail').value.trim();
        var password = document.getElementById('userPassword').value;
        var rol = document.getElementById('userRol').value;
        var estado = document.getElementById('userEstado').value;
        
        if (!nombre || !apellido || !email) {
            alert('Por favor completa todos los campos obligatorios');
            return;
        }
        
        if (!userId && !password) {
            alert('La contraseña es obligatoria para nuevos usuarios');
            return;
        }
        
        var userData = {
            nombre: nombre,
            apellido: apellido,
            email: email,
            rol: rol,
            estado: estado
        };

        if (password) {
            userData.password = password;
        }

        var result;
        if (userId) {
            result = MarketWorld.data.updateUser(userId, userData);
        } else {
            result = MarketWorld.data.registerUser(userData);
            
            // Notificar nuevo usuario registrado
            if (result.success && typeof MarketWorld.notifications !== 'undefined') {
                MarketWorld.notifications.notifyNewUser(nombre + ' ' + apellido);
            }
        }

        if (result.success) {
            alert(result.message);
            loadUsers();
            var modal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
            if (modal) modal.hide();
        } else {
            alert('Error: ' + result.message);
        }
    }

    // Editar usuario
    function editUser(id) {
        console.log('editUser llamado con id:', id);
        var user = MarketWorld.data.findUserById(id);
        console.log('Usuario encontrado:', user);
        if (!user) {
            alert('Usuario no encontrado');
            return;
        }
        
        document.getElementById('userId').value = user.id;
        document.getElementById('userNombre').value = user.nombre;
        document.getElementById('userApellido').value = user.apellido;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userPassword').value = '';
        document.getElementById('userRol').value = user.rol;
        document.getElementById('userEstado').value = user.estado;
        
        document.getElementById('userModalLabel').textContent = 'Editar Usuario';
        
        var modal = new bootstrap.Modal(document.getElementById('userModal'));
        modal.show();
    }

    // Cambiar estado
    function toggleStatus(id) {
        console.log('toggleStatus llamado con id:', id);
        var user = MarketWorld.data.findUserById(id);
        console.log('Usuario encontrado:', user);
        if (!user) return;
        
        var accion = user.estado === 'Activo' ? 'desactivar' : 'activar';
        if (confirm('¿Seguro que deseas ' + accion + ' a ' + user.nombre + '?')) {
            var result = MarketWorld.data.toggleUserStatus(id);
            if (result.success) {
                loadUsers();
            } else {
                alert('Error: ' + result.message);
            }
        }
    }

    // Eliminar usuario
    function deleteUserConfirm(id) {
        console.log('deleteUserConfirm llamado con id:', id);
        var user = MarketWorld.data.findUserById(id);
        console.log('Usuario encontrado:', user);
        if (!user) return;
        
        if (confirm('¿ELIMINAR permanentemente a ' + user.nombre + ' ' + user.apellido + '?\n\nEsta acción no se puede deshacer.')) {
            var result = MarketWorld.data.deleteUser(id);
            if (result.success) {
                alert(result.message);
                loadUsers();
            } else {
                alert('Error: ' + result.message);
            }
        }
    }

    // Limpiar formulario
    function resetUserForm() {
        document.getElementById('userId').value = '';
        document.getElementById('userNombre').value = '';
        document.getElementById('userApellido').value = '';
        document.getElementById('userEmail').value = '';
        document.getElementById('userPassword').value = '';
        document.getElementById('userRol').value = 'Usuario';
        document.getElementById('userEstado').value = 'Activo';
    }

    // Inicializar filtros
    function initFilter() {
        var btnFilter = document.getElementById('btnFilter');
        if (!btnFilter) return;
        
        btnFilter.addEventListener('click', filterUsers);
        
        // Filtrar en tiempo real al cambiar busqueda
        var searchInput = document.getElementById('filterSearch');
        if (searchInput) {
            searchInput.addEventListener('input', filterUsers);
        }
    }

    // Filtrar usuarios
    function filterUsers() {
        var filterRol = document.getElementById('filterRol').value.toLowerCase();
        var filterEstado = document.getElementById('filterEstado').value.toLowerCase();
        var filterSearch = document.getElementById('filterSearch').value.toLowerCase();
        
        var users = MarketWorld.data.getUsers();
        
        var filteredUsers = users.filter(function(user) {
            var matchRol = !filterRol || user.rol.toLowerCase() === filterRol;
            var matchEstado = !filterEstado || user.estado.toLowerCase() === filterEstado;
            var matchSearch = !filterSearch || 
                user.nombre.toLowerCase().includes(filterSearch) ||
                user.apellido.toLowerCase().includes(filterSearch) ||
                user.email.toLowerCase().includes(filterSearch);
            
            return matchRol && matchEstado && matchSearch;
        });
        
        displayFilteredUsers(filteredUsers);
    }

    // Mostrar usuarios filtrados
    function displayFilteredUsers(users) {
        var container = document.getElementById('usersList');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (users.length === 0) {
            container.innerHTML = '<div class="col-12"><div class="alert alert-info">No se encontraron usuarios con los filtros seleccionados</div></div>';
            return;
        }
        
        users.forEach(function(user) {
            var userCard = createUserCard(user);
            container.appendChild(userCard);
        });
    }

})();