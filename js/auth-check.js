// auth-check.js - Verificacion de sesion y logout contra API

(function(global) {
    'use strict';

    var AUTH_TOKEN_KEY = (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.AUTH_TOKEN_KEY : 'marketworld_auth_token');
    var AUTH_USER_KEY  = (typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.AUTH_USER_KEY  : 'marketworld_auth_user');

    function clearSession() {
        // Eliminar el token y datos del usuario del almacenamiento local.
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
    }

    function redirectToLogin() {
        window.location.href = APP_CONFIG.toHtmlPage('Login.html');
    }

    function loadUserInfo(user) {
        if (!user) return;

        var userName = document.getElementById('userName');
        var userRole = document.getElementById('userRole');

        if (userName) {
            userName.textContent = user.name || user.nombre || user.email || 'Usuario';
        }
        if (userRole) userRole.textContent = user.rol || 'Usuario';
    }

    function checkSession() {
        // Shortcircuit inmediato: si no hay token en localStorage no tiene caso
        // llamar al backend, ya sería rechazado con 401 de todas formas.
        var token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) {
            redirectToLogin();
            return Promise.resolve(false);
        }

        if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.auth) {
            redirectToLogin();
            return Promise.resolve(false);
        }

        return MarketWorld.api.auth.me()
            .then(function(body) {
                var user = (body.data) ? body.data : (body.user || null);
                
                if (user) {
                    loadUserInfo(user);
                    return true;
                } else {
                    console.warn('Sesión no encontrada en el servidor');
                    throw new Error('No user data');
                }
            })
            .catch(function() {
                clearSession();
                redirectToLogin();
                return false;
            });
    }

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
        if (e) e.preventDefault();

        if (!confirm('¿Seguro que deseas cerrar sesion?')) {
            return;
        }

        if (typeof MarketWorld !== 'undefined' && MarketWorld.api && MarketWorld.api.auth) {
            MarketWorld.api.auth.logout()
                .catch(function() {
                    clearSession();
                    redirectToLogin();
                });
            return;
        }

        clearSession();
        redirectToLogin();
    }

    document.addEventListener('DOMContentLoaded', function() {
        initLogout();

        // Verificamos sesión contra el servidor en cada carga de página protegida.
        checkSession();
    });

    global.MarketWorld = global.MarketWorld || {};
    global.MarketWorld.auth = {
        checkSession: checkSession,
        loadUserInfo: loadUserInfo,
        initLogout: initLogout,
        handleLogout: handleLogout
    };

})(window);
