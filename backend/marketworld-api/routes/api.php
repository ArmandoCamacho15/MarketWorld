<?php

use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\InventoryMovementController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\JournalEntryController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\CostAdjustmentController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\CRMController;
use App\Http\Controllers\Api\UserManagementController;
use App\Http\Controllers\Api\RoleManagementController;
use App\Http\Controllers\Api\CompanySettingController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\SessionManagementController;
use App\Http\Controllers\Api\NotificationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Estado de la API
Route::get('/health', function () {
    return response()->json([
        'success' => true,
        'status'  => 'OK',
        'version' => 'v1',
        'app'     => config('app.name'),
    ]);
});

// --- API v1 ---
Route::prefix('v1')->group(function () {

    // === Autenticación ===
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login', [AuthController::class, 'login']);
    
    // Rutas protegidas con Sanctum
    Route::middleware('auth:sanctum')->group(function () { // Modificado de api.token a auth:sanctum
        
        // Dashboard Stats
        Route::get('dashboard/stats', [DashboardController::class, 'stats']);

        // Reportes (Solo Administrador)
        Route::middleware('role:Administrador')->group(function () {
            Route::get('reports/sales-summary', [ReportController::class, 'salesSummary']);
            Route::get('reports/inventory-utility', [ReportController::class, 'inventoryUtility']);
            Route::get('reports/tax-summary', [ReportController::class, 'taxSummary']);
            Route::get('reports/dian-draft', [ReportController::class, 'dianDraft']);
            // Dia 11: endpoints nuevos de reportes reales (compatibilidad temporal con legacy activa)
            Route::get('reports/ventas', [ReportController::class, 'ventas']);
            Route::get('reports/inventario', [ReportController::class, 'inventario']);
            Route::get('reports/financiero', [ReportController::class, 'financiero']);
            Route::get('reports/cxp', [ReportController::class, 'cxp']);
            Route::get('reports/clientes', [ReportController::class, 'clientes']);
            // Ajustes de costo (registro y auditoría) - Solo Administrador
            Route::post('products/{id}/adjust-cost', [CostAdjustmentController::class, 'store']);
            Route::get('cost-adjustments', [CostAdjustmentController::class, 'index']);
            Route::get('company-settings', [CompanySettingController::class, 'show']);
            Route::post('company-settings', [CompanySettingController::class, 'update']);
        });

        // Auth
        Route::prefix('auth')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me', [AuthController::class, 'me']);
        });

        // === Notificaciones ===
        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index']);
            Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
            Route::post('/', [NotificationController::class, 'store']);
            Route::post('/mark-all-read', [NotificationController::class, 'markAllRead']);
            Route::delete('/read', [NotificationController::class, 'destroyRead']);
            Route::delete('/all', [NotificationController::class, 'destroyAll']);
            Route::post('/{notification}/mark-read', [NotificationController::class, 'markRead']);
            Route::delete('/{notification}', [NotificationController::class, 'destroy']);
        });

        // === Administracion ===
        Route::middleware('role:Administrador')->prefix('admin')->group(function () {
            Route::apiResource('users', UserManagementController::class);
            Route::get('roles', [RoleManagementController::class, 'index']);
            Route::post('roles', [RoleManagementController::class, 'store']);
            Route::put('roles/{role}', [RoleManagementController::class, 'update']);
            Route::delete('roles/{role}', [RoleManagementController::class, 'destroy']);
            Route::get('permissions', [RoleManagementController::class, 'permissions']);
            Route::get('audit-logs', [AuditLogController::class, 'index']);
            Route::get('sessions', [SessionManagementController::class, 'index']);
            Route::delete('sessions/{sessionId}', [SessionManagementController::class, 'destroy']);
            Route::post('sessions/revoke-others', [SessionManagementController::class, 'revokeOthers']);
        });

        // === Productos (Inventario) ===
        Route::get('products/stock-bajo', [ProductController::class, 'stockBajo']);
        // Valorización por producto (precio_compra * stock)
        Route::get('products/valuation', [ProductController::class, 'valuation']);
        Route::apiResource('products', ProductController::class);
        Route::apiResource('categories', CategoryController::class);
        Route::apiResource('inventory-movements', InventoryMovementController::class)->only(['index', 'store']);

        // === CRM ===
        Route::prefix('crm')->group(function () {
            // Oportunidades
            Route::get('oportunidades', [CRMController::class, 'oportunidades']);
            Route::post('oportunidades', [CRMController::class, 'crearOportunidad']);
            Route::put('oportunidades/{id}', [CRMController::class, 'actualizarOportunidad']);
            Route::delete('oportunidades/{id}', [CRMController::class, 'eliminarOportunidad']);
            
            // Segmentos
            Route::get('segmentos', [CRMController::class, 'segmentos']);
            Route::post('segmentos', [CRMController::class, 'crearSegmento']);
            Route::put('segmentos/{id}', [CRMController::class, 'actualizarSegmento']);
            Route::delete('segmentos/{id}', [CRMController::class, 'eliminarSegmento']);
            
            // Campañas
            Route::get('campanas', [CRMController::class, 'campanas']);
            Route::post('campanas', [CRMController::class, 'crearCampana']);
            Route::put('campanas/{id}', [CRMController::class, 'actualizarCampana']);
            Route::delete('campanas/{id}', [CRMController::class, 'eliminarCampana']);
            
            // Actividades
            Route::get('actividades', [CRMController::class, 'actividades']);
            Route::post('actividades', [CRMController::class, 'crearActividad']);
            Route::put('actividades/{id}', [CRMController::class, 'actualizarActividad']);
            Route::delete('actividades/{id}', [CRMController::class, 'eliminarActividad']);
            
            // Recordatorios
            Route::get('recordatorios', [CRMController::class, 'recordatorios']);
            Route::post('recordatorios', [CRMController::class, 'crearRecordatorio']);
            Route::put('recordatorios/{id}/leido', [CRMController::class, 'marcarRecordatorioLeido']);
            Route::delete('recordatorios/{id}', [CRMController::class, 'eliminarRecordatorio']);
            
            // Clientes (legacy)
            Route::get('clientes', [CRMController::class, 'clientes']);
        });

        // === Clientes (CRM / Facturación) ===
        Route::apiResource('customers', CustomerController::class);

        // === Facturación (Ventas) ===
        // Solo se exponen métodos implementados para evitar rutas fantasma.
        Route::apiResource('invoices', InvoiceController::class)
            ->only(['index', 'store', 'show', 'update']);

        // === Compras (Entradas de Stock - Solo Administrador y Bodeguero) ===
        // Solo se exponen métodos implementados para evitar rutas fantasma.
        Route::apiResource('purchases', PurchaseController::class)
            ->only(['index', 'store', 'show', 'update'])
            ->middleware('role:Administrador|Bodeguero');
        Route::post('purchases/{purchase}/payments', [PurchaseController::class, 'registerPayment'])
            ->middleware('role:Administrador|Bodeguero');

        // === Proveedores (Necesario para Compras) ===
        Route::apiResource('suppliers', SupplierController::class)
            ->middleware('role:Administrador|Bodeguero');

        // === Contabilidad ===
        Route::middleware('role:Administrador')->group(function () {
            Route::apiResource('accounts', AccountController::class);
            // Export libro diario (CSV compatible con Excel)
            Route::get('journal-entries/export', [JournalEntryController::class, 'export']);
            // Export libro diario como XLSX nativo
            Route::get('journal-entries/export-xlsx', [JournalEntryController::class, 'exportXlsx']);
            Route::apiResource('journal-entries', JournalEntryController::class);
        });

    });

    // Rutas de depuración (temporal) — NO proteger con auth para aislar errores
    Route::get('debug/journal-entries/export-xlsx-noauth', [JournalEntryController::class, 'exportXlsx']);

});
