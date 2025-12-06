
document.addEventListener('DOMContentLoaded', function() {
    console.log(' Sistema de reportes iniciado');
    
    inicializarGraficos();
    
    const btnExportPDF = document.getElementById('btnExportarPDF');
    const btnExportExcel = document.getElementById('btnExportarExcel');
    
    if (btnExportPDF) {
        btnExportPDF.addEventListener('click', function() {
            console.log('📄 Exportar PDF');
            alert('Exportando a PDF...');
        });
    }
    
    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', function() {
            console.log(' Exportar Excel');
            alert('Exportando a Excel...');
        });
    }
});

function inicializarGraficos() {
    const ctxVentas = document.getElementById('ventasChart');
    
    if (ctxVentas && typeof Chart !== 'undefined') {
        new Chart(ctxVentas, {
            type: 'line',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                datasets: [{
                    label: 'Ventas',
                    data: [65000, 75000, 80000, 71000, 85000, 92000],
                    borderColor: '#0d6ef0',
                    backgroundColor: 'rgba(13, 110, 240, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    console.log(' Gráficos inicializados');
}