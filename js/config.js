/**
 * js/config.js
 * Configuración del frontend por entorno.
 * Para cambiar de local a producción, solo modificar este archivo
 * o definir window.API_URL antes de cargar este script.
 */
const APP_CONFIG = {
    // La URL se lee del atributo data-api-url del <body> si existe,
    // para poder configurarla desde el servidor sin recompilar JS
    API_URL: (typeof document !== 'undefined' && document.body && document.body.dataset.apiUrl) 
        || 'http://127.0.0.1:8000/api/v1',
    MODO_DEBUG: (typeof document !== 'undefined' && document.body && document.body.dataset.debug === 'true'),
    AUTH_TOKEN_KEY: 'marketworld_auth_token',
    AUTH_USER_KEY: 'marketworld_auth_user'
};
