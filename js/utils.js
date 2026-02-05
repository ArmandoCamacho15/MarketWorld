/**
 * utils.js
 * Funciones utilitarias compartidas en todo el proyecto MarketWorld
 */

(function(global) {
    'use strict';

    /**
     * Función debounce para limitar la frecuencia de ejecución
     * @param {Function} func - Función a ejecutar
     * @param {number} wait - Tiempo de espera en milisegundos
     * @returns {Function} - Función con debounce aplicado
     */
    function debounce(func, wait) {
        var timeout;
        return function() {
            var context = this;
            var args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }

    /**
     * Formatea un número como moneda colombiana
     * @param {number} value - Valor a formatear
     * @returns {string} - Valor formateado
     */
    function formatCurrency(value) {
        return '$' + Number(value).toLocaleString('es-CO');
    }

    /**
     * Formatea una fecha en formato local
     * @param {string|Date} date - Fecha a formatear
     * @returns {string} - Fecha formateada
     */
    function formatDate(date) {
        var d = new Date(date);
        return d.toLocaleDateString('es-CO');
    }

    /**
     * Formatea fecha y hora
     * @param {string|Date} date - Fecha a formatear
     * @returns {string} - Fecha y hora formateada
     */
    function formatDateTime(date) {
        var d = new Date(date);
        return d.toLocaleString('es-CO');
    }

    /**
     * Valida el formato de un email
     * @param {string} email - Email a validar
     * @returns {boolean} - True si es válido
     */
    function validateEmail(email) {
        var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    /**
     * Escapa caracteres HTML para prevenir XSS
     * @param {string} str - Cadena a escapar
     * @returns {string} - Cadena escapada
     */
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Muestra una notificación toast
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo: success, error, warning, info
     * @param {number} duration - Duración en milisegundos
     */
    function showNotification(message, type, duration) {
        type = type || 'info';
        duration = duration || 4000;

        // Remover notificación anterior
        var existing = document.querySelector('.mw-notification');
        if (existing) {
            existing.remove();
        }

        var alertClass = 'alert-info';
        var icon = 'bi-info-circle';

        switch(type) {
            case 'success':
                alertClass = 'alert-success';
                icon = 'bi-check-circle';
                break;
            case 'error':
                alertClass = 'alert-danger';
                icon = 'bi-x-circle';
                break;
            case 'warning':
                alertClass = 'alert-warning';
                icon = 'bi-exclamation-triangle';
                break;
        }

        var alertDiv = document.createElement('div');
        alertDiv.className = 'alert ' + alertClass + ' alert-dismissible fade show position-fixed mw-notification';
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; max-width: 400px;';
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = '<i class="bi ' + icon + ' me-2" aria-hidden="true"></i>' + 
                             escapeHtml(message) + 
                             '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>';

        document.body.appendChild(alertDiv);

        setTimeout(function() {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, duration);
    }

    /**
     * Verifica si el usuario está autenticado
     * @returns {object|null} - Datos del usuario o null
     */
    function getCurrentUser() {
        try {
            var userData = localStorage.getItem('marketworld_user');
            return userData ? JSON.parse(userData) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Cierra la sesión del usuario
     */
    function logout() {
        localStorage.removeItem('marketworld_user');
        window.location.href = 'Login.html';
    }

    /**
     * Genera un ID único
     * @returns {string} - ID único
     */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Verifica si un elemento está vacío
     * @param {*} value - Valor a verificar
     * @returns {boolean} - True si está vacío
     */
    function isEmpty(value) {
        return value === null || 
               value === undefined || 
               value === '' || 
               (Array.isArray(value) && value.length === 0) ||
               (typeof value === 'object' && Object.keys(value).length === 0);
    }

    /**
     * Clona un objeto de forma profunda
     * @param {object} obj - Objeto a clonar
     * @returns {object} - Clon del objeto
     */
    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Capitaliza la primera letra de un texto
     * @param {string} str - Texto a capitalizar
     * @returns {string} - Texto capitalizado
     */
    function capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    // Exponer funciones globalmente
    global.MarketWorld = global.MarketWorld || {};
    global.MarketWorld.utils = {
        debounce: debounce,
        formatCurrency: formatCurrency,
        formatDate: formatDate,
        formatDateTime: formatDateTime,
        validateEmail: validateEmail,
        escapeHtml: escapeHtml,
        showNotification: showNotification,
        getCurrentUser: getCurrentUser,
        logout: logout,
        generateId: generateId,
        isEmpty: isEmpty,
        deepClone: deepClone,
        capitalize: capitalize
    };

    // También exponer debounce globalmente para compatibilidad
    global.debounce = debounce;

})(typeof window !== 'undefined' ? window : this);
