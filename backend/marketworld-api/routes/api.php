<?php

use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\DashboardController;
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
    
    // Rutas protegidas
    Route::middleware('api.token')->group(function () {
        
        // Dashboard Stats
        Route::get('dashboard/stats', [DashboardController::class, 'stats']);

        // Reportes
        Route::get('reports/sales-summary', [ReportController::class, 'salesSummary']);
        Route::get('reports/inventory-utility', [ReportController::class, 'inventoryUtility']);

        // Auth
        Route::prefix('auth')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me', [AuthController::class, 'me']);
        });

        // === Productos (Inventario) ===
        Route::get('products/stock-bajo', [ProductController::class, 'stockBajo']);
        Route::apiResource('products', ProductController::class);

        // === Clientes (CRM / Facturación) ===
        Route::apiResource('customers', CustomerController::class);

        // === Facturación (Ventas) ===
        Route::apiResource('invoices', InvoiceController::class);

        // === Compras (Entradas de Stock) ===
        Route::apiResource('purchases', PurchaseController::class);
    });
});
