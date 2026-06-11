/**
 * api-adapter.js
 * Adaptador que conecta el frontend MarketWorld con el backend Laravel.
 * Usa la API REST primero; si falla, entra en modo degradado controlado.
 *
 * USO: incluir este script ANTES de inventario.js / crm.js en el HTML.
 *
 *   <script src="../js/api-adapter.js"></script>
 */

(function (global) {
    'use strict';

    // -------------------------------------------------------
    // Configuración — Centralizada en js/config.js
    // -------------------------------------------------------
    var BASE_URL = global.MARKETWORLD_API_BASE_URL || (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.API_URL : 'http://127.0.0.1:8000/api/v1');
    var API_ROOT = BASE_URL.replace('/api/v1', '');
    var AUTH_TOKEN_KEY = (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.AUTH_TOKEN_KEY : 'marketworld_auth_token');
    var AUTH_USER_KEY = (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.AUTH_USER_KEY : 'marketworld_auth_user');

    // Token-based auth: ya no se necesitan cookies de sesión cross-site.
    // credentials: 'omit' evita que el navegador adjunte cookies de terceros
    // que Chrome bloquearía en contexto cross-site (Vercel ↔ DigitalOcean).
    var FETCH_CREDENTIALS = 'omit';
    var FETCH_MODE = 'cors';

    // Cabeceras comunes para JSON
    var JSON_HEADERS = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    };

    function buildFetchConfig(requestOptions, headers) {
        var options = requestOptions || {};
        return Object.assign({}, options, {
            headers: headers,
            mode: FETCH_MODE,
            credentials: FETCH_CREDENTIALS,
        });
    }

    // --- Gestión del token de autenticación en localStorage ---

    function getAuthToken() {
        return localStorage.getItem(AUTH_TOKEN_KEY) || null;
    }

    function setSessionState(user, token) {
        // Persistir el Bearer Token en localStorage para todas las peticiones.
        if (token) {
            localStorage.setItem(AUTH_TOKEN_KEY, token);
        }
        // Guardar datos básicos del usuario (no sensibles) para mostrarse en la UI.
        if (user) {
            try {
                localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
            } catch (e) { /* quota exceeded: ignorar */ }
        }
    }

    function clearSessionState() {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
    }

    function buildHeaders(customHeaders) {
        var headers = Object.assign({}, JSON_HEADERS, customHeaders || {});
        // Inyectar el Bearer Token en cada petición automáticamente.
        var token = getAuthToken();
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        return headers;
    }

    function isFormData(value) {
        return typeof FormData !== 'undefined' && value instanceof FormData;
    }

    function parseResponseBody(res) {
        return res.text().then(function (text) {
            if (!text) return null;
            try {
                return JSON.parse(text);
            } catch (e) {
                return { message: text };
            }
        });
    }

    function buildListParams(filtros) {
        var normalized = Object.assign({}, filtros || {});

        // Compatibilidad temporal: mientras el frontend migra paginación completa,
        // pedimos lotes amplios controlados al backend paginado.
        if (!Object.prototype.hasOwnProperty.call(normalized, 'per_page')) {
            normalized.per_page = 100;
        }

        return new URLSearchParams(normalized).toString();
    }

    function buildQueryParams(params) {
        return new URLSearchParams(Object.assign({}, params || {})).toString();
    }

    function normalizeListResponse(response, fallback) {
        var fallbackMeta = Object.assign({
            total: 0,
            per_page: 15,
            current_page: 1,
            last_page: 1,
        }, fallback || {});

        if (Array.isArray(response)) {
            return {
                items: response,
                meta: Object.assign({}, fallbackMeta, {
                    total: response.length,
                    last_page: 1,
                }),
                success: true,
                message: '',
            };
        }

        var payload = response || {};
        var items = [];

        if (Array.isArray(payload.data)) {
            items = payload.data;
        } else if (payload.data && Array.isArray(payload.data.data)) {
            items = payload.data.data;
        }

        var responseMeta = payload.meta || (payload.data && payload.data.meta) || {};
        var total = responseMeta.total;

        if (typeof total !== 'number') {
            if (typeof payload.total === 'number') {
                total = payload.total;
            } else {
                total = items.length;
            }
        }

        var normalizedMeta = {
            total: total,
            per_page: responseMeta.per_page || fallbackMeta.per_page,
            current_page: responseMeta.current_page || fallbackMeta.current_page,
            last_page: responseMeta.last_page || fallbackMeta.last_page,
        };

        if (!normalizedMeta.last_page || normalizedMeta.last_page < 1) {
            normalizedMeta.last_page = 1;
        }

        return {
            items: items,
            meta: normalizedMeta,
            success: payload.success !== false,
            message: payload.message || '',
        };
    }

    // -------------------------------------------------------
    // Utilidad interna: fetch con timeout y manejo de errores
    // -------------------------------------------------------
    function apiFetch(endpoint, options) {
        var url = BASE_URL + endpoint;
        var requestOptions = options || {};
        var headers = requestOptions.headers || {};

        if (isFormData(requestOptions.body)) {
            headers = Object.assign({}, headers);
            delete headers['Content-Type'];
            delete headers['content-type'];
        } else {
            headers = buildHeaders(headers);
        }

        var config = buildFetchConfig(requestOptions, headers);

        return fetch(url, config)
            .then(function (res) {
                // Si el token es inválido o expiró, limpiar y redirigir al login.
                if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/me')) {
                    console.warn('Token inválido o expirado. Redirigiendo al login...');
                    clearSessionState();
                    window.location.href = APP_CONFIG.toHtmlPage('Login.html');
                    return;
                }

                return parseResponseBody(res).then(function (body) {
                    if (!res.ok) {
                        var message = (body && body.message) ? body.message : ('Error HTTP ' + res.status);
                        var apiError = new Error(message);
                        apiError.status = res.status;
                        apiError.body = body;
                        throw apiError;
                    }

                    return body;
                });
                }
            );
    }

    // -------------------------------------------------------
    // API de Productos (Módulo Inventario)
    // -------------------------------------------------------
    var ProductAPI = {

        getAll: function (filtros) {
            var params = buildListParams(filtros);
            return apiFetch('/products' + (params ? '?' + params : ''));
        },

        getById: function (id) {
            return apiFetch('/products/' + id);
        },

        create: function (data) {
            return apiFetch('/products', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },

        update: function (id, data) {
            return apiFetch('/products/' + id, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },

        delete: function (id) {
            return apiFetch('/products/' + id, { method: 'DELETE' });
        },

        stockBajo: function () {
            return apiFetch('/products/stock-bajo');
        },

        adjustCost: function (id, data) {
            return apiFetch('/products/' + id + '/adjust-cost', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        getCostAdjustments: function () {
            return apiFetch('/cost-adjustments');
        },
    };

    // -------------------------------------------------------
    // API de Categorías (Módulo Inventario)
    // -------------------------------------------------------
    var CategoryAPI = {
        getAll: function () {
            return apiFetch('/categories');
        },
        getById: function (id) {
            return apiFetch('/categories/' + id);
        },
        create: function (data) {
            return apiFetch('/categories', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        update: function (id, data) {
            return apiFetch('/categories/' + id, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        delete: function (id) {
            return apiFetch('/categories/' + id, { method: 'DELETE' });
        },
    };

    // -------------------------------------------------------
    // API de Movimientos de Inventario
    // -------------------------------------------------------
    var MovementAPI = {
        getAll: function (filtros) {
            var params = buildQueryParams(filtros);
            return apiFetch('/inventory-movements' + (params ? '?' + params : ''));
        },
        create: function (data) {
            return apiFetch('/inventory-movements', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
    };

    // -------------------------------------------------------
    // API de Clientes (Módulo CRM / Facturación)
    // -------------------------------------------------------
    var CustomerAPI = {

        getAll: function (filtros) {
            var params = buildListParams(filtros);
            return apiFetch('/customers' + (params ? '?' + params : ''));
        },

        getById: function (id) {
            return apiFetch('/customers/' + id);
        },

        create: function (data) {
            return apiFetch('/customers', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },

        update: function (id, data) {
            return apiFetch('/customers/' + id, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },

        delete: function (id) {
            return apiFetch('/customers/' + id, { method: 'DELETE' });
        },
    };

    // -------------------------------------------------------
    // API de Facturación (Módulo Facturación / POS)
    // -------------------------------------------------------
    var InvoiceAPI = {
        getAll: function (filtros) {
            var params = buildListParams(filtros);
            return apiFetch('/invoices' + (params ? '?' + params : ''));
        },
        getById: function (id) {
            return apiFetch('/invoices/' + id);
        },
        create: function (data) {
            return apiFetch('/invoices', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        update: function (id, data) {
            return apiFetch('/invoices/' + id, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        }
    };

    // -------------------------------------------------------
    // API de Compras (Módulo Compras)
    // -------------------------------------------------------
    var PurchaseAPI = {
        getAll: function (filtros) {
            var params = buildListParams(filtros);
            return apiFetch('/purchases' + (params ? '?' + params : ''));
        },
        getById: function (id) {
            return apiFetch('/purchases/' + id);
        },
        create: function (data) {
            return apiFetch('/purchases', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        update: function (id, data) {
            return apiFetch('/purchases/' + id, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        registerPayment: function (id, data) {
            return apiFetch('/purchases/' + id + '/payments', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        }
    };

    // -------------------------------------------------------
    // API de Proveedores (Módulo Compras)
    // -------------------------------------------------------
    var SupplierAPI = {
        getAll: function (filtros) {
            var params = buildListParams(filtros);
            return apiFetch('/suppliers' + (params ? '?' + params : ''));
        },
        getById: function (id) {
            return apiFetch('/suppliers/' + id);
        },
        create: function (data) {
            return apiFetch('/suppliers', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        update: function (id, data) {
            return apiFetch('/suppliers/' + id, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        delete: function (id) {
            return apiFetch('/suppliers/' + id, { method: 'DELETE' });
        }
    };

    // -------------------------------------------------------
    // API de Contabilidad (Módulo Contabilidad)
    // -------------------------------------------------------
    var AccountAPI = {
        getAll: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/accounts' + (query ? '?' + query : ''));
        },
        getById: function (id) {
            return apiFetch('/accounts/' + id);
        },
        create: function (data) {
            return apiFetch('/accounts', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        update: function (id, data) {
            return apiFetch('/accounts/' + id, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        delete: function (id) {
            return apiFetch('/accounts/' + id, { method: 'DELETE' });
        }
    };

    var JournalEntryAPI = {
        getAll: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/journal-entries' + (query ? '?' + query : ''));
        },
        getById: function (id) {
            return apiFetch('/journal-entries/' + id);
        },
        create: function (data) {
            return apiFetch('/journal-entries', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        update: function (id, data) {
            return apiFetch('/journal-entries/' + id, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        delete: function (id) {
            return apiFetch('/journal-entries/' + id, { method: 'DELETE' });
        }
    };

    // -------------------------------------------------------
    // API de Autenticación (Sanctum)
    // -------------------------------------------------------
    var AuthAPI = {

        register: function (data) {
            return ensureCsrfCookie()
                .then(function () {
                    return apiFetch('/auth/register', {
                        method: 'POST',
                        body: JSON.stringify(data),
                    });
                });
        },

        login: function (email, password) {
            // Login no necesita token previo; es la petición que lo genera.
            // No usamos ensureCsrfCookie porque el endpoint es público y
            // token-based auth no requiere CSRF.
            return apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: email, password: password }),
            })
            .then(function (res) {
                if (res && res.success && res.data) {
                    var token = res.data.token || null;
                    var user  = res.data.user  || res.data;
                    // Guardar token y usuario en localStorage.
                    setSessionState(user, token);
                }
                return res;
            });
        },

        me: function () {
            // Con token Bearer, /auth/me solo necesita el header Authorization.
            // No requiere precalentamiento CSRF.
            return apiFetch('/auth/me')
                .then(function (res) {
                    if (res && res.success && res.data) {
                        // Refrescar datos del usuario en localStorage (sin tocar el token).
                        setSessionState(res.data, null);
                    }
                    return res;
                });
        },

        logout: function () {
            // Enviar la petición de logout al backend para revocar el token en BD.
            return apiFetch('/auth/logout', { method: 'POST' })
                .catch(function (err) {
                    // Incluso si el backend falla, limpiar el token local.
                    console.warn('[MarketWorld API] Logout backend error:', err);
                })
                .finally(function () {
                    clearSessionState();
                    window.location.href = APP_CONFIG.toHtmlPage('Login.html');
                });
        },

        getToken: function () {
            // Devuelve el token guardado en localStorage.
            return getAuthToken();
        },
    };

    // -------------------------------------------------------
    // Verificar si el backend está disponible
    // -------------------------------------------------------
    function checkBackend() {
        return fetch(BASE_URL.replace('/v1', '') + '/health', buildFetchConfig({}, {
            'Accept': 'application/json',
        }))
            .then(function (res) { return res.ok; })
            .catch(function () { return false; });
    }

    var DashboardAPI = {
        getStats: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/dashboard/stats' + (query ? '?' + query : ''));
        }
    };

    var ReportAPI = {
        salesSummary: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/reports/sales-summary' + (query ? '?' + query : ''));
        },
        inventoryUtility: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/reports/inventory-utility' + (query ? '?' + query : ''));
        },
        ventas: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/reports/ventas' + (query ? '?' + query : ''));
        },
        inventario: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/reports/inventario' + (query ? '?' + query : ''));
        },
        financiero: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/reports/financiero' + (query ? '?' + query : ''));
        },
        cxp: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/reports/cxp' + (query ? '?' + query : ''));
        },
        clientes: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/reports/clientes' + (query ? '?' + query : ''));
        },
        taxSummary: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/reports/tax-summary' + (query ? '?' + query : ''));
        },
        dianDraft: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/reports/dian-draft' + (query ? '?' + query : ''));
        }
    };

    var CrmAPI = {
        clientes: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/crm/clientes' + (query ? '?' + query : ''));
        },
        oportunidades: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/crm/oportunidades' + (query ? '?' + query : ''));
        },
        crearOportunidad: function (data) {
            return apiFetch('/crm/oportunidades', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        actualizarOportunidad: function (id, data) {
            return apiFetch('/crm/oportunidades/' + id, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        eliminarOportunidad: function (id) {
            return apiFetch('/crm/oportunidades/' + id, { method: 'DELETE' });
        },

        // SEGMENTOS
        segmentos: function () {
            return apiFetch('/crm/segmentos');
        },
        crearSegmento: function (data) {
            return apiFetch('/crm/segmentos', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        actualizarSegmento: function (id, data) {
            return apiFetch('/crm/segmentos/' + id, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        eliminarSegmento: function (id) {
            return apiFetch('/crm/segmentos/' + id, { method: 'DELETE' });
        },

        // CAMPAÑAS
        campanas: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/crm/campanas' + (query ? '?' + query : ''));
        },
        crearCampana: function (data) {
            return apiFetch('/crm/campanas', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        actualizarCampana: function (id, data) {
            return apiFetch('/crm/campanas/' + id, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        eliminarCampana: function (id) {
            return apiFetch('/crm/campanas/' + id, { method: 'DELETE' });
        },

        // ACTIVIDADES
        actividades: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/crm/actividades' + (query ? '?' + query : ''));
        },
        crearActividad: function (data) {
            return apiFetch('/crm/actividades', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        actualizarActividad: function (id, data) {
            return apiFetch('/crm/actividades/' + id, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        eliminarActividad: function (id) {
            return apiFetch('/crm/actividades/' + id, { method: 'DELETE' });
        },

        // RECORDATORIOS
        recordatorios: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/crm/recordatorios' + (query ? '?' + query : ''));
        },
        crearRecordatorio: function (data) {
            return apiFetch('/crm/recordatorios', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        marcarRecordatorioLeido: function (id) {
            return apiFetch('/crm/recordatorios/' + id + '/leido', {
                method: 'PUT',
                body: JSON.stringify({}),
            });
        },
        eliminarRecordatorio: function (id) {
            return apiFetch('/crm/recordatorios/' + id, { method: 'DELETE' });
        }
    };

    var NotificationAPI = {
        getAll: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/notifications' + (query ? '?' + query : ''));
        },
        getUnreadCount: function () {
            return apiFetch('/notifications/unread-count');
        },
        create: function (data) {
            return apiFetch('/notifications', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        markRead: function (id) {
            return apiFetch('/notifications/' + id + '/mark-read', {
                method: 'POST',
                body: JSON.stringify({}),
            });
        },
        markAllRead: function () {
            return apiFetch('/notifications/mark-all-read', {
                method: 'POST',
                body: JSON.stringify({}),
            });
        },
        delete: function (id) {
            return apiFetch('/notifications/' + id, { method: 'DELETE' });
        },
        deleteRead: function () {
            return apiFetch('/notifications/read', { method: 'DELETE' });
        },
        deleteAll: function () {
            return apiFetch('/notifications/all', { method: 'DELETE' });
        },
    };

    var AdminUsersAPI = {
        getAll: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/admin/users' + (query ? '?' + query : ''));
        },
        getById: function (id) {
            return apiFetch('/admin/users/' + id);
        },
        create: function (data) {
            return apiFetch('/admin/users', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        update: function (id, data) {
            return apiFetch('/admin/users/' + id, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        deactivate: function (id) {
            return apiFetch('/admin/users/' + id, { method: 'DELETE' });
        },
    };

    var RolesAPI = {
        getAll: function () {
            return apiFetch('/admin/roles');
        },
        permissions: function () {
            return apiFetch('/admin/permissions');
        },
        create: function (data) {
            return apiFetch('/admin/roles', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },
        update: function (id, data) {
            return apiFetch('/admin/roles/' + id, {
                method: 'PUT',
                body: JSON.stringify(data),
            });
        },
        delete: function (id) {
            return apiFetch('/admin/roles/' + id, { method: 'DELETE' });
        },
    };

    var AuditLogsAPI = {
        getAll: function (params) {
            var query = buildQueryParams(params);
            return apiFetch('/admin/audit-logs' + (query ? '?' + query : ''));
        },
    };

    var SessionsAPI = {
        getAll: function () {
            return apiFetch('/admin/sessions');
        },
        revoke: function (sessionId) {
            return apiFetch('/admin/sessions/' + sessionId, { method: 'DELETE' });
        },
        revokeOthers: function () {
            return apiFetch('/admin/sessions/revoke-others', { method: 'POST', body: JSON.stringify({}) });
        },
    };

    var CompanySettingsAPI = {
        get: function () {
            return apiFetch('/company-settings');
        },
        save: function (data) {
            return apiFetch('/company-settings', {
                method: 'POST',
                body: data,
            });
        },
    };

    // -------------------------------------------------------
    // Exportar bajo el namespace global MarketWorld.api
    // -------------------------------------------------------
    global.MarketWorld = global.MarketWorld || {};
    global.MarketWorld.api = {
        products:  ProductAPI,
        categories: CategoryAPI,
        movements: MovementAPI,
        customers: CustomerAPI,
        invoices:  InvoiceAPI,
        purchases: PurchaseAPI,
        suppliers: SupplierAPI,
        accounts: AccountAPI,
        journalEntries: JournalEntryAPI,
        dashboard: DashboardAPI,
        reports: ReportAPI,
        crm:       CrmAPI,
        notifications: NotificationAPI,
        adminUsers: AdminUsersAPI,
        roles: RolesAPI,
        auditLogs: AuditLogsAPI,
        sessions: SessionsAPI,
        companySettings: CompanySettingsAPI,
        auth:      AuthAPI,
        checkBackend: checkBackend,
        normalizeListResponse: normalizeListResponse,
        BASE_URL: BASE_URL,
    };

    // Con token Bearer ya no es necesario precalentar la cookie CSRF al cargar.
    // CSRF solo es relevante para el flujo de sesión por cookie (SPA stateful).
    // Se mantiene ensureCsrfCookie disponible en la API por si se necesita en el futuro.

    // Indicar en consola si el backend responde al cargar la página
    checkBackend().then(function (online) {
        if (online) {
            console.log('%c[MarketWorld API] Backend conectado ✓ ' + BASE_URL, 'color:green;font-weight:bold');
        } else {
            console.warn('[MarketWorld API] Backend NO disponible. Modo degradado activado.');
        }
    });

})(window);
