// auth-check.js - Verificacion de sesion y logout

(function(global) {
    'use strict';

    // Verificar sesion activa
    function checkSession() {
        if (typeof MarketWorld === 'undefined' || !MarketWorld.data || !MarketWorld.data.isLoggedIn()) {
            window.location.href = 'Login.html';
        }
    }

    // Cargar info del usuario
    function loadUserInfo() {
        if (typeof MarketWorld === 'undefined' || !MarketWorld.data) return;
        
        var user = MarketWorld.data.getCurrentUser();
        if (user) {
            var userName = document.getElementById('userName');
            var userRole = document.getElementById('userRole');
            
            if (userName) userName.textContent = user.nombre + ' ' + user.apellido;
            if (userRole) userRole.textContent = user.rol;
        }
    }

    // Configurar logout
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

    // Manejar logout
    function handleLogout(e) {
        e.preventDefault();
        
        if (confirm('¿Seguro que deseas cerrar sesion?')) {
            if (typeof MarketWorld !== 'undefined' && MarketWorld.data) {
                MarketWorld.data.logout();
            }
            window.location.href = 'Login.html';
        }
    }

    // Inicializar automaticamente
    document.addEventListener('DOMContentLoaded', function() {
        checkSession();
        loadUserInfo();
        initLogout();
    });

    // Exponer funciones
    global.MarketWorld = global.MarketWorld || {};
    global.MarketWorld.auth = {
        checkSession: checkSession,
        loadUserInfo: loadUserInfo,
        initLogout: initLogout,
        handleLogout: handleLogout
    };

})(window);
