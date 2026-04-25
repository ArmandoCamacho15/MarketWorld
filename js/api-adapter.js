/**
 * api-adapter.js
 * Adaptador que conecta el frontend MarketWorld con el backend Laravel.
 * Usa la API REST primero; si falla, cae al localStorage como respaldo.
 *
 * USO: incluir este script ANTES de inventario.js / crm.js en el HTML.
 *
 *   <script src="../js/api-adapter.js"></script>
 */

(function (global) {
    'use strict';

    // -------------------------------------------------------
    // Configuración — cambia BASE_URL si tu servidor corre
    // en otro puerto o dominio.
    // -------------------------------------------------------
    var currentHost = (typeof window !== 'undefined' && window.location && window.location.hostname)
        ? window.location.hostname
        : '127.0.0.1';
    // Permite override manual si se define antes de cargar el adaptador.
    var BASE_URL = global.MARKETWORLD_API_BASE_URL || ('http://' + currentHost + ':8000/api/v1');
    var API_ROOT = BASE_URL.replace('/api/v1', '');
    var CSRF_URL = API_ROOT + '/sanctum/csrf-cookie';
    var AUTH_TOKEN_KEY = 'marketworld_auth_token';
    var AUTH_USER_KEY = 'marketworld_auth_user';

    // Cabeceras comunes para JSON
    var JSON_HEADERS = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    };

    function setSessionState(user) {
        // Marcador temporal de compatibilidad para módulos aún no migrados a cookie-only.
        localStorage.setItem(AUTH_TOKEN_KEY, 'cookie_session');
        if (user) {
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
        }
    }

    function clearSessionState() {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
    }

    function buildHeaders(customHeaders) {
        return Object.assign({}, JSON_HEADERS, customHeaders || {});
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
        var config = Object.assign({}, requestOptions, {
            headers: buildHeaders(requestOptions.headers),
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
        }
    };

    // -------------------------------------------------------
    // API de Autenticación (Sanctum)
    // -------------------------------------------------------
    var AuthAPI = {

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
            return localStorage.getItem(AUTH_TOKEN_KEY);
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
        }
    };

    // -------------------------------------------------------
    // Exportar bajo el namespace global MarketWorld.api
    // -------------------------------------------------------
    global.MarketWorld = global.MarketWorld || {};
    global.MarketWorld.api = {
        products:  ProductAPI,
        customers: CustomerAPI,
        invoices:  InvoiceAPI,
        purchases: PurchaseAPI,
        dashboard: DashboardAPI,
        reports: ReportAPI,
        crm:       CrmAPI,
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
            console.warn('[MarketWorld API] Backend NO disponible. Usando localStorage como respaldo.');
        }
    });

})(window);
