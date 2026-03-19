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
    public function index()
    {
        $purchases = Purchase::with(['items.product'])->orderBy('created_at', 'desc')->get();
        return response()->json(['success' => true, 'data' => $purchases]);
    }

    public function store(Request $request)
    {
        $authUser = $request->attributes->get('auth_user');

        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Usuario no autenticado'], 401);
        }

        $validator = Validator::make($request->all(), [
            'numero_orden' => 'required|unique:purchases',
            'proveedor' => 'required',
            'fecha' => 'required',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.cantidad' => 'required|integer|min:1',
            'items.*.costo_unitario' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        try {
            return DB::transaction(function () use ($request, $authUser) {
                $purchase = Purchase::create([
                    'numero_orden' => $request->numero_orden,
                    'proveedor' => $request->proveedor,
                    'fecha' => $request->fecha,
                    'total' => $request->total,
                    'estado' => $request->estado ?? 'Recibida',
                    'observaciones' => $request->observaciones,
                    'user_id' => $authUser->id,
                ]);

                foreach ($request->items as $item) {
                    PurchaseItem::create([
                        'purchase_id' => $purchase->id,
                        'product_id' => $item['product_id'],
                        'cantidad' => $item['cantidad'],
                        'costo_unitario' => $item['costo_unitario'],
                        'subtotal' => $item['subtotal'],
                    ]);

                    // AUMENTAR STOCK
                    $product = Product::find($item['product_id']);
                    $product->increment('stock', $item['cantidad']);
                    
                    // Actualizar costo de compra si cambió
                    $product->update(['precio_compra' => $item['costo_unitario']]);
                }

                return response()->json([
                    'success' => true, 
                    'message' => 'Compra registrada con éxito y stock actualizado',
                    'data' => $purchase->load('items')
                ], 201);
            });
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
        }
    }
}
