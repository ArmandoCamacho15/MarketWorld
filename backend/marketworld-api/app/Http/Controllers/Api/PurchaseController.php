<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PurchaseController extends Controller
{
    /**
     * Listado de compras con Eager Loading.
     */
    public function index()
    {
        // Modificado: Se agregó 'supplier' al eager loading
        $purchases = Purchase::with(['supplier', 'items.product', 'user'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $purchases]);
    }

    /**
     * Registrar una compra y actualizar stock.
     */
    public function store(Request $request)
    {
        // Modificado: Usuario de Sanctum
        $authUser = $request->user();

        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Usuario no autenticado'], 401);
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
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
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
                    $purchaseItem = PurchaseItem::create([
                        'purchase_id'     => $purchase->id,
                        'product_id'      => $item['product_id'],
                        'cantidad'        => $item['cantidad'],
                        'precio_unitario' => $item['precio_unitario'], // Modificado campo
                        'subtotal'        => $item['subtotal'],
                    ]);

                    // Lógica para actualizar stock si el estado es 'Recibida'
                    if ($purchase->estado === 'Recibida') {
                        $product = Product::lockForUpdate()->find($item['product_id']);
                        
                        // Modificado: Se usa increment() como se solicitó
                        $product->increment('stock', $item['cantidad']);
                        
                        // Opcional: Actualizar el precio de compra del producto
                        $product->update(['precio_compra' => $item['precio_unitario']]);
                    }
                }

                return response()->json([
                    'success' => true, 
                    'message' => 'Compra registrada con éxito y stock actualizado',
                    'data'    => $purchase->load(['supplier', 'items.product'])
                ], 201);
            });
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}
