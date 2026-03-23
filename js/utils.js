// --- utils.js ---
// --- Funciones utilitarias compartidas en todo el proyecto MarketWorld ---

(function(global) {
    'use strict';

    // --- Función debounce para limitar la frecuencia de ejecución ---
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

    // --- Formatea un número como moneda colombiana ---
    function formatCurrency(value) {
        return '$' + Number(value).toLocaleString('es-CO');
    }

    // --- Formatea una fecha en formato local ---
    function formatDate(date) {
        var d = new Date(date);
        return d.toLocaleDateString('es-CO');
    }

    // --- Formatea fecha y hora ---
    function formatDateTime(date) {
        var d = new Date(date);
        return d.toLocaleString('es-CO');
    }

    // --- Valida el formato de un email ---
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

        // ======= REMOVER NOTIFICACIÓN ANTERIOR =======
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
     * Muestra un modal centrado (más grande y prominente)
     * @param {string} title - Título del modal
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo: success, error, info
     */
    function showModal(title, message, type) {
        // Eliminar modal previo si existe
        var existing = document.getElementById('mw-dynamic-modal');
        if (existing) {
            var modalInstance = bootstrap.Modal.getInstance(existing);
            if (modalInstance) modalInstance.hide();
            existing.remove();
        }

        var icon = 'bi-info-circle';
        var headerClass = 'bg-primary text-white';
        
        if (type === 'success') {
            icon = 'bi-check-circle';
            headerClass = 'bg-success text-white';
        } else if (type === 'error') {
            icon = 'bi-x-circle';
            headerClass = 'bg-danger text-white';
        }

        var modalHtml = 
            '<div class="modal fade" id="mw-dynamic-modal" tabindex="-1" aria-hidden="true">' +
                '<div class="modal-dialog modal-dialog-centered">' +
                    '<div class="modal-content border-0 shadow-lg" style="border-radius: 20px; overflow: hidden;">' +
                        '<div class="modal-header ' + headerClass + ' border-0">' +
                            '<h5 class="modal-title d-flex align-items-center">' +
                                '<i class="bi ' + icon + ' me-2"></i> ' + title +
                            '</h5>' +
                            '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>' +
                        '</div>' +
                        '<div class="modal-body p-4 text-center">' +
                            '<p class="fs-5 mb-0">' + escapeHtml(message) + '</p>' +
                        '</div>' +
                        '<div class="modal-footer border-0 pb-4 justify-content-center">' +
                            '<button type="button" class="btn btn-primary px-5 py-2 fw-bold" data-bs-dismiss="modal" style="border-radius: 10px;">Aceptar</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        var modalElement = document.getElementById('mw-dynamic-modal');
        var modal = new bootstrap.Modal(modalElement);
        modal.show();

        // Limpiar el DOM cuando se cierre
        modalElement.addEventListener('hidden.bs.modal', function() {
            modalElement.remove();
        });
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
        localStorage.removeItem('marketworld_auth_token');
        localStorage.removeItem('marketworld_auth_user');
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

    /**
     * Genera el HTML estandarizado para mostrar el detalle completo de una factura.
     * @param {object} invoice - Objeto factura recibido desde backend (puede tener variantes de nombres de campo)
     * @returns {string} - HTML seguro listo para insertar en el modal
     */
    function renderInvoiceHTML(invoice) {
        if (!invoice) return '<div class="text-muted">Factura vacía</div>';

        var inv = invoice;
        var number = inv.numero_factura || inv.numero || inv.invoice_number || inv.id || '-';
        var customer = inv.cliente_nombre || inv.customer_name || (inv.customer && (inv.customer.nombre || inv.customer.name)) || 'Consumidor Final';
        var customerDocument = inv.cliente_documento || inv.customer_document || inv.customer && inv.customer.documento || '';
        var date = inv.fechaCreacion || inv.fecha || inv.created_at || inv.date || null;
        var status = inv.estado || inv.status || 'Pagada';
        var seller = inv.vendedor || inv.seller || (inv.user && (inv.user.name || inv.user.username)) || (getCurrentUser() && getCurrentUser().name) || '';

        // Items: normalizar
        var rawItems = Array.isArray(inv.items) ? inv.items : (Array.isArray(inv.lines) ? inv.lines : (Array.isArray(inv.invoice_items) ? inv.invoice_items : []));
        function normalize(it) {
            if (!it) return { name: '', qty: 0, price: 0, iva: '', subtotal: 0 };
            var name = it.product_name || it.nombre || it.name || (it.product && (it.product.nombre || it.product.name)) || '';
            var qty = parseFloat(it.quantity || it.cantidad || it.qty || 0) || 0;
            var price = parseFloat(it.unit_price || it.precio_unitario || it.precio || it.price || 0) || 0;
            var subtotal = parseFloat(it.subtotal || it.total || (qty * price)) || 0;
            var iva = it.iva || it.tax || it.tax_percent || it.iva_porcentaje || it.iva_percent || '';
            if (typeof iva === 'number') iva = String(iva) + '%';
            return { name: name, qty: qty, price: price, subtotal: subtotal, iva: iva };
        }

        var items = rawItems.map(normalize);

        // Totales: intentar obtener de campos comunes o calcular
        var subtotalVal = parseFloat(inv.subtotal || inv.sub_total || inv.neto || inv.net_amount || items.reduce(function(s,i){return s + (i.subtotal||0);},0)) || 0;
        var taxVal = parseFloat(inv.tax_total || inv.iva || inv.iva_total || inv.impuesto || inv.tax || (inv.total ? (parseFloat(inv.total||0) - subtotalVal) : 0)) || 0;
        var totalVal = parseFloat(inv.total || inv.total_amount || inv.total_final || subtotalVal + taxVal) || 0;
        var paymentMethod = inv.payment_method || inv.metodo_pago || inv.payment || (inv.payments && inv.payments.length ? inv.payments[0].method : '') || '';

        // Construir HTML
        var html = '';
        html += '<div class="row mb-3">';
        html += '<div class="col-6">';
        html += '<h6>Datos del Cliente</h6>';
        html += '<div><strong>' + escapeHtml(customer) + '</strong></div>';
        if (customerDocument) html += '<div class="text-muted small">Documento: ' + escapeHtml(customerDocument) + '</div>';
        html += '</div>';
        html += '<div class="col-6 text-end">';
        html += '<h6>Datos de la Factura</h6>';
        html += '<div> <strong>' + escapeHtml(number) + '</strong></div>';
        if (date) html += '<div class="text-muted small">Fecha: ' + escapeHtml(formatDateTime(date)) + '</div>';
        html += '<div class="text-muted small">Estado: <span class="badge bg-success">' + escapeHtml(status) + '</span></div>';
        if (seller) html += '<div class="text-muted small">Vendedor: ' + escapeHtml(seller) + '</div>';
        html += '</div>';
        html += '</div>';

        html += '<hr />';

        html += '<div class="table-responsive">';
        html += '<table class="table table-sm table-borderless">';
        html += '<thead><tr><th>Producto</th><th class="text-end">Cant.</th><th class="text-end">Precio</th><th class="text-end">IVA</th><th class="text-end">Subtotal</th></tr></thead>';
        html += '<tbody>';
        items.forEach(function(it) {
            html += '<tr>' +
                '<td>' + escapeHtml(it.name || '-') + '</td>' +
                '<td class="text-end">' + (it.qty || 0) + '</td>' +
                '<td class="text-end">' + formatCurrency(it.price || 0) + '</td>' +
                '<td class="text-end">' + escapeHtml(it.iva || '-') + '</td>' +
                '<td class="text-end">' + formatCurrency(it.subtotal || 0) + '</td>' +
            '</tr>';
        });
        html += '</tbody>';
        html += '</table>';
        html += '</div>';

        html += '<div class="row mt-3">';
        html += '<div class="col-6">';
        if (paymentMethod) html += '<div class="small text-muted">Método de pago: ' + escapeHtml(paymentMethod) + '</div>';
        html += '</div>';
        html += '<div class="col-6">';
        html += '<div class="text-end"><div>Subtotal: <strong>' + formatCurrency(subtotalVal) + '</strong></div>';
        html += '<div>IVA: <strong>' + formatCurrency(taxVal) + '</strong></div>';
        html += '<hr />';
        html += '<div style="font-size:1.25rem;">TOTAL: <strong class="text-primary">' + formatCurrency(totalVal) + '</strong></div>';
        html += '</div>';
        html += '</div>';

        return html;
    }

    // ======= EXPONER FUNCIONES GLOBALMENTE =======
    global.MarketWorld = global.MarketWorld || {};
    global.MarketWorld.utils = {
        debounce: debounce,
        formatCurrency: formatCurrency,
        formatDate: formatDate,
        formatDateTime: formatDateTime,
        validateEmail: validateEmail,
        escapeHtml: escapeHtml,
        showNotification: showNotification,
        showModal: showModal,
        getCurrentUser: getCurrentUser,
        logout: logout,
        generateId: generateId,
        isEmpty: isEmpty,
        deepClone: deepClone,
        capitalize: capitalize
        , renderInvoiceHTML: renderInvoiceHTML
    };

    // Backwards-compatible global error helper (usado por login.js)
    global.showGlobalError = function(message) {
        if (global.MarketWorld && global.MarketWorld.utils && typeof global.MarketWorld.utils.showNotification === 'function') {
            global.MarketWorld.utils.showNotification(message, 'error', 6000);
        } else {
            // Fallback mínimo
            try { alert(message); } catch (e) { /* ignore */ }
        }
    };

    // ======= DEBOUNCE GLOBAL =======
    global.debounce = debounce;

})(typeof window !== 'undefined' ? window : this);
