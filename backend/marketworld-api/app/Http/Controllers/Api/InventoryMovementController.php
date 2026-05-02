<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryMovement;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryMovementController extends Controller
{
    /**
     * Display a listing of inventory movements.
     */
    public function index(Request $request): JsonResponse
    {
        $query = InventoryMovement::with(['product', 'user']);

        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->filled('fecha_desde')) {
            $query->whereDate('created_at', '>=', $request->fecha_desde);
        }

        if ($request->filled('fecha_hasta')) {
            $query->whereDate('created_at', '<=', $request->fecha_hasta);
        }

        $movements = $query->orderBy('created_at', 'desc')->paginate(50);

        return response()->json([
            'success' => true,
            'message' => 'Movimientos listados correctamente',
            'data'    => $movements->items(),
            'meta'    => [
                'total'        => $movements->total(),
                'per_page'     => $movements->perPage(),
                'current_page' => $movements->currentPage(),
                'last_page'    => $movements->lastPage(),
            ],
            'errors'  => null,
        ]);
    }

    /**
     * Store a newly created movement and update product stock.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'tipo'       => 'required|in:Entrada,Salida,Ajuste',
            'cantidad'   => 'required|integer|min:1',
            'motivo'     => 'nullable|string|max:255',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $product = Product::lockForUpdate()->find($validated['product_id']);
            $stockAnterior = $product->stock;
            $cantidad = $validated['cantidad'];
            $tipo = $validated['tipo'];

            $stockNuevo = $stockAnterior;
            if ($tipo === 'Entrada') {
                $stockNuevo += $cantidad;
            } elseif ($tipo === 'Salida') {
                $stockNuevo -= $cantidad;
            } else { // Ajuste
                // Para ajustes manuales, el frontend podría enviar la cantidad final o el diferencial.
                // Aquí asumiremos que 'cantidad' es el nuevo stock si es un ajuste directo, 
                // o mejor, seguiremos la lógica de Entrada/Salida para cambios relativos.
                // Pero el frontend actual de MarketWorld parece usar 'Ajuste' como 'Set'.
                $stockNuevo = $cantidad; 
            }

            if ($stockNuevo < 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'El stock resultante no puede ser negativo',
                    'data'    => null,
                    'errors'  => ['cantidad' => ['Stock insuficiente']],
                ], 422);
            }

            $product->stock = $stockNuevo;
            $product->save();

            $movement = InventoryMovement::create([
                'product_id'      => $product->id,
                'user_id'         => $request->user()?->id,
                'tipo'            => $tipo,
                'cantidad'        => $cantidad,
                'stock_anterior'  => $stockAnterior,
                'stock_nuevo'     => $stockNuevo,
                'motivo'          => $validated['motivo'] ?? 'Ajuste manual',
                'referencia_tipo' => 'Ajuste Manual',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Movimiento registrado y stock actualizado',
                'data'    => $movement->load('product'),
                'errors'  => null,
            ], 201);
        });
    }
}
