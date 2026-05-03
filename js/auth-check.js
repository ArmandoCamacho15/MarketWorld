// auth-check.js - Verificacion de sesion y logout contra API

(function(global) {
    'use strict';

    var AUTH_TOKEN_KEY = 'marketworld_auth_token';
    var AUTH_USER_KEY = 'marketworld_auth_user';

    function getStoredUser() {
        var raw = localStorage.getItem(AUTH_USER_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (error) {
            return null;
        }
    }

    function clearSession() {
        // La sesión se limpia en el backend; el frontend ya no guarda tokens.
        if (typeof MarketWorld !== 'undefined' && MarketWorld.data && MarketWorld.data.logout) {
            MarketWorld.data.logout();
        }
    }

    function redirectToLogin() {
        window.location.href = 'Login.html';
    }

    function syncUserToLegacyStore(user) {
        if (!user) return;
        
        if (typeof MarketWorld !== 'undefined' && MarketWorld.data && MarketWorld.data.setCurrentUser) {
            MarketWorld.data.setCurrentUser({
                nombre: user.name || user.nombre || '',
                apellido: user.apellido || '',
                email: user.email || '',
                rol: user.rol || 'Usuario'
            });
        }
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
        if (typeof MarketWorld === 'undefined' || !MarketWorld.api || !MarketWorld.api.auth) {
            redirectToLogin();
            return Promise.resolve(false);
        }

        return MarketWorld.api.auth.me()
            .then(function(body) {
                var user = (body.data) ? body.data : (body.user || null);
                
                if (user) {
                    // Sincronizamos con el estado global para UI, pero sin persistir en disco.
                    syncUserToLegacyStore(user);
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
