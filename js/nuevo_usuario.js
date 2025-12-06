/**
 * Script para el módulo Nuevo Usuario (Registro)
 * Funcionalidades: validación de formulario, verificación de contraseña, términos
 */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        console.log('📝 Módulo Registro cargado');
        
        initRegisterForm();
        initPasswordStrength();
        initPasswordToggle();
        initTermsValidation();
        initEmailValidation();
    });

    // Formulario de registro
    function initRegisterForm() {
        const registerForm = document.querySelector('form');
        
        if (registerForm) {
            registerForm.addEventListener('submit', handleRegister);
        }
    }

    function handleRegister(e) {
        e.preventDefault();
        
        const firstName = document.getElementById('firstName')?.value.trim();
        const lastName = document.getElementById('lastName')?.value.trim();
        const email = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        const termsAccepted = document.getElementById('termsCheck')?.checked;
        
        // Validaciones
        if (!firstName || !lastName) {
            showError('Campos requeridos', 'Por favor completa tu nombre y apellido');
            return;
        }
        
        if (!validateEmail(email)) {
            showError('Email inválido', 'Por favor ingresa un email válido');
            return;
        }
        
        if (password.length < 8) {
            showError('Contraseña débil', 'La contraseña debe tener al menos 8 caracteres');
            return;
        }
        
        if (password !== confirmPassword) {
            showError('Contraseñas no coinciden', 'Las contraseñas deben ser iguales');
            return;
        }
        
        if (!termsAccepted) {
            showError('Términos no aceptados', 'Debes aceptar los términos y condiciones');
            return;
        }
        
        console.log('📤 Registrando usuario:', { firstName, lastName, email });
        
        // Simulación de registro
        registerUser({ firstName, lastName, email, password });
    }

    function registerUser(userData) {
        console.log('🌐 Creando usuario...');
        
        // Simulación de llamada API
        setTimeout(() => {
            console.log('✅ Usuario registrado exitosamente');
            
            // Guardar datos de sesión
            localStorage.setItem('marketworld_user', JSON.stringify({
                email: userData.email,
                name: `${userData.firstName} ${userData.lastName}`,
                role: 'Usuario',
                registeredAt: new Date().toISOString()
            }));
            
            showSuccess('¡Registro exitoso! Redirigiendo...');
            
            setTimeout(() => {
                window.location.href = 'inicio.html';
            }, 2000);
        }, 1500);
    }

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Indicador de fortaleza de contraseña
    function initPasswordStrength() {
        const passwordInput = document.getElementById('password');
        
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                const password = e.target.value;
                const strength = calculatePasswordStrength(password);
                
                displayPasswordStrength(strength);
            });
        }
    }

    function calculatePasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;
        
        return strength;
    }

    function displayPasswordStrength(strength) {
        let strengthIndicator = document.getElementById('passwordStrength');
        
        if (!strengthIndicator) {
            strengthIndicator = document.createElement('div');
            strengthIndicator.id = 'passwordStrength';
            strengthIndicator.style.cssText = 'margin-top: 5px; font-size: 0.85rem;';
            document.getElementById('password').parentElement.appendChild(strengthIndicator);
        }
        
        const levels = [
            { text: 'Muy débil', color: '#e74c3c' },
            { text: 'Débil', color: '#f39c12' },
            { text: 'Media', color: '#f1c40f' },
            { text: 'Fuerte', color: '#2ecc71' },
            { text: 'Muy fuerte', color: '#27ae60' }
        ];
        
        const level = levels[strength] || levels[0];
        strengthIndicator.textContent = `Fortaleza: ${level.text}`;
        strengthIndicator.style.color = level.color;
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

    // Validación de términos y condiciones
    function initTermsValidation() {
        const termsCheckbox = document.getElementById('termsCheck');
        const submitButton = document.querySelector('button[type="submit"]');
        
        if (termsCheckbox && submitButton) {
            termsCheckbox.addEventListener('change', (e) => {
                submitButton.disabled = !e.target.checked;
                console.log(`✅ Términos ${e.target.checked ? 'aceptados' : 'no aceptados'}`);
            });
            
            // Inicialmente deshabilitar botón
            submitButton.disabled = !termsCheckbox.checked;
        }
        
        // Enlaces de términos
        const termsLink = document.querySelector('a[href*="terminos"]');
        const privacyLink = document.querySelector('a[href*="privacidad"]');
        
        if (termsLink) {
            termsLink.addEventListener('click', (e) => {
                e.preventDefault();
                showTermsModal();
            });
        }
        
        if (privacyLink) {
            privacyLink.addEventListener('click', (e) => {
                e.preventDefault();
                showPrivacyModal();
            });
        }
    }

    function showTermsModal() {
        alert('Términos y Condiciones\n\n1. Uso del servicio\n2. Privacidad de datos\n3. Responsabilidades\n\n(En producción, esto sería un modal completo)');
    }

    function showPrivacyModal() {
        alert('Política de Privacidad\n\n1. Recopilación de datos\n2. Uso de información\n3. Protección de datos\n\n(En producción, esto sería un modal completo)');
    }

    // Validación de email en tiempo real
    function initEmailValidation() {
        const emailInput = document.getElementById('email');
        
        if (emailInput) {
            emailInput.addEventListener('blur', (e) => {
                const email = e.target.value.trim();
                
                if (email && !validateEmail(email)) {
                    emailInput.classList.add('is-invalid');
                    showFieldError(emailInput, 'Email inválido');
                } else {
                    emailInput.classList.remove('is-invalid');
                    emailInput.classList.add('is-valid');
                    removeFieldError(emailInput);
                }
            });
        }
    }

    function showFieldError(input, message) {
        let errorDiv = input.parentElement.querySelector('.invalid-feedback');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'invalid-feedback';
            input.parentElement.appendChild(errorDiv);
        }
        
        errorDiv.textContent = message;
    }

    function removeFieldError(input) {
        const errorDiv = input.parentElement.querySelector('.invalid-feedback');
        if (errorDiv) {
            errorDiv.remove();
        }
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
     * NUEVO_USUARIO.JS - TODOS LOS BOTONES FUNCIONALES
     * ===========================
     */

    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ Registro iniciado');
        
        const togglePassword = document.getElementById('togglePassword');
        const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                const icon = this.querySelector('i');
                if (icon) {
                    icon.classList.toggle('bi-eye');
                    icon.classList.toggle('bi-eye-slash');
                }
            });
        }
        
        if (toggleConfirmPassword && confirmPasswordInput) {
            toggleConfirmPassword.addEventListener('click', function() {
                const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                confirmPasswordInput.setAttribute('type', type);
                
                const icon = this.querySelector('i');
                if (icon) {
                    icon.classList.toggle('bi-eye');
                    icon.classList.toggle('bi-eye-slash');
                }
            });
        }
        
        const registerForm = document.getElementById('registerForm');
        
        if (registerForm) {
            registerForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const firstName = document.getElementById('firstName')?.value;
                const lastName = document.getElementById('lastName')?.value;
                const email = document.getElementById('email')?.value;
                const password = passwordInput?.value;
                const confirmPassword = confirmPasswordInput?.value;
                
                if (!firstName || !lastName || !email || !password || !confirmPassword) {
                    alert('⚠️ Completa todos los campos');
                    return;
                }
                
                if (password !== confirmPassword) {
                    alert('⚠️ Las contraseñas no coinciden');
                    return;
                }
                
                setTimeout(() => {
                    alert('✅ Registro exitoso');
                    window.location.href = 'Login.html';
                }, 1000);
            });
        }
    });

})();
