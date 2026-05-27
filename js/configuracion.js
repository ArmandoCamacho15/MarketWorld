// configuracion.js - Gestion de usuarios y configuracion

(function() {
    'use strict';

    var usersCache = [];
    var currentUserFilters = { per_page: 100 };
    var filterSearchTimer = null;
    var rolesCache = [];
    var permissionsCache = [];
    var auditLogsCache = [];
    var sessionsCache = [];
    var auditFilterTimer = null;
    var companySettingsCache = null;
    var companySettingsLogoUrl = null;

    function setSafeHtml(element, html) {
        if (!element) return;
        if (window.MarketWorld && MarketWorld.utils && typeof MarketWorld.utils.insertarHTMLSeguro === 'function') {
            MarketWorld.utils.insertarHTMLSeguro(element, html);
            return;
        }
        element.textContent = String(html || '');
    }

    document.addEventListener('DOMContentLoaded', function() {
        initUserManagement();
        initRoleManagement();
        initAuditManagement();
        initSessionManagement();
        initCompanySettings();
    });

    function getUserFilters() {
        var filters = { per_page: 100 };
        var filterRol = document.getElementById('filterRol');
        var filterEstado = document.getElementById('filterEstado');
        var filterSearch = document.getElementById('filterSearch');

        if (filterRol && filterRol.value) {
            filters.rol = filterRol.value;
        }

        if (filterEstado && filterEstado.value) {
            filters.estado = filterEstado.value;
        }

        if (filterSearch && filterSearch.value.trim()) {
            filters.search = filterSearch.value.trim();
        }

        return filters;
    }

    function refreshUsers() {
        loadUsers(getUserFilters());
    }

    // --- Gestión de usuarios ---
    function initUserManagement() {
        refreshUsers();
        initNewUserButton();
        initUserForm();
        initUserActions();
        initFilter();

        if (typeof MarketWorld.notifications !== 'undefined') {
            MarketWorld.notifications.init();
        }
    }

    function initRoleManagement() {
        var form = document.getElementById('roleForm');
        var refreshButton = document.getElementById('btnRefreshRoles');
        var newButton = document.getElementById('btnNewRole');
        var container = document.getElementById('rolesList');

        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                saveRole();
            });
        }

        if (refreshButton) {
            refreshButton.addEventListener('click', loadRoles);
        }

        if (newButton) {
            newButton.addEventListener('click', function() {
                resetRoleForm();
            });
        }

        if (container) {
            container.addEventListener('click', function(e) {
                var target = e.target.closest('button');
                if (!target) return;

                var roleId = target.getAttribute('data-role-id');
                if (!roleId) return;

                if (target.classList.contains('btn-edit-role')) {
                    editRole(parseInt(roleId, 10));
                } else if (target.classList.contains('btn-delete-role')) {
                    deleteRoleConfirm(parseInt(roleId, 10));
                }
            });
        }

        loadRoles();
    }

    function initAuditManagement() {
        var refreshButton = document.getElementById('btnAuditRefresh');
        var exportButton = document.getElementById('btnAuditExport');
        var filters = ['auditFrom', 'auditTo', 'auditUser', 'auditAction'];

        if (refreshButton) {
            refreshButton.addEventListener('click', loadAuditLogs);
        }

        if (exportButton) {
            exportButton.addEventListener('click', exportAuditLogs);
        }

        filters.forEach(function(id) {
            var input = document.getElementById(id);
            if (!input) return;

            input.addEventListener('change', scheduleAuditRefresh);
            input.addEventListener('input', scheduleAuditRefresh);
        });

        loadAuditLogs();
    }

    function initSessionManagement() {
        var refreshButton = document.getElementById('btnRefreshSessions');
        var revokeOthersButton = document.getElementById('btnRevokeOtherSessions');
        var container = document.getElementById('sessionsBody');

        if (refreshButton) {
            refreshButton.addEventListener('click', loadSessions);
        }

        if (revokeOthersButton) {
            revokeOthersButton.addEventListener('click', revokeOtherSessions);
        }

        if (container) {
            container.addEventListener('click', function(e) {
                var target = e.target.closest('button');
                if (!target) return;

                var sessionId = target.getAttribute('data-session-id');
                if (!sessionId) return;

                if (target.classList.contains('btn-revoke-session')) {
                    revokeSession(sessionId);
                }
            });
        }

        loadSessions();
    }

    function initCompanySettings() {
        var form = document.getElementById('companySettingsForm');
        var resetButton = document.getElementById('companySettingsReset');
        var logoInput = document.getElementById('companyLogo');

        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                saveCompanySettings();
            });
        }

        if (resetButton) {
            resetButton.addEventListener('click', function() {
                loadCompanySettings();
            });
        }

        if (logoInput) {
            logoInput.addEventListener('change', function() {
                previewCompanyLogo(this);
            });
        }

        loadCompanySettings();
    }

    function previewCompanyLogo(input) {
        var preview = document.getElementById('companyLogoPreview');
        if (!preview) return;

        if (input.files && input.files[0]) {
            var reader = new FileReader();
            reader.onload = function(event) {
                preview.src = event.target.result;
            };
            reader.readAsDataURL(input.files[0]);
            return;
        }

        if (companySettingsLogoUrl) {
            preview.src = companySettingsLogoUrl;
        }
    }

    function fillCompanySettings(data) {
        if (!data) return;

        companySettingsCache = data;
        companySettingsLogoUrl = data.logo_url || null;

        var fields = {
            companyName: data.company_name || '',
            companyTaxId: data.tax_id || '',
            companyAddress: data.address || '',
            companyPhone: data.phone || '',
            companyEmail: data.email || '',
            companyWebsite: data.website || '',
        };

        Object.keys(fields).forEach(function(id) {
            var input = document.getElementById(id);
            if (input) input.value = fields[id];
        });

        var currency = document.getElementById('companyCurrency');
        if (currency) {
            currency.value = (data.currency || 'COP').toUpperCase();
        }

        var cppDecimals = document.getElementById('companyCppDecimals');
        if (cppDecimals) {
            cppDecimals.value = typeof data.cpp_decimals === 'number' ? data.cpp_decimals : 4;
        }

        var preview = document.getElementById('companyLogoPreview');
        if (preview) {
            preview.src = companySettingsLogoUrl || 'https://via.placeholder.com/200x100?text=Logo+Empresa';
        }
    }

    function loadCompanySettings() {
        var status = document.getElementById('companySettingsStatus');
        if (!MarketWorld.api || !MarketWorld.api.companySettings) {
            if (status) {
                setSafeHtml(status, '<div class="alert alert-warning mb-0">El backend de empresa no está disponible.</div>');
            }
            return;
        }

        if (status) {
            setSafeHtml(status, '<div class="alert alert-info mb-0">Cargando datos de empresa...</div>');
        }

        return MarketWorld.api.companySettings.get()
            .then(function(response) {
                var data = response && response.data ? response.data : response;
                fillCompanySettings(data);
                if (status) {
                    setSafeHtml(status, '<div class="alert alert-success mb-0">Datos de empresa cargados correctamente.</div>');
                }
            })
            .catch(function(error) {
                console.error('Error al cargar datos de empresa:', error);
                if (status) {
                    setSafeHtml(status, '<div class="alert alert-danger mb-0">No se pudieron cargar los datos de empresa.</div>');
                }
            });
    }

    function saveCompanySettings() {
        var status = document.getElementById('companySettingsStatus');
        var form = document.getElementById('companySettingsForm');

        if (!MarketWorld.api || !MarketWorld.api.companySettings) {
            if (status) {
                setSafeHtml(status, '<div class="alert alert-warning mb-0">El backend de empresa no está disponible.</div>');
            }
            return;
        }

        if (!form) return;

        var formData = new FormData(form);

        if (status) {
            setSafeHtml(status, '<div class="alert alert-info mb-0">Guardando datos de empresa...</div>');
        }

        return MarketWorld.api.companySettings.save(formData)
            .then(function(response) {
                var data = response && response.data ? response.data : response;
                fillCompanySettings(data);
                if (status) {
                    setSafeHtml(status, '<div class="alert alert-success mb-0">Datos de empresa guardados correctamente.</div>');
                }
            })
            .catch(function(error) {
                console.error('Error al guardar datos de empresa:', error);
                if (status) {
                    setSafeHtml(status, '<div class="alert alert-danger mb-0">No se pudieron guardar los datos de empresa.</div>');
                }
            });
    }

    function renderRolePermissions(selectedPermissions) {
        var container = document.getElementById('rolePermissions');
        if (!container) return;

        var selected = selectedPermissions || [];
        if (!permissionsCache.length) {
            setSafeHtml(container, '<div class="text-muted">No hay permisos disponibles.</div>');
            return;
        }

        var html = permissionsCache.map(function(permission) {
            var checked = selected.indexOf(permission.name) !== -1 ? 'checked' : '';
            return '<div class="form-check mb-2">' +
                '<input class="form-check-input" type="checkbox" id="perm_' + permission.id + '" value="' + permission.name + '" ' + checked + '>' +
                '<label class="form-check-label" for="perm_' + permission.id + '">' + permission.name + '</label>' +
            '</div>';
        }).join('');

        setSafeHtml(container, html);
    }

    function renderRoles() {
        var container = document.getElementById('rolesList');
        var status = document.getElementById('rolesStatus');
        if (!container) return;

        if (!rolesCache.length) {
            setSafeHtml(status, '<div class="alert alert-info mb-0">No hay roles configurados.</div>');
            setSafeHtml(container, '');
            return;
        }

        setSafeHtml(status, '');

        var html = rolesCache.map(function(role) {
            var permissions = role.permissions || [];
            var badges = permissions.map(function(permission) {
                return '<span class="badge bg-light text-dark border me-1 mb-1">' + permission + '</span>';
            }).join('');

            return '<div class="col-lg-4 mb-3">' +
                '<div class="user-card h-100">' +
                    '<div class="d-flex justify-content-between align-items-center mb-3">' +
                        '<h5 class="mb-0">' + role.name + '</h5>' +
                        '<span class="badge bg-primary">' + (role.usuarios || 0) + ' usuarios</span>' +
                    '</div>' +
                    '<p class="text-muted">' + (role.description || 'Rol administrable desde backend.') + '</p>' +
                    '<div class="mt-3">' +
                        '<h6>Permisos asignados:</h6>' +
                        '<div class="d-flex flex-wrap">' + badges + '</div>' +
                    '</div>' +
                    '<div class="d-flex justify-content-between mt-3">' +
                        '<button class="btn btn-sm btn-outline-warning btn-edit-role" data-role-id="' + role.id + '">' +
                            '<i class="bi bi-pencil me-1"></i> Editar' +
                        '</button>' +
                        '<button class="btn btn-sm btn-outline-danger btn-delete-role" data-role-id="' + role.id + '">' +
                            '<i class="bi bi-trash me-1"></i> Eliminar' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');

        setSafeHtml(container, html);
    }

    function loadRoles() {
        var status = document.getElementById('rolesStatus');
        if (!MarketWorld.api || !MarketWorld.api.roles) {
            setSafeHtml(status, '<div class="alert alert-warning mb-0">API de roles no disponible.</div>');
            return;
        }

        setSafeHtml(status, '<div class="alert alert-info mb-0">Cargando roles...</div>');

        return MarketWorld.api.roles.getAll()
            .then(function(response) {
                var payload = response && response.data ? response.data : {};
                rolesCache = payload.roles || [];
                permissionsCache = payload.permissions || [];
                renderRolePermissions();
                renderRoles();
            })
            .catch(function(error) {
                console.error('Error al cargar roles:', error);
                setSafeHtml(status, '<div class="alert alert-danger mb-0">No se pudieron cargar los roles.</div>');
            });
    }

    function resetRoleForm(role) {
        var form = document.getElementById('roleForm');
        var roleId = document.getElementById('roleId');
        var roleName = document.getElementById('roleName');
        var title = document.getElementById('roleModalLabel');

        if (form) {
            form.reset();
        }

        if (roleId) roleId.value = '';
        if (roleName) roleName.value = '';
        if (title) title.textContent = 'Nuevo Rol';

        renderRolePermissions(role && role.permissions ? role.permissions : []);
    }

    function getSelectedRolePermissions() {
        var container = document.getElementById('rolePermissions');
        if (!container) return [];

        var checked = container.querySelectorAll('input[type="checkbox"]:checked');
        return Array.prototype.map.call(checked, function(input) {
            return input.value;
        });
    }

    function saveRole() {
        var roleId = document.getElementById('roleId').value;
        var roleName = document.getElementById('roleName').value.trim();
        var permissions = getSelectedRolePermissions();

        if (!roleName) {
            alert('El nombre del rol es obligatorio');
            return;
        }

        if (!MarketWorld.api || !MarketWorld.api.roles) {
            alert('API de roles no disponible');
            return;
        }

        var request = roleId
            ? MarketWorld.api.roles.update(roleId, { name: roleName, permissions: permissions })
            : MarketWorld.api.roles.create({ name: roleName, permissions: permissions });

        request
            .then(function(result) {
                if (result && result.success) {
                    alert(result.message || 'Rol guardado');
                    var modal = bootstrap.Modal.getInstance(document.getElementById('roleModal'));
                    if (modal) modal.hide();
                    loadRoles();
                } else {
                    alert('Error: ' + (result && result.message ? result.message : 'No se pudo guardar el rol'));
                }
            })
            .catch(function(error) {
                var message = (error && error.body && error.body.message) ? error.body.message : error.message;
                alert('Error: ' + message);
            });
    }

    function editRole(id) {
        var role = rolesCache.find(function(item) { return item.id === id; });
        if (!role) {
            alert('Rol no encontrado');
            return;
        }

        var roleId = document.getElementById('roleId');
        var roleName = document.getElementById('roleName');
        var title = document.getElementById('roleModalLabel');

        if (roleId) roleId.value = role.id;
        if (roleName) roleName.value = role.name;
        if (title) title.textContent = 'Editar Rol';

        renderRolePermissions(role.permissions || []);

        var modal = new bootstrap.Modal(document.getElementById('roleModal'));
        modal.show();
    }

    function deleteRoleConfirm(id) {
        var role = rolesCache.find(function(item) { return item.id === id; });
        if (!role) return;

        if (!confirm('¿Eliminar el rol ' + role.name + '?')) {
            return;
        }

        MarketWorld.api.roles.delete(id)
            .then(function(result) {
                if (result && result.success) {
                    loadRoles();
                } else {
                    alert('Error: ' + (result && result.message ? result.message : 'No se pudo eliminar el rol'));
                }
            })
            .catch(function(error) {
                var message = (error && error.body && error.body.message) ? error.body.message : error.message;
                alert('Error: ' + message);
            });
    }

    function scheduleAuditRefresh() {
        if (auditFilterTimer) {
            clearTimeout(auditFilterTimer);
        }

        auditFilterTimer = setTimeout(loadAuditLogs, 250);
    }

    function getAuditFilters() {
        var filters = { per_page: 25 };
        var from = document.getElementById('auditFrom');
        var to = document.getElementById('auditTo');
        var user = document.getElementById('auditUser');
        var action = document.getElementById('auditAction');

        if (from && from.value) filters.from = from.value;
        if (to && to.value) filters.to = to.value;
        if (user && user.value.trim()) filters.user = user.value.trim();
        if (action && action.value) filters.action = action.value;

        return filters;
    }

    function escapeAuditHtml(value) {
        var text = String(value == null ? '' : value);
        if (window.MarketWorld && MarketWorld.utils && typeof MarketWorld.utils.escapeHtml === 'function') {
            return MarketWorld.utils.escapeHtml(text);
        }

        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function stringifyAuditValue(value) {
        if (value === null || value === undefined || value === '') {
            return 'N/D';
        }

        if (Array.isArray(value)) {
            return value.join(', ');
        }

        if (typeof value === 'object') {
            return JSON.stringify(value);
        }

        return String(value);
    }

    function formatAuditMetadata(metadata) {
        if (!metadata || typeof metadata !== 'object') {
            return '';
        }

        var keys = Object.keys(metadata);
        if (!keys.length) {
            return '';
        }

        return keys.map(function(key) {
            var value = metadata[key];
            if (value === null || value === undefined || value === '') {
                return '';
            }

            return '<span class="badge bg-light text-dark border me-1 mb-1">' +
                escapeAuditHtml(key) + ': ' + escapeAuditHtml(stringifyAuditValue(value)) +
            '</span>';
        }).filter(Boolean).join('');
    }

    function renderAuditActionOptions() {
        var select = document.getElementById('auditAction');
        if (!select) return;

        var current = select.value;
        var actions = [];
        auditLogsCache.forEach(function(item) {
            if (item.action && actions.indexOf(item.action) === -1) {
                actions.push(item.action);
            }
        });

        var options = ['<option value="">Todas</option>'].concat(actions.map(function(action) {
            var selected = current === action ? 'selected' : '';
            return '<option value="' + action + '" ' + selected + '>' + action + '</option>';
        }));

        setSafeHtml(select, options.join(''));
    }

    function renderAuditLogs() {
        var body = document.getElementById('auditLogsBody');
        if (!body) return;

        if (!auditLogsCache.length) {
            setSafeHtml(body, '<tr><td colspan="5" class="text-center text-muted py-4">No hay registros de auditoría.</td></tr>');
            return;
        }

        var html = auditLogsCache.map(function(log) {
            var metadataHtml = formatAuditMetadata(log.metadata || {});
            var entityInfo = [];

            if (log.entity_type) {
                entityInfo.push('Entidad: ' + log.entity_type);
            }

            if (log.entity_id !== null && log.entity_id !== undefined && log.entity_id !== '') {
                entityInfo.push('ID: ' + log.entity_id);
            }

            var detailHtml = '<div class="fw-semibold">' + escapeAuditHtml(log.description || '') + '</div>';

            if (entityInfo.length) {
                detailHtml += '<div class="text-muted small mt-1">' + escapeAuditHtml(entityInfo.join(' · ')) + '</div>';
            }

            if (metadataHtml) {
                detailHtml += '<div class="mt-2 d-flex flex-wrap">' + metadataHtml + '</div>';
            }

            return '<tr>' +
                '<td>' + (log.created_at || '') + '</td>' +
                '<td><div class="fw-semibold">' + (log.usuario || 'Sistema') + '</div><div class="text-muted small">' + (log.email || '') + '</div></td>' +
                '<td><span class="badge bg-secondary">' + log.action + '</span></td>' +
                '<td class="small">' + detailHtml + '</td>' +
                '<td class="text-muted small">' + (log.ip_address || '') + '</td>' +
            '</tr>';
        }).join('');

        setSafeHtml(body, html);
    }

    function loadAuditLogs() {
        var status = document.getElementById('rolesStatus');
        if (!MarketWorld.api || !MarketWorld.api.auditLogs) {
            return;
        }

        return MarketWorld.api.auditLogs.getAll(getAuditFilters())
            .then(function(response) {
                var parsed = MarketWorld.api.normalizeListResponse(response, { per_page: 25 });
                auditLogsCache = parsed.items || [];
                renderAuditActionOptions();
                renderAuditLogs();
            })
            .catch(function(error) {
                console.error('Error al cargar auditoría:', error);
                var body = document.getElementById('auditLogsBody');
                if (body) {
                    setSafeHtml(body, '<tr><td colspan="5" class="text-center text-danger py-4">No se pudo cargar la auditoría.</td></tr>');
                }
            });
    }

    function exportAuditLogs() {
        if (!auditLogsCache.length) {
            alert('No hay datos para exportar');
            return;
        }

        var header = ['Fecha', 'Usuario', 'Acción', 'Detalle', 'IP'];
        var rows = auditLogsCache.map(function(log) {
            var metadata = formatAuditMetadata(log.metadata || {});
            var detail = [log.description || ''];

            if (log.entity_type || log.entity_id !== null && log.entity_id !== undefined && log.entity_id !== '') {
                detail.push('Entidad: ' + (log.entity_type || 'N/D') + (log.entity_id ? ' #' + log.entity_id : ''));
            }

            if (metadata) {
                detail.push('Metadata: ' + metadata.replace(/<[^>]+>/g, ' '));
            }

            return [log.created_at || '', log.usuario || '', log.action || '', detail.join(' | '), log.ip_address || ''];
        });

        var csv = [header].concat(rows)
            .map(function(row) {
                return row.map(function(value) {
                    var text = String(value).replace(/"/g, '""');
                    return '"' + text + '"';
                }).join(';');
            }).join('\n');

        var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'audit-logs.csv';
        link.click();
    }

    function formatSessionUser(session) {
        return session.user_name || session.user_email || ('Sesión ' + session.id.substring(0, 8));
    }

    function renderSessions() {
        var body = document.getElementById('sessionsBody');
        var status = document.getElementById('sessionsStatus');
        if (!body) return;

        if (!sessionsCache.length) {
            setSafeHtml(status, '<div class="alert alert-info mb-0">No hay sesiones activas registradas.</div>');
            setSafeHtml(body, '<tr><td colspan="6" class="text-center text-muted py-4">Sin sesiones.</td></tr>');
            return;
        }

        setSafeHtml(status, '');

        var html = sessionsCache.map(function(session) {
            var isCurrent = session.is_current ? '<span class="badge bg-success">Actual</span>' : '<span class="badge bg-secondary">Activa</span>';
            return '<tr>' +
                '<td><div class="fw-semibold">' + formatSessionUser(session) + '</div><div class="text-muted small">' + (session.user_email || '') + '</div></td>' +
                '<td>' + (session.ip_address || '') + '</td>' +
                '<td>' + (session.last_activity_human || '') + '</td>' +
                '<td class="text-truncate" style="max-width: 220px;">' + (session.user_agent || 'N/D') + '</td>' +
                '<td>' + isCurrent + '</td>' +
                '<td>' +
                    (session.is_current ? '<span class="text-muted small">Sesión actual</span>' : '<button class="btn btn-sm btn-outline-danger btn-revoke-session" data-session-id="' + session.id + '">Cerrar</button>') +
                '</td>' +
            '</tr>';
        }).join('');

        setSafeHtml(body, html);
    }

    function loadSessions() {
        var status = document.getElementById('sessionsStatus');
        if (!MarketWorld.api || !MarketWorld.api.sessions) {
            setSafeHtml(status, '<div class="alert alert-warning mb-0">API de sesiones no disponible.</div>');
            return;
        }

        setSafeHtml(status, '<div class="alert alert-info mb-0">Cargando sesiones...</div>');

        return MarketWorld.api.sessions.getAll()
            .then(function(response) {
                var parsed = MarketWorld.api.normalizeListResponse(response, { per_page: 100 });
                sessionsCache = parsed.items || [];
                renderSessions();
            })
            .catch(function(error) {
                console.error('Error al cargar sesiones:', error);
                setSafeHtml(status, '<div class="alert alert-danger mb-0">No se pudieron cargar las sesiones.</div>');
                setSafeHtml(document.getElementById('sessionsBody'), '<tr><td colspan="6" class="text-center text-danger py-4">No se pudo cargar la lista de sesiones.</td></tr>');
            });
    }

    function revokeSession(sessionId) {
        if (!confirm('¿Cerrar esta sesión?')) {
            return;
        }

        MarketWorld.api.sessions.revoke(sessionId)
            .then(function(result) {
                if (result && result.success) {
                    loadSessions();
                } else {
                    alert('Error: ' + (result && result.message ? result.message : 'No se pudo cerrar la sesión'));
                }
            })
            .catch(function(error) {
                var message = (error && error.body && error.body.message) ? error.body.message : error.message;
                alert('Error: ' + message);
            });
    }

    function revokeOtherSessions() {
        if (!confirm('¿Cerrar otras sesiones del usuario autenticado?')) {
            return;
        }

        MarketWorld.api.sessions.revokeOthers()
            .then(function(result) {
                if (result && result.success) {
                    loadSessions();
                } else {
                    alert('Error: ' + (result && result.message ? result.message : 'No se pudieron cerrar las otras sesiones'));
                }
            })
            .catch(function(error) {
                var message = (error && error.body && error.body.message) ? error.body.message : error.message;
                alert('Error: ' + message);
            });
    }

    // --- Cargar lista de usuarios ---
    function loadUsers(filters) {
        var container = document.getElementById('usersList');
        if (!container) return;

        currentUserFilters = Object.assign({ per_page: 100 }, filters || {});

        if (!MarketWorld.api || !MarketWorld.api.adminUsers) {
            setSafeHtml(container, '<div class="alert alert-warning">API de usuarios no disponible.</div>');
            return;
        }

        setSafeHtml(container, '<div class="alert alert-info">Cargando usuarios...</div>');

        MarketWorld.api.adminUsers.getAll(currentUserFilters)
            .then(function(response) {
            var parsed = MarketWorld.api.normalizeListResponse(response, currentUserFilters);
                usersCache = parsed.items || [];

                setSafeHtml(container, '');

                if (!usersCache.length) {
                    setSafeHtml(container, '<div class="alert alert-info">No hay usuarios registrados</div>');
                    return;
                }

                usersCache.forEach(function(user) {
                    var userCard = createUserCard(user);
                    container.appendChild(userCard);
                });
            })
            .catch(function(error) {
                console.error('[CRM] Error al cargar usuarios:', error);
                setSafeHtml(container, '<div class="alert alert-danger">No se pudieron cargar los usuarios.</div>');
            });
    }

    // --- Crear tarjeta de usuario ---
    function createUserCard(user) {
        var col = document.createElement('div');
        col.className = 'col-md-4 mb-3';
        
        var userName = (user.nombre || user.name || '').toString().trim();
        var userLastName = (user.apellido || '').toString().trim();
        var displayRole = (user.rol || 'Usuario').toString();
        var displayState = (user.estado || 'Activo').toString();
        var roleBadgeClass = displayRole === 'Administrador' ? 'badge-admin' : 
                             displayRole === 'Vendedor' ? 'badge-seller' : 'badge-user';
        
        var statusBadgeClass = displayState === 'Activo' ? 'status-active' : 'status-inactive';
        
        // Obtener iniciales para el avatar
        var iniciales = (userName.charAt(0) || '?') + (userLastName.charAt(0) || '');
        
        setSafeHtml(col, `
            <div class="user-card">
                <div class="text-center">
                    <div class="user-avatar" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold; margin: 0 auto 15px;">
                        ${iniciales}
                    </div>
                    <h5>${userName} ${userLastName}</h5>
                    <div class="role-badge ${roleBadgeClass}">${displayRole}</div>
                    <div class="status-badge ${statusBadgeClass} mt-2">${displayState}</div>
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
        `);
        
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

        if (!MarketWorld.api || !MarketWorld.api.adminUsers) {
            alert('API de usuarios no disponible');
            return;
        }

        var request = userId
            ? MarketWorld.api.adminUsers.update(userId, userData)
            : MarketWorld.api.adminUsers.create(userData);

        request
            .then(function(result) {
                if (result && result.success) {
                    if (!userId && typeof MarketWorld.notifications !== 'undefined') {
                        MarketWorld.notifications.notifyNewUser(nombre + ' ' + apellido);
                    }
                    alert(result.message || 'Usuario guardado');
                    refreshUsers();
                    var modal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
                    if (modal) modal.hide();
                } else {
                    alert('Error: ' + (result && result.message ? result.message : 'No se pudo guardar'));
                }
            })
            .catch(function(error) {
                var message = (error && error.body && error.body.message) ? error.body.message : error.message;
                alert('Error: ' + message);
            });
    }

    // Editar usuario
    function editUser(id) {
        console.log('editUser llamado con id:', id);
        var user = usersCache.find(function(item) { return item.id === id; });
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
        var user = usersCache.find(function(item) { return item.id === id; });
        console.log('Usuario encontrado:', user);
        if (!user) return;
        
        var accion = user.estado === 'Activo' ? 'desactivar' : 'activar';
        if (confirm('¿Seguro que deseas ' + accion + ' a ' + user.nombre + '?')) {
            var nuevoEstado = user.estado === 'Activo' ? 'Inactivo' : 'Activo';
            MarketWorld.api.adminUsers.update(id, { estado: nuevoEstado })
                .then(function(result) {
                    if (result && result.success) {
                        refreshUsers();
                    } else {
                        alert('Error: ' + (result && result.message ? result.message : 'No se pudo actualizar'));
                    }
                })
                .catch(function(error) {
                    var message = (error && error.body && error.body.message) ? error.body.message : error.message;
                    alert('Error: ' + message);
                });
        }
    }

    // Eliminar usuario
    function deleteUserConfirm(id) {
        console.log('deleteUserConfirm llamado con id:', id);
        var user = usersCache.find(function(item) { return item.id === id; });
        console.log('Usuario encontrado:', user);
        if (!user) return;
        
        if (confirm('¿ELIMINAR permanentemente a ' + user.nombre + ' ' + user.apellido + '?\n\nEsta acción no se puede deshacer.')) {
            MarketWorld.api.adminUsers.deactivate(id)
                .then(function(result) {
                    if (result && result.success) {
                        alert(result.message || 'Usuario desactivado');
                        refreshUsers();
                    } else {
                        alert('Error: ' + (result && result.message ? result.message : 'No se pudo desactivar'));
                    }
                })
                .catch(function(error) {
                    var message = (error && error.body && error.body.message) ? error.body.message : error.message;
                    alert('Error: ' + message);
                });
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
        
        btnFilter.addEventListener('click', refreshUsers);
        
        // Filtrar en tiempo real al cambiar busqueda
        var searchInput = document.getElementById('filterSearch');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                if (filterSearchTimer) {
                    clearTimeout(filterSearchTimer);
                }

                filterSearchTimer = setTimeout(refreshUsers, 250);
            });
        }

        var filterRol = document.getElementById('filterRol');
        var filterEstado = document.getElementById('filterEstado');

        if (filterRol) {
            filterRol.addEventListener('change', refreshUsers);
        }

        if (filterEstado) {
            filterEstado.addEventListener('change', refreshUsers);
        }
    }

})();