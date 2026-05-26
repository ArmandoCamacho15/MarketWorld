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
    var CSRF_URL = API_ROOT + '/sanctum/csrf-cookie';
    var AUTH_TOKEN_KEY = (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.AUTH_TOKEN_KEY : 'marketworld_auth_token');
    var AUTH_USER_KEY = (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.AUTH_USER_KEY : 'marketworld_auth_user');

    // Cabeceras comunes para JSON
    var JSON_HEADERS = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    };

    function setSessionState(user) {
        // La sesión ahora se maneja exclusivamente por cookies HttpOnly.
        // No guardamos tokens ni datos sensibles en el navegador para prevenir XSS.
    }

    function clearSessionState() {
        // Limpieza de estado local si fuera necesario, pero ya no persistimos la sesión en el navegador.
    }

    function buildHeaders(customHeaders) {
        return Object.assign({}, JSON_HEADERS, customHeaders || {});
    }

    function isFormData(value) {
        return typeof FormData !== 'undefined' && value instanceof FormData;
    }

    function getCookieValue(name) {
        var prefix = name + '=';
        var parts = document.cookie ? document.cookie.split(';') : [];

        for (var i = 0; i < parts.length; i++) {
            var cookie = parts[i].trim();
            if (cookie.indexOf(prefix) === 0) {
                return cookie.substring(prefix.length);
            }
        }

        return null;
    }

    function attachXsrfHeader(config) {
        var method = (config.method || 'GET').toUpperCase();
        var needsCsrf = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

        if (!needsCsrf) {
            return config;
        }

        var xsrfCookie = getCookieValue('XSRF-TOKEN');
        if (!xsrfCookie) {
            return config;
        }

        var decodedToken = xsrfCookie;
        try {
            decodedToken = decodeURIComponent(xsrfCookie);
        } catch (e) {
            decodedToken = xsrfCookie;
        }

        config.headers['X-XSRF-TOKEN'] = decodedToken;
        return config;
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

        var config = Object.assign({}, requestOptions, {
            headers: headers,
            credentials: 'include',
        });
        config = attachXsrfHeader(config);

        return fetch(url, config)
            .then(function (res) {
                // Si la sesión caducó, limpiar estado local y regresar al login.
                if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/me')) {
                    console.warn('Sesión expirada. Redirigiendo al login...');
                    clearSessionState();
                    window.location.href = 'Login.html';
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

    function initCsrfCookie() {
        return fetch(CSRF_URL, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
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
            return apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },

        login: function (email, password) {
            return initCsrfCookie()
                .then(function () {
                    return apiFetch('/auth/login', {
                        method: 'POST',
                        body: JSON.stringify({ email: email, password: password }),
                    });
                })
                .then(function (res) {
                    if (res && res.success && res.data) {
                        var user = res.data.user || res.data;
                        setSessionState(user || null);
                    }
                    return res;
                });
        },

        me: function () {
            return apiFetch('/auth/me').then(function (res) {
                if (res && res.success && res.data) {
                    setSessionState(res.data);
                }
                return res;
            });
        },

        logout: function () {
            return apiFetch('/auth/logout', { method: 'POST' })
                .finally(function () {
                    clearSessionState();
                    window.location.href = 'Login.html';
                });
        },

        getToken: function () {
            // Deprecado: el token ahora viaja en cookies HttpOnly
            return null;
        },
    };

    // -------------------------------------------------------
    // Verificar si el backend está disponible
    // -------------------------------------------------------
    function checkBackend() {
        return fetch(BASE_URL.replace('/v1', '') + '/health', {
            credentials: 'include',
            headers: { 'Accept': 'application/json' },
        })
            .then(function (res) { return res.ok; })
            .catch(function () { return false; });
    }

    var DashboardAPI = {
        getStats: function () {
            return apiFetch('/dashboard/stats');
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

    // Indicar en consola si el backend responde al cargar la página
    checkBackend().then(function (online) {
        if (online) {
            console.log('%c[MarketWorld API] Backend conectado ✓ ' + BASE_URL, 'color:green;font-weight:bold');
        } else {
            console.warn('[MarketWorld API] Backend NO disponible. Modo degradado activado.');
        }
    });

})(window);
