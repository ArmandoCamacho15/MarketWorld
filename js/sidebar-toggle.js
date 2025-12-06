/**
 * Script para toggle del sidebar en mobile
 * Funcionalidades: menú hamburguesa, cerrar al hacer clic fuera, animaciones
 */

(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        console.log('📱 Sidebar toggle inicializado');
        
        initSidebarToggle();
        initClickOutside();
        initNavLinks();
    });

    function initSidebarToggle() {
        const menuToggle = document.getElementById('menuToggle');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');
        
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
                menuToggle.setAttribute('aria-expanded', sidebar.classList.contains('active'));
                console.log(`📂 Sidebar ${sidebar.classList.contains('active') ? 'abierto' : 'cerrado'}`);
            });
        }
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.remove('active');
                if (menuToggle) {
                    menuToggle.setAttribute('aria-expanded', 'false');
                }
                console.log('❌ Sidebar cerrado');
            });
        }
    }

    function initClickOutside() {
        const sidebar = document.getElementById('sidebar');
        
        if (sidebar) {
            document.addEventListener('click', (e) => {
                if (sidebar.classList.contains('active') && 
                    !sidebar.contains(e.target) && 
                    !e.target.closest('#menuToggle')) {
                    sidebar.classList.remove('active');
                    console.log('🔒 Sidebar cerrado por clic externo');
                }
            });
        }
    }

    function initNavLinks() {
        const navLinks = document.querySelectorAll('.sidebar .nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar && window.innerWidth < 768) {
                    sidebar.classList.remove('active');
                }
            });
        });
    }

})();
