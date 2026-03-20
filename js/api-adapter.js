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
    var BASE_URL = 'http://localhost:8000/api/v1';
    var AUTH_TOKEN_KEY = 'marketworld_auth_token';

    // Cabeceras comunes para JSON
    var JSON_HEADERS = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    function getAuthToken() {
        return localStorage.getItem(AUTH_TOKEN_KEY);
    }

    function buildHeaders(customHeaders) {
        var headers = Object.assign({}, JSON_HEADERS, customHeaders || {});
        var token = getAuthToken();

        if (token) {
            headers.Authorization = 'Bearer ' + token;
        }

        return headers;
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

    // -------------------------------------------------------
    // Utilidad interna: fetch con timeout y manejo de errores
    // -------------------------------------------------------
    function apiFetch(endpoint, options) {
        var url = BASE_URL + endpoint;
        var requestOptions = options || {};
        var config = Object.assign({}, requestOptions, {
            headers: buildHeaders(requestOptions.headers),
        });

        return fetch(url, config)
            .then(function (res) {
                // Manejo de error 401 (Token expirado o inválido)
                if (res.status === 401 && !endpoint.includes('/auth/login')) {
                    console.warn('Sesión expirada. Redirigiendo al login...');
                    localStorage.removeItem(AUTH_TOKEN_KEY);
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

    // -------------------------------------------------------
    // API de Productos (Módulo Inventario)
    // -------------------------------------------------------
    var ProductAPI = {

        getAll: function (filtros) {
            var params = new URLSearchParams(filtros || {}).toString();
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
    };

    // -------------------------------------------------------
    // API de Clientes (Módulo CRM / Facturación)
    // -------------------------------------------------------
    var CustomerAPI = {

        getAll: function (filtros) {
            var params = new URLSearchParams(filtros || {}).toString();
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
    // API de Compras (Módulo Compras)
    // -------------------------------------------------------
    var PurchaseAPI = {
        getAll: function () {
            return apiFetch('/purchases');
        },
        create: function (data) {
            return apiFetch('/purchases', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        }
    };

    // -------------------------------------------------------
    // API de Autenticación (Sanctum)
    // -------------------------------------------------------
    var AuthAPI = {

        login: function (email, password) {
            return apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: email, password: password }),
            }).then(function (res) {
                if (res && res.success && res.data && res.data.token) {
                    localStorage.setItem(AUTH_TOKEN_KEY, res.data.token);
                    localStorage.setItem('marketworld_auth_user', JSON.stringify(res.data.user));
                }
                return res;
            });
        },

        me: function () {
            return apiFetch('/auth/me');
        },

        logout: function () {
            return apiFetch('/auth/logout', { method: 'POST' })
                .finally(function () {
                    localStorage.removeItem(AUTH_TOKEN_KEY);
                    localStorage.removeItem('marketworld_auth_user');
                    window.location.href = 'Login.html';
                });
        },

        getToken: getAuthToken,
    };

    // -------------------------------------------------------
    // Verificar si el backend está disponible
    // -------------------------------------------------------
    function checkBackend() {
        return fetch(BASE_URL.replace('/v1', '') + '/health', {
            headers: { 'Accept': 'application/json' },
        })
            .then(function (res) { return res.ok; })
            .catch(function () { return false; });
    }

    // -------------------------------------------------------
    // Exportar bajo el namespace global MarketWorld.api
    // -------------------------------------------------------
    global.MarketWorld = global.MarketWorld || {};
    global.MarketWorld.api = {
        products:  ProductAPI,
        customers: CustomerAPI,
        purchases: PurchaseAPI,
        auth:      AuthAPI,
        checkBackend: checkBackend,
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
