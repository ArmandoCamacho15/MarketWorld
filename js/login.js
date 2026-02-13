// login.js - Autenticacion de MarketWorld

(function() {
    'use strict';

    // --- Iniciar cuando cargue la página ---
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Modulo Login cargado');
        
        // --- Sesión ya iniciada ---
        if (MarketWorld.data.isLoggedIn()) {
            window.location.href = 'inicio.html';
            return;
        }
        
        initLoginForm();
        initPasswordToggle();
        initRememberMe();
        initForgotPassword();
        initRegisterLink();
    });

    // --- Configurar formulario ---
    function initLoginForm() {
        var loginForm = document.getElementById('loginForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    }

    function handleLogin(e) {
        e.preventDefault();
        
        var emailInput = document.getElementById('emailInput');
        var passwordInput = document.getElementById('passwordInput');
        var btnLogin = document.querySelector('.btn-login-white');
        
        var email = emailInput ? emailInput.value.trim() : '';
        var password = passwordInput ? passwordInput.value : '';
        
        clearErrors();
        
        // --- Validar campos ---
        var hasErrors = false;
        
        if (!email) {
            showFieldError(emailInput, 'El email es obligatorio');
            hasErrors = true;
        } else if (!isValidEmail(email)) {
            showFieldError(emailInput, 'Ingresa un email valido');
            hasErrors = true;
        }
        
        if (!password) {
            showFieldError(passwordInput, 'La contrasena es obligatoria');
            hasErrors = true;
        } else if (password.length < 6) {
            showFieldError(passwordInput, 'Minimo 6 caracteres');
            hasErrors = true;
        }
        
        if (hasErrors) return;
        
        // --- Iniciar sesión ---
        setLoadingState(btnLogin, true);
        
        setTimeout(function() {
            var user = MarketWorld.data.verifyCredentials(email, password);
            
            if (user) {
                console.log('Login exitoso:', user.email);
                MarketWorld.data.setCurrentUser(user);
                
                // --- Recordar email ---
                var rememberMe = document.getElementById('rememberMe');
                if (rememberMe && rememberMe.checked) {
                    localStorage.setItem('marketworld_remember_email', email);
                } else {
                    localStorage.removeItem('marketworld_remember_email');
                }
                
                showNotification('Bienvenido ' + user.nombre + '!', 'success');
                
                setTimeout(function() {
                    window.location.href = 'inicio.html';
                }, 1500);
                
            } else {
                setLoadingState(btnLogin, false);
                showNotification('Email o contrasena incorrectos', 'error');
                shakeElement(document.querySelector('.login-card-blue'));
            }
        }, 1000);
    }

    // --- Validar email ---
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // --- Mostrar error en campo ---
    function showFieldError(input, message) {
        if (!input) return;
        input.classList.add('is-invalid');
        
        var errorDiv = input.parentElement.querySelector('.invalid-feedback');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            input.parentElement.appendChild(errorDiv);
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    // --- Limpiar errores ---
    function clearErrors() {
        var invalidInputs = document.querySelectorAll('.is-invalid');
        for (var i = 0; i < invalidInputs.length; i++) {
            invalidInputs[i].classList.remove('is-invalid');
        }
        
        var errorMessages = document.querySelectorAll('.invalid-feedback');
        for (var j = 0; j < errorMessages.length; j++) {
            errorMessages[j].style.display = 'none';
        }
    }

    // --- Mostrar/ocultar contraseña ---
    function initPasswordToggle() {
        var toggleBtn = document.getElementById('togglePassword');
        var passwordInput = document.getElementById('passwordInput');
        
        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', function() {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    toggleBtn.innerHTML = '<i class="bi bi-eye-slash"></i>';
                } else {
                    passwordInput.type = 'password';
                    toggleBtn.innerHTML = '<i class="bi bi-eye"></i>';
                }
            });
        }
    }

    // --- Cargar email guardado ---
    function initRememberMe() {
        var emailInput = document.getElementById('emailInput');
        var rememberCheckbox = document.getElementById('rememberMe');
        var savedEmail = localStorage.getItem('marketworld_remember_email');
        
        if (savedEmail && emailInput) {
            emailInput.value = savedEmail;
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
    }

    // --- Recuperar contraseña ---
    function initForgotPassword() {
        var forgotLink = document.getElementById('forgotPasswordLink');
        if (!forgotLink) return;
        
        forgotLink.addEventListener('click', function(e) {
            e.preventDefault();
            var email = prompt('Ingresa tu email para recuperar tu contrasena:');
            
            if (email && isValidEmail(email)) {
                var user = MarketWorld.data.findUserByEmail(email);
                if (user) {
                    showNotification('Se envio un email de recuperacion a ' + email, 'success');
                } else {
                    showNotification('No existe una cuenta con ese email', 'error');
                }
            } else if (email) {
                showNotification('Email invalido', 'error');
            }
        });
    }

    // --- Ir a registro ---
    function initRegisterLink() {
        var registerLink = document.querySelector('.register-link-white');
        if (!registerLink) return;
        
        registerLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'nuevo_usuario.html';
        });
    }

    // --- Estado de carga del botón ---
    function setLoadingState(button, isLoading) {
        if (!button) return;
        var btnText = button.querySelector('.btn-text');
        var btnLoader = button.querySelector('.btn-loader');
        
        if (isLoading) {
            if (btnText) btnText.classList.add('d-none');
            if (btnLoader) btnLoader.classList.remove('d-none');
            button.disabled = true;
        } else {
            if (btnText) btnText.classList.remove('d-none');
            if (btnLoader) btnLoader.classList.add('d-none');
            button.disabled = false;
        }
    }

    // --- Mostrar notificación ---
    function showNotification(message, type) {
        var existing = document.querySelector('.login-notification');
        if (existing) existing.remove();
        
        var alertClass = type === 'success' ? 'alert-success' : 
                         type === 'error' ? 'alert-danger' : 'alert-info';
        var icon = type === 'success' ? 'bi-check-circle' : 
                   type === 'error' ? 'bi-x-circle' : 'bi-info-circle';
        
        var alertDiv = document.createElement('div');
        alertDiv.className = 'alert ' + alertClass + ' alert-dismissible fade show position-fixed login-notification';
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = '<i class="bi ' + icon + ' me-2"></i>' + message + 
                            '<button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>';
        document.body.appendChild(alertDiv);
        
        setTimeout(function() {
            if (alertDiv.parentNode) alertDiv.remove();
        }, 5000);
    }

    // --- Animar error ---
    function shakeElement(element) {
        if (!element) return;
        element.style.animation = 'shake 0.5s';
        setTimeout(function() { element.style.animation = ''; }, 500);
    }

})();
