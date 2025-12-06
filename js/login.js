// login.js
// Este archivo gestiona la lógica de la página de inicio de sesión, incluyendo validación de campos, almacenamiento del correo si el usuario lo solicita, notificaciones tipo toast y simulación de autenticación y login social.

/**
 * Script para el módulo Login
 * Funcionalidades: validación, autenticación, recuperación de contraseña
 */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        console.log('🔐 Módulo Login cargado');
        
        initLoginForm();
        initPasswordToggle();
        initRememberMe();
        initForgotPassword();
        initSocialLogin();
    });

    // Formulario de login
    function initLoginForm() {
        const loginForm = document.querySelector('form');
        
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
    }

    function handleLogin(e) {
        e.preventDefault();
        
        const email = document.querySelector('input[type="email"]').value.trim();
        const password = document.querySelector('input[type="password"]').value;
        
        // Validaciones
        if (!validateEmail(email)) {
            showError('Email', 'Por favor ingresa un email válido');
            return;
        }
        
        if (password.length < 6) {
            showError('Contraseña', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }
        
        console.log('🔓 Intentando login:', { email });
        
        // Simulación de autenticación
        authenticateUser(email, password);
    }

    function authenticateUser(email, password) {
        // Simulación de llamada API
        console.log('🌐 Autenticando usuario...');
        
        // Usuarios de prueba
        const validUsers = [
            { email: 'admin@marketworld.com', password: 'admin123', role: 'Administrador' },
            { email: 'ventas@marketworld.com', password: 'ventas123', role: 'Vendedor' },
            { email: 'user@marketworld.com', password: '123456', role: 'Usuario' }
        ];
        
        const user = validUsers.find(u => u.email === email && u.password === password);
        
        setTimeout(() => {
            if (user) {
                console.log('✅ Login exitoso');
                
                // Guardar sesión
                localStorage.setItem('marketworld_user', JSON.stringify({
                    email: user.email,
                    role: user.role,
                    loginTime: new Date().toISOString()
                }));
                
                // Redirigir al inicio
                showSuccess(`¡Bienvenido ${user.role}!`);
                
                setTimeout(() => {
                    window.location.href = 'inicio.html';
                }, 1500);
            } else {
                console.log('❌ Credenciales inválidas');
                showError('Error de autenticación', 'Email o contraseña incorrectos');
            }
        }, 1000);
    }

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Toggle para mostrar/ocultar contraseña
    function initPasswordToggle() {
        const toggleButtons = document.querySelectorAll('.password-toggle');
        
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.previousElementSibling;
                const icon = btn.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('bi-eye-slash');
                    icon.classList.add('bi-eye');
                } else {
                    input.type = 'password';
                    icon.classList.remove('bi-eye');
                    icon.classList.add('bi-eye-slash');
                }
            });
        });
    }

    // Recordar usuario
    function initRememberMe() {
        const rememberCheckbox = document.getElementById('rememberMe');
        const emailInput = document.querySelector('input[type="email"]');
        
        if (rememberCheckbox && emailInput) {
            // Cargar email guardado
            const savedEmail = localStorage.getItem('marketworld_remember_email');
            if (savedEmail) {
                emailInput.value = savedEmail;
                rememberCheckbox.checked = true;
            }
            
            rememberCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    localStorage.setItem('marketworld_remember_email', emailInput.value);
                    console.log('💾 Email guardado');
                } else {
                    localStorage.removeItem('marketworld_remember_email');
                    console.log('🗑️ Email eliminado');
                }
            });
        }
    }

    // Recuperación de contraseña
    function initForgotPassword() {
        const forgotLink = document.querySelector('a[href*="forgot"]');
        
        if (forgotLink) {
            forgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                handleForgotPassword();
            });
        }
    }

    function handleForgotPassword() {
        const email = prompt('Ingresa tu email para recuperar tu contraseña:');
        
        if (email && validateEmail(email)) {
            console.log(`📧 Enviando email de recuperación a: ${email}`);
            
            setTimeout(() => {
                alert(`✅ Email de recuperación enviado a ${email}\n\nRevisa tu bandeja de entrada y spam.`);
            }, 1000);
        } else if (email) {
            alert('❌ Email inválido');
        }
    }

    // Login con redes sociales
    function initSocialLogin() {
        const socialButtons = document.querySelectorAll('.btn-floating');
        
        socialButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const platform = btn.querySelector('i').className;
                
                let socialNetwork = 'desconocida';
                if (platform.includes('facebook')) socialNetwork = 'Facebook';
                else if (platform.includes('google')) socialNetwork = 'Google';
                else if (platform.includes('twitter')) socialNetwork = 'Twitter';
                
                console.log(`🔗 Intentando login con ${socialNetwork}`);
                alert(`Login con ${socialNetwork} no disponible en esta demo`);
            });
        });
    }

    // Mensajes de error y éxito
    function showError(title, message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            <strong>${title}:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => alertDiv.remove(), 5000);
    }

    function showSuccess(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            <strong>✅ Éxito:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => alertDiv.remove(), 3000);
    }

    /**
     * ===========================
     * LOGIN.JS - TODOS LOS BOTONES FUNCIONALES
     * ===========================
     */

    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ Login iniciado');
        
        // ===========================
        // 1. BOTÓN TOGGLE PASSWORD
        // ===========================
        const togglePasswordBtn = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('passwordInput');
        
        if (togglePasswordBtn && passwordInput) {
            togglePasswordBtn.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                const icon = this.querySelector('i');
                if (icon) {
                    icon.classList.toggle('bi-eye');
                    icon.classList.toggle('bi-eye-slash');
                }
            });
        }
        
        // ===========================
        // 2. BOTÓN LOGIN (SUBMIT)
        // ===========================
        const loginForm = document.getElementById('loginForm');
        const btnLogin = document.querySelector('.btn-login-white');
        
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const email = document.getElementById('emailInput').value;
                const password = passwordInput.value;
                
                if (!email || !password) {
                    alert('⚠️ Completa todos los campos');
                    return;
                }
                
                console.log('🔐 Botón Login clickeado');
                
                // Mostrar loader
                if (btnLogin) {
                    const btnText = btnLogin.querySelector('.btn-text');
                    const btnLoader = btnLogin.querySelector('.btn-loader');
                    
                    if (btnText && btnLoader) {
                        btnText.classList.add('d-none');
                        btnLoader.classList.remove('d-none');
                        btnLogin.disabled = true;
                    }
                }
                
                // Simular login
                setTimeout(() => {
                    const rememberMe = document.getElementById('rememberMe');
                    if (rememberMe && rememberMe.checked) {
                        localStorage.setItem('rememberUser', email);
                    }
                    
                    window.location.href = 'inicio.html';
                }, 1500);
            });
        }
        
        // ===========================
        // 3. BOTONES SOCIAL LOGIN
        // ===========================
        const btnGoogle = document.querySelector('.btn-google');
        const btnMicrosoft = document.querySelector('.btn-microsoft');
        const btnApple = document.querySelector('.btn-apple');
        
        if (btnGoogle) {
            btnGoogle.addEventListener('click', function() {
                console.log('🔵 Botón Google clickeado');
                alert('Iniciando sesión con Google...\n(Funcionalidad en desarrollo)');
            });
        }
        
        if (btnMicrosoft) {
            btnMicrosoft.addEventListener('click', function() {
                console.log('🔷 Botón Microsoft clickeado');
                alert('Iniciando sesión con Microsoft...\n(Funcionalidad en desarrollo)');
            });
        }
        
        if (btnApple) {
            btnApple.addEventListener('click', function() {
                console.log('🍎 Botón Apple clickeado');
                alert('Iniciando sesión con Apple...\n(Funcionalidad en desarrollo)');
            });
        }
        
        // ===========================
        // 4. LINK FORGOT PASSWORD
        // ===========================
        const forgotPasswordLink = document.getElementById('forgotPasswordLink');
        
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('❓ Link olvide contraseña clickeado');
                
                const email = prompt('Ingresa tu correo electrónico:');
                
                if (email && email.includes('@')) {
                    alert(`✅ Se ha enviado un correo de recuperación a: ${email}`);
                } else if (email) {
                    alert('⚠️ Correo inválido');
                }
            });
        }
        
        // ===========================
        // 5. LINK REGISTRARSE
        // ===========================
        const registerLink = document.querySelector('.register-link-white');
        
        if (registerLink) {
            registerLink.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('📝 Link registrarse clickeado');
                window.location.href = 'nuevo_usuario.html';
            });
        }
    });

    /**
     * LOGIN.JS - Sistema de autenticación
     */

    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ Login iniciado');
        
        const togglePasswordBtn = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('passwordInput');
        
        if (togglePasswordBtn && passwordInput) {
            togglePasswordBtn.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                const icon = this.querySelector('i');
                if (icon) {
                    icon.classList.toggle('bi-eye');
                    icon.classList.toggle('bi-eye-slash');
                }
            });
        }
        
        const loginForm = document.getElementById('loginForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const email = document.getElementById('emailInput')?.value;
                const password = passwordInput?.value;
                
                if (!email || !password) {
                    alert('⚠️ Completa todos los campos');
                    return;
                }
                
                setTimeout(() => {
                    window.location.href = 'inicio.html';
                }, 1000);
            });
        }
    });

})();

