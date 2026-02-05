/**
 * login.js
 * Módulo de autenticación de MarketWorld
 * Gestiona el inicio de sesión, validación y redirección
 */

(function() {
    'use strict';

    // Usuarios de prueba para demostración
    const VALID_USERS = [
        { email: 'admin@marketworld.com', password: 'admin123', role: 'Administrador' },
        { email: 'ventas@marketworld.com', password: 'ventas123', role: 'Vendedor' },
        { email: 'user@marketworld.com', password: '123456', role: 'Usuario' }
    ];

    /**
     * Inicialización del módulo
     */
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Módulo Login cargado');
        
        initLoginForm();
        initPasswordToggle();
        initRememberMe();
        initForgotPassword();
        initSocialLogin();
        initRegisterLink();
    });

    /**
     * Inicializa el formulario de login
     */
    function initLoginForm() {
        const loginForm = document.getElementById('loginForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    }

    /**
     * Maneja el envío del formulario de login
     * @param {Event} e - Evento de submit
     */
    function handleLogin(e) {
        e.preventDefault();
        
        const emailInput = document.getElementById('emailInput');
        const passwordInput = document.getElementById('passwordInput');
        const btnLogin = document.querySelector('.btn-login-white');
        
        const email = emailInput ? emailInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';
        
        // Validaciones
        if (!email || !password) {
            showNotification('Por favor completa todos los campos', 'warning');
            return;
        }
        
        if (!validateEmail(email)) {
            showNotification('Por favor ingresa un email válido', 'error');
            return;
        }
        
        if (password.length < 6) {
            showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
            return;
        }
        
        // Mostrar estado de carga
        setLoadingState(btnLogin, true);
        
        // Simular autenticación
        setTimeout(function() {
            authenticateUser(email, password, btnLogin);
        }, 1000);
    }

    /**
     * Autentica al usuario contra la lista de usuarios válidos
     * @param {string} email - Email del usuario
     * @param {string} password - Contraseña del usuario
     * @param {HTMLElement} btnLogin - Botón de login
     */
    function authenticateUser(email, password, btnLogin) {
        const user = VALID_USERS.find(function(u) {
            return u.email === email && u.password === password;
        });
        
        if (user) {
            // Guardar sesión
            localStorage.setItem('marketworld_user', JSON.stringify({
                email: user.email,
                role: user.role,
                loginTime: new Date().toISOString()
            }));
            
            // Guardar email si "recordarme" está activo
            const rememberMe = document.getElementById('rememberMe');
            if (rememberMe && rememberMe.checked) {
                localStorage.setItem('marketworld_remember_email', email);
            }
            
            showNotification('Bienvenido ' + user.role, 'success');
            
            setTimeout(function() {
                window.location.href = 'inicio.html';
            }, 1500);
        } else {
            setLoadingState(btnLogin, false);
            showNotification('Email o contraseña incorrectos', 'error');
        }
    }

    /**
     * Valida el formato de un email
     * @param {string} email - Email a validar
     * @returns {boolean} - True si el email es válido
     */
    function validateEmail(email) {
        var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    /**
     * Inicializa el toggle de visibilidad de contraseña
     */
    function initPasswordToggle() {
        var toggleBtn = document.getElementById('togglePassword');
        var passwordInput = document.getElementById('passwordInput');
        
        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', function() {
                var type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                var icon = this.querySelector('i');
                if (icon) {
                    icon.classList.toggle('bi-eye');
                    icon.classList.toggle('bi-eye-slash');
                }
            });
        }
    }

    /**
     * Inicializa la función de recordar usuario
     */
    function initRememberMe() {
        var rememberCheckbox = document.getElementById('rememberMe');
        var emailInput = document.getElementById('emailInput');
        
        if (rememberCheckbox && emailInput) {
            // Cargar email guardado
            var savedEmail = localStorage.getItem('marketworld_remember_email');
            if (savedEmail) {
                emailInput.value = savedEmail;
                rememberCheckbox.checked = true;
            }
        }
    }

    /**
     * Inicializa el enlace de recuperación de contraseña
     */
    function initForgotPassword() {
        var forgotLink = document.getElementById('forgotPasswordLink');
        
        if (forgotLink) {
            forgotLink.addEventListener('click', function(e) {
                e.preventDefault();
                handleForgotPassword();
            });
        }
    }

    /**
     * Maneja la solicitud de recuperación de contraseña
     */
    function handleForgotPassword() {
        var email = prompt('Ingresa tu email para recuperar tu contraseña:');
        
        if (email && validateEmail(email)) {
            showNotification('Email de recuperación enviado a ' + email, 'success');
        } else if (email) {
            showNotification('Email inválido', 'error');
        }
    }

    /**
     * Inicializa los botones de login social
     */
    function initSocialLogin() {
        var btnGoogle = document.querySelector('.btn-google');
        var btnMicrosoft = document.querySelector('.btn-microsoft');
        var btnApple = document.querySelector('.btn-apple');
        
        if (btnGoogle) {
            btnGoogle.addEventListener('click', function() {
                showNotification('Login con Google no disponible en esta versión', 'info');
            });
        }
        
        if (btnMicrosoft) {
            btnMicrosoft.addEventListener('click', function() {
                showNotification('Login con Microsoft no disponible en esta versión', 'info');
            });
        }
        
        if (btnApple) {
            btnApple.addEventListener('click', function() {
                showNotification('Login con Apple no disponible en esta versión', 'info');
            });
        }
    }

    /**
     * Inicializa el enlace de registro
     */
    function initRegisterLink() {
        var registerLink = document.querySelector('.register-link-white');
        
        if (registerLink) {
            registerLink.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = 'nuevo_usuario.html';
            });
        }
    }

    /**
     * Establece el estado de carga del botón
     * @param {HTMLElement} button - Botón a modificar
     * @param {boolean} isLoading - Estado de carga
     */
    function setLoadingState(button, isLoading) {
        if (!button) return;
        
        var btnText = button.querySelector('.btn-text');
        var btnLoader = button.querySelector('.btn-loader');
        
        if (btnText && btnLoader) {
            if (isLoading) {
                btnText.classList.add('d-none');
                btnLoader.classList.remove('d-none');
                button.disabled = true;
            } else {
                btnText.classList.remove('d-none');
                btnLoader.classList.add('d-none');
                button.disabled = false;
            }
        }
    }

    /**
     * Muestra una notificación al usuario
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo: success, error, warning, info
     */
    function showNotification(message, type) {
        // Remover notificación anterior
        var existing = document.querySelector('.login-notification');
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
        alertDiv.className = 'alert ' + alertClass + ' alert-dismissible fade show position-fixed login-notification';
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; max-width: 400px;';
        alertDiv.setAttribute('role', 'alert');
        alertDiv.innerHTML = '<i class="bi ' + icon + ' me-2"></i>' + message + '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>';
        
        document.body.appendChild(alertDiv);
        
        setTimeout(function() {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }

})();
