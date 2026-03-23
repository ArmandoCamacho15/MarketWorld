// auth-check.js - Verificacion de sesion y logout contra API

(function(global) {
    'use strict';

    var AUTH_BASE_URL = 'http://127.0.0.1:8000/api/v1/auth';
    var AUTH_TOKEN_KEY = 'marketworld_auth_token';
    var AUTH_USER_KEY = 'marketworld_auth_user';

    function getToken() {
        return localStorage.getItem(AUTH_TOKEN_KEY);
    }

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
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);

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
        var token = getToken();
        if (!token) {
            redirectToLogin();
            return Promise.resolve(false);
        }

        return fetch(AUTH_BASE_URL + '/me', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        })
            .then(function(res) {
                return res.json().then(function(body) {
                    if (!res.ok || !body.success) {
                        throw { status: res.status, body: body };
                    }
                    return body;
                });
            })
            .then(function(body) {
                // El endpoint /me en Laravel suele devolver un objeto con 'data' que CONTIENE el usuario
                var user = (body.data) ? body.data : (body.user || null);
                
                if (user) {
                    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
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

        var token = getToken();

        if (!token) {
            clearSession();
            redirectToLogin();
            return;
        }

        fetch(AUTH_BASE_URL + '/logout', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        })
            .finally(function() {
                clearSession();
                redirectToLogin();
            });
    }

    document.addEventListener('DOMContentLoaded', function() {
        initLogout();

        var cachedUser = getStoredUser();
        if (cachedUser) {
            loadUserInfo(cachedUser);
        }

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
