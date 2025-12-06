/**
 * COMPRAS.JS - Gestión de compras
 */

let ordenesCompra = [];
let proveedores = [];
let nextOrdenId = 128;

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Sistema de compras iniciado');
    
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
            console.log('🔍 Filtrar historial');
        });
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
    console.log('✅ Orden registrada:', nuevaOrden);
}

function verOrden(id) {
    console.log('👁️ Ver orden:', id);
}

function registrarPago(id) {
    console.log('💰 Registrar pago orden:', id);
}

window.verOrden = verOrden;
window.registrarPago = registrarPago;
