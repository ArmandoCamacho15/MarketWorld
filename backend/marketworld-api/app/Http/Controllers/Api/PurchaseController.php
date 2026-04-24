<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PurchaseController extends Controller
{
    /**
     * Listado de compras con Eager Loading.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);

        // Modificado: Se agregó 'supplier' al eager loading
        $query = Purchase::with(['supplier', 'items.product', 'user']);

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('numero_orden', 'like', "%{$search}%");
        }

        $purchases = $query
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Compras listadas correctamente',
            'data'    => $purchases->items(),
            'meta'    => [
                'total'        => $purchases->total(),
                'per_page'     => $purchases->perPage(),
                'current_page' => $purchases->currentPage(),
                'last_page'    => $purchases->lastPage(),
            ],
            'total'   => $purchases->total(),
            'errors'  => null,
        ]);
    }

    /**
     * Mostrar una compra específica.
     */
    public function show($id)
    {
        $purchase = Purchase::with(['supplier', 'items.product', 'user'])->find($id);
        if (!$purchase) {
            return response()->json([
                'success' => false,
                'message' => 'Compra no encontrada',
                'data'    => null,
                'errors'  => null,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Compra encontrada',
            'data'    => $purchase,
            'errors'  => null,
        ]);
    }

    /**
     * Registrar una compra y actualizar stock.
     */
    public function store(Request $request)
    {
        // Modificado: Usuario de Sanctum
        $authUser = $request->user();

        if (!$authUser) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no autenticado',
                'data'    => null,
                'errors'  => null,
            ], 401);
        }

        $validator = Validator::make($request->all(), [
            'numero_orden' => 'required|unique:purchases',
            'supplier_id'  => 'required|exists:suppliers,id', // Modificado: supplier_id
            'fecha'        => 'required',
            'items'        => 'required|array|min:1',
            'items.*.product_id'     => 'required|exists:products,id',
            'items.*.cantidad'       => 'required|integer|min:1',
            'items.*.precio_unitario' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación en los datos de la compra.',
                'data'    => null,
                'errors'  => $validator->errors(),
            ], 422);
        }

        try {
            return DB::transaction(function () use ($request, $authUser) {
                $purchase = Purchase::create([
                    'numero_orden'  => $request->numero_orden,
                    'supplier_id'   => $request->supplier_id, // Modificado
                    'fecha'         => $request->fecha,
                    'total'         => $request->total,
                    'estado'        => $request->estado ?? 'Recibida',
                    'observaciones' => $request->observaciones,
                    'user_id'       => $authUser->id,
                ]);

                foreach ($request->items as $item) {
                    PurchaseItem::create([
                        'purchase_id'     => $purchase->id,
                        'product_id'      => $item['product_id'],
                        'cantidad'        => $item['cantidad'],
                        'precio_unitario' => $item['precio_unitario'], // Modificado campo
                        'subtotal'        => $item['subtotal'],
                    ]);

                    // Lógica para actualizar stock si el estado es 'Recibida'
                    if ($purchase->estado === 'Recibida') {
                        $product = Product::lockForUpdate()->find($item['product_id']);
                        
                        // Actualizar stock y costo usando Costo Promedio Ponderado (CPP)
                        $product->aplicarCostoPromedioPonderado($item['cantidad'], $item['precio_unitario']);
                    }
                }

                return response()->json([
                    'success' => true, 
                    'message' => 'Compra registrada con éxito y stock actualizado',
                    'data'    => $purchase->load(['supplier', 'items.product']),
                    'errors'  => null,
                ], 201);
            });
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data'    => null,
                'errors'  => null,
            ], 400);
        }
    }

    /**
     * Actualizar estado de compra de forma controlada.
     * Flujos válidos: Pendiente -> Recibida | Pendiente -> Cancelada
     */
    public function update(Request $request, Purchase $purchase): JsonResponse
    {
        $validated = $request->validate([
            'estado' => 'required|in:Recibida,Cancelada',
        ]);

        if ($purchase->estado !== 'Pendiente') {
            return response()->json([
                'success' => false,
                'message' => "No se puede cambiar el estado de una compra '{$purchase->estado}'.",
                'data'    => null,
                'errors'  => null,
            ], 409);
        }

        try {
            DB::transaction(function () use ($purchase, $validated) {
                $purchase->loadMissing('items');

                if ($validated['estado'] === 'Recibida') {
                    foreach ($purchase->items as $item) {
                        $product = Product::lockForUpdate()->find($item->product_id);

                        if (!$product) {
                            throw new \RuntimeException('Producto no encontrado para la compra.');
                        }

                        $product->aplicarCostoPromedioPonderado($item->cantidad, $item->precio_unitario);
                    }
                }

                $purchase->update([
                    'estado' => $validated['estado'],
                ]);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'No fue posible actualizar el estado de la compra en este momento.',
                'data'    => null,
                'errors'  => null,
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => "Compra marcada como '{$validated['estado']}' correctamente.",
            'data'    => $purchase->fresh()->load(['supplier', 'items.product', 'user']),
            'errors'  => null,
        ], 200);
    }
}
