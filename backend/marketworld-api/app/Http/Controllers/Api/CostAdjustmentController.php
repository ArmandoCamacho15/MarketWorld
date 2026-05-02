<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CostAdjustment;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CostAdjustmentController extends Controller
{
    /**
     * Display a listing of cost adjustments.
     */
    public function index(): JsonResponse
    {
        $adjustments = CostAdjustment::with(['product', 'user'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Ajustes de costo listados',
            'data'    => $adjustments,
            'errors'  => null
        ]);
    }

    // POST /api/v1/products/{id}/adjust-cost
    public function store(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        // El middleware de rutas ya exige rol Administrador; validación adicional por si acaso
        if (!$user || !$user->hasRole('Administrador')) {
            return response()->json([ 'success' => false, 'message' => 'No autorizado', 'data' => null, 'errors' => null ], 403);
        }

        $validated = $request->validate([
            'new_cost' => 'required|numeric|min:0',
            'reason'   => 'required|string|max:500'
        ]);

        $product = Product::find($id);
        if (!$product) {
            return response()->json([ 'success' => false, 'message' => 'Producto no encontrado', 'data' => null, 'errors' => null ], 404);
        }

        $old = $product->precio_compra ?? 0;
        $new = $validated['new_cost'];

        // Actualizar producto
        $product->update(['precio_compra' => $new]);

        // Registrar auditoría
        $adjust = CostAdjustment::create([
            'user_id' => $user->id,
            'product_id' => $product->id,
            'old_cost' => $old,
            'new_cost' => $new,
            'reason' => $validated['reason']
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Costo ajustado y registrado en auditoría',
            'data'    => $adjust,
            'errors'  => null
        ]);
    }
}
