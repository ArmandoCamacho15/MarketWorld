
let ordenesCompra = [];
let proveedores = [];
let nextOrdenId = 128;

document.addEventListener('DOMContentLoaded', function() {
    console.log(' Sistema de compras iniciado');
    
    const btnRegistrarCompra = document.getElementById('btnRegistrarCompra');
    
    if (btnRegistrarCompra) {
        btnRegistrarCompra.addEventListener('click', function() {
            console.log('📦 Registrar compra');
            alert('✅ Compra registrada correctamente');
        });
    }
    
    const btnFiltroHistorial = document.getElementById('btnFiltroHistorial');
    
    if (btnFiltroHistorial) {
        btnFiltroHistorial.addEventListener('click', function() {
            console.log(' Filtrar historial');
        });
    }
});

// --- Nuevas funcionalidades para interactividad completa ---
// Productos de ejemplo (puedes ampliar desde una API)
const sampleProducts = [
    { sku: 'ELEC-1001', name: 'Laptop HP ProBook', price: 1150.00 },
    { sku: 'ELEC-1002', name: 'Monitor 24"', price: 220.00 },
    { sku: 'ALIM-2001', name: 'Caja de cereales', price: 12.50 }
];

function formatMoney(v){
    return '$' + v.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

document.addEventListener('DOMContentLoaded', function(){
    const btnBuscarProducto = document.getElementById('btnBuscarProducto');
    const buscarProducto = document.getElementById('buscarProducto');
    const cantidadProducto = document.getElementById('cantidadProducto');
    const productosTbody = document.getElementById('productosTbody');

    const subtotalVal = document.getElementById('subtotalVal');
    const ivaVal = document.getElementById('ivaVal');
    const descuentoVal = document.getElementById('descuentoVal');
    const envioVal = document.getElementById('envioVal');
    const totalVal = document.getElementById('totalVal');

    // Añadir producto desde búsqueda
    if (btnBuscarProducto) {
        btnBuscarProducto.addEventListener('click', () => {
            try {
                const query = buscarProducto.value.trim();
                if (!query) { alert('Ingresa SKU o nombre del producto'); return; }
                // Buscar coincidencias parciales por SKU o nombre (case-insensitive)
                const q = query.toLowerCase();
                let matches = sampleProducts.filter(p => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
                let product = matches.length ? matches[0] : null;
                if (!product) {
                    // crear producto genérico si no existe
                    product = { sku: 'GEN-'+Date.now(), name: query, price: 100.00 };
                }
            const qty = Math.max(1, parseInt(cantidadProducto.value || '1'));
            addProductRow(product, qty, productosTbody);
            updateTotals();
            buscarProducto.value = '';
            cantidadProducto.value = 1;
            } catch (err) {
                console.error('Error al añadir producto:', err);
                alert('Ocurrió un error al añadir el producto. Revisa la consola.');
            }
        });
        // permitir Enter en el input de búsqueda
        if (buscarProducto) {
            buscarProducto.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); btnBuscarProducto.click(); }
            });
        }
    }

    // Delegación: eliminar producto o detectar cambios en precio/cantidad
    if (productosTbody) {
        productosTbody.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (btn && btn.classList.contains('remove-product')) {
                const tr = btn.closest('tr');
                tr.remove();
                updateTotals();
            }
        });

        productosTbody.addEventListener('input', (e) => {
            const input = e.target;
            if (input && (input.classList.contains('prod-price') || input.classList.contains('prod-qty'))) {
                const tr = input.closest('tr');
                recalcRow(tr);
                updateTotals();
            }
        });
    }

    // Re-attach registrar compra to collect full order
    const btnRegistrar = document.getElementById('btnRegistrarCompra');
    if (btnRegistrar) {
        btnRegistrar.addEventListener('click', () => {
            const proveedor = document.getElementById('selectProveedor').value;
            const fecha = document.getElementById('fechaCompra').value;
            const numero = document.getElementById('numeroOrden').value;

            const products = [];
            document.querySelectorAll('#productosTbody tr').forEach(tr => {
                const name = tr.querySelector('.prod-name').textContent.trim();
                const sku = tr.dataset.sku || '';
                const price = parseFloat((tr.querySelector('.prod-price').value || '0').replace(/[^0-9.\-]/g, ''));
                const qty = parseInt(tr.querySelector('.prod-qty').value || '0');
                if (qty>0) products.push({ sku, name, price, qty });
            });

            if (products.length === 0) { alert('Añade al menos un producto'); return; }

            const subtotal = parseFloat((subtotalVal.dataset.value) || 0);
            const iva = parseFloat((ivaVal.dataset.value) || 0);
            const descuento = parseFloat((descuentoVal.dataset.value) || 0);
            const envio = parseFloat((envioVal.dataset.value) || 0);
            const total = parseFloat((totalVal.dataset.value) || 0);

            const orden = { id: nextOrdenId++, numero, proveedor, fecha, products, subtotal, iva, descuento, envio, total };
            ordenesCompra.push(orden);
            console.log('Orden guardada:', orden);
            alert('✅ Orden registrada: ' + orden.numero);
            // limpiar formulario
            productosTbody.innerHTML = '';
            updateTotals();
        });
    }

    function addProductRow(product, qty, tbody){
        const tr = document.createElement('tr');
        tr.dataset.sku = product.sku || '';
        tr.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <i class="bi bi-box-seam me-2" aria-hidden="true"></i>
                    <div>
                        <div class="prod-name">${escapeHtml(product.name)}</div>
                        <div class="text-muted small">SKU: ${escapeHtml(product.sku)}</div>
                    </div>
                </div>
            </td>
            <td>
                <input type="text" class="form-control form-control-sm prod-price" value="${formatMoney(product.price)}" style="width: 100px;">
            </td>
            <td>
                <input type="number" class="form-control form-control-sm prod-qty" value="${qty}" min="1" style="width: 70px;">
            </td>
            <td class="prod-subtotal">${formatMoney(product.price * qty)}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger remove-product" type="button" aria-label="Eliminar producto">
                    <i class="bi bi-trash" aria-hidden="true"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    }

    function recalcRow(tr){
        if (!tr) return;
        const priceInput = tr.querySelector('.prod-price');
        const qtyInput = tr.querySelector('.prod-qty');
        let price = parseFloat((priceInput.value||'0').replace(/[^0-9.\-]/g, '')) || 0;
        const qty = Math.max(0, parseInt(qtyInput.value||'0')) || 0;
        tr.querySelector('.prod-subtotal').textContent = formatMoney(price * qty);
    }

    function updateTotals(){
        let subtotal = 0;
        document.querySelectorAll('#productosTbody tr').forEach(tr => {
            const txt = tr.querySelector('.prod-subtotal').textContent || '$0';
            const v = parseFloat(txt.replace(/[^0-9.\-]/g, '')) || 0;
            subtotal += v;
        });
        const iva = +(subtotal * 0.19).toFixed(2);
        const descuento = 0.00; // placeholder, se puede leer desde input
        const envio = 0.00;
        const total = +(subtotal + iva - descuento + envio).toFixed(2);

        subtotalVal.textContent = formatMoney(subtotal);
        ivaVal.textContent = formatMoney(iva);
        descuentoVal.textContent = '-'+formatMoney(descuento);
        envioVal.textContent = formatMoney(envio);
        totalVal.textContent = formatMoney(total);

        subtotalVal.dataset.value = subtotal;
        ivaVal.dataset.value = iva;
        descuentoVal.dataset.value = descuento;
        envioVal.dataset.value = envio;
        totalVal.dataset.value = total;
    }

    // Recalcular totales al cargar (por si hay filas iniciales en el tbody)
    try {
        updateTotals();
    } catch (err) {
        console.warn('No se pudieron calcular totales al inicio:', err);
    }

    // Avisos si elementos no encontrados
    if (!btnBuscarProducto) console.warn('No se encontró `btnBuscarProducto` en DOM');
    if (!productosTbody) console.warn('No se encontró `productosTbody` en DOM');

    function escapeHtml(str){
        return String(str).replace(/[&<>"']/g, function(s){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[s]; });
    }
});

function registrarCompra() {
    const nuevaOrden = {
        id: nextOrdenId++,
        numero: `OC-2025-${String(nextOrdenId).padStart(5, '0')}`,
        fecha: new Date().toISOString().split('T')[0],
        total: 0,
        estado: 'Pendiente'
    };
    
    ordenesCompra.push(nuevaOrden);
    console.log(' Orden registrada:', nuevaOrden);
}

function verOrden(id) {
    console.log('👁️ Ver orden:', id);
}

function registrarPago(id) {
    console.log('💰 Registrar pago orden:', id);
}

window.verOrden = verOrden;
window.registrarPago = registrarPago;
