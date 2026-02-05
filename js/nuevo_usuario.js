// nuevo_usuario.js - Registro de usuarios

(function() {
    'use strict';

    // Iniciar cuando cargue la pagina
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Modulo Registro cargado');
        initRegisterForm();
        initPasswordStrength();
        initPasswordToggle();
    });

    // Configurar formulario
    function initRegisterForm() {
        var form = document.getElementById('registerForm');
        if (!form) return;
        
        form.addEventListener('submit', handleRegister);
    }

    // Manejar el registro
    function handleRegister(e) {
        e.preventDefault();
        
        var firstName = document.getElementById('firstName');
        var lastName = document.getElementById('lastName');
        var email = document.getElementById('email');
        var phone = document.getElementById('phone');
        var password = document.getElementById('password');
        var confirmPassword = document.getElementById('confirmPassword');
        var termsCheck = document.getElementById('termsCheck');
        var btnRegister = document.querySelector('.btn-register');
        
        clearErrors();
        
        // Validar campos
        var hasErrors = false;
        
        if (!firstName.value.trim()) {
            showFieldError(firstName, 'El nombre es obligatorio');
            hasErrors = true;
        }
        
        if (!lastName.value.trim()) {
            showFieldError(lastName, 'El apellido es obligatorio');
            hasErrors = true;
        }
        
        if (!isValidEmail(email.value.trim())) {
            showFieldError(email, 'Email invalido');
            hasErrors = true;
        }
        
        if (!isValidPhone(phone.value.trim())) {
            showFieldError(phone, 'Telefono debe tener 10 digitos');
            hasErrors = true;
        }
        
        if (password.value.length < 8) {
            showFieldError(password, 'Minimo 8 caracteres');
            hasErrors = true;
        }
        
        if (password.value !== confirmPassword.value) {
            showFieldError(confirmPassword, 'Las contrasenas no coinciden');
            hasErrors = true;
        }
        
        if (!termsCheck.checked) {
            showNotification('Debes aceptar los terminos y condiciones', 'error');
            hasErrors = true;
        }
        
        if (hasErrors) return;
        
        // Verificar si el email ya existe
        if (MarketWorld.data.findUserByEmail(email.value.trim())) {
            showNotification('Este email ya esta registrado', 'error');
            showFieldError(email, 'Email ya registrado');
            return;
        }
        
        // Registrar usuario
        setLoadingState(btnRegister, true);
        
        setTimeout(function() {
            var result = MarketWorld.data.registerUser({
                nombre: firstName.value.trim(),
                apellido: lastName.value.trim(),
                email: email.value.trim(),
                password: password.value
            });
            
            if (result.success) {
                showNotification('Cuenta creada exitosamente!', 'success');
                setTimeout(function() {
                    window.location.href = 'Login.html';
                }, 1500);
            } else {
                setLoadingState(btnRegister, false);
                showNotification(result.message, 'error');
            }
        }, 1000);
    }

    // Validar email
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // Validar telefono
    function isValidPhone(phone) {
        return /^[0-9]{10}$/.test(phone);
    }

    // Mostrar error en campo
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

    // Limpiar errores
    function clearErrors() {
        var invalidInputs = document.querySelectorAll('.is-invalid');
        for (var i = 0; i < invalidInputs.length; i++) {
            invalidInputs[i].classList.remove('is-invalid');
        }
    }

    // Medidor de fortaleza de contrasena
    function initPasswordStrength() {
        var passwordInput = document.getElementById('password');
        var strengthBar = document.getElementById('strengthBar');
        var strengthText = document.getElementById('strengthText');
        
        if (!passwordInput || !strengthBar || !strengthText) return;
        
        passwordInput.addEventListener('input', function() {
            var password = passwordInput.value;
            var strength = calculateStrength(password);
            
            strengthBar.style.width = strength.percent + '%';
            strengthBar.className = 'strength-bar-fill ' + strength.class;
            strengthText.textContent = strength.text;
        });
    }

    // Calcular fortaleza
    function calculateStrength(password) {
        if (password.length === 0) {
            return { percent: 0, class: '', text: 'Ingresa una contrasena' };
        }
        
        var strength = 0;
        
        if (password.length >= 8) strength += 25;
        if (password.length >= 12) strength += 25;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
        if (/[0-9]/.test(password)) strength += 15;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 10;
        
        if (strength < 40) {
            return { percent: strength, class: 'weak', text: 'Debil' };
        } else if (strength < 70) {
            return { percent: strength, class: 'medium', text: 'Media' };
        } else {
            return { percent: strength, class: 'strong', text: 'Fuerte' };
        }
    }

    // Mostrar/ocultar contrasenas
    function initPasswordToggle() {
        var togglePassword = document.getElementById('togglePassword');
        var toggleConfirm = document.getElementById('toggleConfirmPassword');
        var passwordInput = document.getElementById('password');
        var confirmInput = document.getElementById('confirmPassword');
        
        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', function() {
                togglePasswordVisibility(passwordInput, togglePassword);
            });
        }
        
        if (toggleConfirm && confirmInput) {
            toggleConfirm.addEventListener('click', function() {
                togglePasswordVisibility(confirmInput, toggleConfirm);
            });
        }
    }

    function togglePasswordVisibility(input, button) {
        if (input.type === 'password') {
            input.type = 'text';
            button.innerHTML = '<i class="bi bi-eye-slash"></i>';
        } else {
            input.type = 'password';
            button.innerHTML = '<i class="bi bi-eye"></i>';
        }
    }

    // Estado de carga del boton
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

    // Mostrar notificacion
    function showNotification(message, type) {
        var existing = document.querySelector('.register-notification');
        if (existing) existing.remove();
        
        var alertClass = type === 'success' ? 'alert-success' : 
                         type === 'error' ? 'alert-danger' : 'alert-info';
        var icon = type === 'success' ? 'bi-check-circle' : 
                   type === 'error' ? 'bi-x-circle' : 'bi-info-circle';
        
        var alertDiv = document.createElement('div');
        alertDiv.className = 'alert ' + alertClass + ' alert-dismissible fade show position-fixed register-notification';
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = '<i class="bi ' + icon + ' me-2"></i>' + message + 
                            '<button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>';
        document.body.appendChild(alertDiv);
        
        setTimeout(function() {
            if (alertDiv.parentNode) alertDiv.remove();
        }, 5000);
    }

})();