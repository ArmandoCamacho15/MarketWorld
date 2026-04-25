<?php

use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\CostAdjustmentController;
use App\Http\Controllers\Api\ReportController;
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
    Route::post('auth/login', [AuthController::class, 'login']);
    
    // Rutas protegidas con Sanctum
    Route::middleware('auth:sanctum')->group(function () { // Modificado de api.token a auth:sanctum
        
        // Dashboard Stats
        Route::get('dashboard/stats', [DashboardController::class, 'stats']);

        // Reportes (Solo Administrador)
        Route::middleware('role:Administrador')->group(function () {
            Route::get('reports/sales-summary', [ReportController::class, 'salesSummary']);
            Route::get('reports/inventory-utility', [ReportController::class, 'inventoryUtility']);
            // Dia 11: endpoints nuevos de reportes reales (compatibilidad temporal con legacy activa)
            Route::get('reports/ventas', [ReportController::class, 'ventas']);
            Route::get('reports/inventario', [ReportController::class, 'inventario']);
            Route::get('reports/financiero', [ReportController::class, 'financiero']);
            // Ajustes de costo (registro y auditoría) - Solo Administrador
            Route::post('products/{id}/adjust-cost', [CostAdjustmentController::class, 'store']);
        });

        // Auth
        Route::prefix('auth')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me', [AuthController::class, 'me']);
        });

        // === Productos (Inventario) ===
        Route::get('products/stock-bajo', [ProductController::class, 'stockBajo']);
        // Valorización por producto (precio_compra * stock)
        Route::get('products/valuation', [ProductController::class, 'valuation']);
        Route::apiResource('products', ProductController::class);

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
    });
});
