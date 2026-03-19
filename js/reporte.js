
document.addEventListener('DOMContentLoaded', async function() {
    console.log(' Sistema de reportes iniciado (Producción)');
    
    if (MarketWorld.notifications && MarketWorld.notifications.init) {
        MarketWorld.notifications.init();
    }

    // Cargar datos reales para los gráficos
    await cargarReportesReales();
    
    // ... rest of the setup if needed
});

async function cargarReportesReales() {
    try {
        const token = localStorage.getItem('marketworld_auth_token');
        if (!token) return;

        const response = await fetch('http://127.0.0.1:8000/api/v1/reports/sales-summary', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            const labels = result.data.map(d => d.date).reverse();
            const values = result.data.map(d => parseFloat(d.total)).reverse();
            renderGraficoVentas(labels, values);
        } else {
            inicializarGraficos(); // Fallback
        }
    } catch (error) {
        console.error('Error al cargar reportes:', error);
        inicializarGraficos();
    }
}

function renderGraficoVentas(labels, data) {
    const ctxVentas = document.getElementById('ventasChart');
    if (!ctxVentas || typeof Chart === 'undefined') return;

    // Destruir grafico anterior si existe
    const existingChart = Chart.getChart(ctxVentas);
    if (existingChart) existingChart.destroy();

    new Chart(ctxVentas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ventas Reales ($)',
                data: data,
                borderColor: '#0d6ef0',
                backgroundColor: 'rgba(13, 110, 240, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => '$' + value.toLocaleString()
                    }
                }
            }
        }
    });
}

function inicializarGraficos() {
    // ... (Se mantiene como backup o diseño inicial si no hay datos)
}