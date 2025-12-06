
(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        console.log('️ Módulo Configuración cargado');
        
        initCompanySettings();
        initTaxSettings();
        initSystemSettings();
        initBackupManagement();
        initUserManagement();
        initRoleManagement();
        initAuditLog();
    });

    // Configuración de empresa
    function initCompanySettings() {
        const btnSave = document.querySelectorAll('.btn-primary').forEach(btn => {
            if (btn.textContent.includes('Guardar')) {
                btn.addEventListener('click', saveCompanySettings);
            }
        });
        
        // Upload de logo
        const logoInput = document.querySelector('input[type="file"]');
        if (logoInput) {
            logoInput.addEventListener('change', handleLogoUpload);
        }
    }

    function saveCompanySettings() {
        console.log('💾 Guardando configuración de empresa');
        
        const companyData = {
            name: document.querySelector('input[value*="MarketWorld"]')?.value,
            nit: document.querySelector('input[value*="900"]')?.value,
            address: document.querySelector('input[value*="Carrera"]')?.value
        };
        
        console.log('📋 Datos:', companyData);
        alert('✅ Configuración de empresa guardada correctamente');
    }

    function handleLogoUpload(e) {
        const file = e.target.files[0];
        if (file) {
            console.log(`📁 Logo seleccionado: ${file.name}`);
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const preview = document.querySelector('.logo-preview img');
                if (preview) {
                    preview.src = event.target.result;
                }
            };
            reader.readAsDataURL(file);
        }
    }

    // Configuración de impuestos
    function initTaxSettings() {
        const taxInputs = document.querySelectorAll('input[type="number"]');
        
        taxInputs.forEach(input => {
            input.addEventListener('change', () => {
                console.log(`💰 Impuesto actualizado: ${input.value}%`);
            });
        });
        
        const btnSaveTax = document.querySelectorAll('.btn-primary').forEach(btn => {
            if (btn.textContent.includes('Guardar Configuración')) {
                btn.addEventListener('click', saveTaxSettings);
            }
        });
    }

    function saveTaxSettings() {
        console.log('💾 Guardando configuración de impuestos');
        alert('✅ Configuración de impuestos guardada');
    }

    // Configuración del sistema
    function initSystemSettings() {
        // Prueba de email
        const btnTestEmail = document.querySelector('.btn-outline-primary');
        if (btnTestEmail && btnTestEmail.textContent.includes('Probar')) {
            btnTestEmail.addEventListener('click', testEmailConfiguration);
        }
    }

    function testEmailConfiguration() {
        const testEmail = prompt('Ingresa un email para la prueba:');
        if (testEmail) {
            console.log(`📧 Enviando email de prueba a: ${testEmail}`);
            
            // Simulación
            setTimeout(() => {
                alert(`✅ Email de prueba enviado a ${testEmail}\n\nVerifica tu bandeja de entrada.`);
            }, 1000);
        }
    }

    // Gestión de backups
    function initBackupManagement() {
        const btnDownloadBackup = document.querySelector('.btn-primary');
        if (btnDownloadBackup && btnDownloadBackup.textContent.includes('Descargar Backup')) {
            btnDownloadBackup.addEventListener('click', downloadBackup);
        }
        
        const btnScheduleBackup = document.querySelectorAll('.btn-outline-primary').forEach(btn => {
            if (btn.textContent.includes('Programar')) {
                btn.addEventListener('click', scheduleBackup);
            }
        });
    }

    function downloadBackup() {
        console.log('💾 Descargando backup...');
        
        alert('⏳ Generando backup de la base de datos...\n\nEsto puede tardar unos minutos.');
        
        // descarga
        setTimeout(() => {
            alert('✅ Backup descargado exitosamente\n\nArchivo: marketworld_backup_20250620.sql\nTamaño: 45.2 MB');
        }, 2000);
    }

    function scheduleBackup() {
        console.log('⏰ Programando backup automático');
        alert('✅ Backup automático programado\n\nFrecuencia: Semanal\nDía: Sábado 02:00 AM');
    }

    // Gestión de usuarios
    function initUserManagement() {
        const btnNewUser = document.querySelector('.btn-primary[data-bs-target="#userModal"]');
        if (btnNewUser) {
            btnNewUser.addEventListener('click', () => {
                console.log('👤 Abriendo formulario de nuevo usuario');
            });
        }
        
        // Botones de acción en tarjetas de usuario
        const actionButtons = document.querySelectorAll('.user-card .btn-sm');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.querySelector('i').className;
                const userName = btn.closest('.user-card').querySelector('h5').textContent;
                
                if (action.includes('eye')) {
                    viewUser(userName);
                } else if (action.includes('pencil')) {
                    editUser(userName);
                } else if (action.includes('trash')) {
                    deleteUser(userName);
                }
            });
        });
        
        // Filtros de usuario
        const btnFilterUser = document.querySelectorAll('.btn-primary').forEach(btn => {
            if (btn.textContent.includes('Filtrar') && btn.closest('#usuarios-sub')) {
                btn.addEventListener('click', applyUserFilters);
            }
        });
    }

    function viewUser(userName) {
        console.log(`👁️ Ver detalles de: ${userName}`);
        alert(`Viendo detalles de usuario: ${userName}`);
    }

    function editUser(userName) {
        console.log(`✏️ Editar usuario: ${userName}`);
        alert(`Editando usuario: ${userName}`);
    }

    function deleteUser(userName) {
        if (confirm(`¿Eliminar usuario ${userName}?`)) {
            console.log(`🗑️ Eliminando usuario: ${userName}`);
            alert(`Usuario ${userName} eliminado`);
        }
    }

    function applyUserFilters() {
        console.log(' Aplicando filtros de usuarios');
        alert('Filtros aplicados correctamente');
    }

    // Gestión de roles
    function initRoleManagement() {
        const btnNewRole = document.querySelector('.btn-primary[data-bs-target="#roleModal"]');
        if (btnNewRole) {
            btnNewRole.addEventListener('click', () => {
                console.log('🎭 Abriendo formulario de nuevo rol');
            });
        }
    }

    // Registro de auditoría
    function initAuditLog() {
        const btnExportAudit = document.querySelectorAll('.btn-outline-secondary').forEach(btn => {
            if (btn.textContent.includes('Exportar')) {
                btn.addEventListener('click', exportAuditLog);
            }
        });
    }

    function exportAuditLog() {
        console.log(' Exportando registro de auditoría');
        alert('✅ Registro de auditoría exportado\n\nArchivo: audit_log_20250620.xlsx');
    }

})();



let usuarios = [
    {
        id: 1,
        nombre: 'Juan',
        apellido: 'Pérez',
        email: 'juan.perez@marketworld.com',
        rol: 'Administrador',
        estado: 'Activo'
    }
];

let nextUserId = 2;

document.addEventListener('DOMContentLoaded', function() {
    console.log(' Sistema de configuración iniciado');
    
    const btnGuardarEmpresa = document.querySelector('#empresa .btn-primary');
    
    if (btnGuardarEmpresa) {
        btnGuardarEmpresa.addEventListener('click', function() {
            console.log('💾 Guardar datos empresa');
            alert('✅ Datos guardados correctamente');
        });
    }
    
    const btnNuevoUsuario = document.querySelector('button[data-bs-toggle="modal"]');
    
    if (btnNuevoUsuario) {
        btnNuevoUsuario.addEventListener('click', function() {
            console.log('➕ Nuevo usuario');
        });
    }
});

function agregarUsuario() {
    const nuevoUsuario = {
        id: nextUserId++,
        nombre: 'Nuevo',
        apellido: 'Usuario',
        email: 'nuevo@marketworld.com',
        rol: 'Vendedor',
        estado: 'Activo'
    };
    
    usuarios.push(nuevoUsuario);
    console.log(' Usuario agregado:', nuevoUsuario);
}

function editarUsuario(id) {
    console.log('✏️ Editar usuario:', id);
}

function eliminarUsuario(id) {
    if (confirm('¿Eliminar usuario?')) {
        usuarios = usuarios.filter(u => u.id !== id);
        console.log('🗑️ Usuario eliminado:', id);
    }
}

window.editarUsuario = editarUsuario;
window.eliminarUsuario = eliminarUsuario;
