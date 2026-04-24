<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Product;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalItem;
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
            'items.*.precio_unitario' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación en los datos de la compra.',
                'data'    => null,
                'errors'  => $validator->errors(),
            ], 422);
        }

        // VALIDACIÓN: Proveedor activo
        $supplier = \App\Models\Supplier::find($request->supplier_id);
        if (!$supplier || $supplier->estado !== 'Activo') {
            return response()->json([
                'success' => false,
                'message' => 'El proveedor seleccionado no existe o está inactivo.',
                'errors'  => ['supplier_id' => ['Proveedor inactivo.']],
            ], 422);
        }

        try {
            return DB::transaction(function () use ($request, $authUser) {
                // 1. Recalcular total en el servidor
                $totalCalculado = 0;
                $itemsToCreate = [];

                foreach ($request->items as $itemData) {
                    $cantidad = (int) $itemData['cantidad'];
                    $precioUnitario = (float) $itemData['precio_unitario'];
                    $itemSubtotal = round($cantidad * $precioUnitario, 2);
                    $totalCalculado += $itemSubtotal;

                    $itemsToCreate[] = [
                        'product_id' => $itemData['product_id'],
                        'cantidad' => $cantidad,
                        'precio_unitario' => $precioUnitario,
                        'subtotal' => $itemSubtotal,
                    ];
                }

                $purchase = Purchase::create([
                    'numero_orden'  => $request->numero_orden,
                    'supplier_id'   => $request->supplier_id,
                    'fecha'         => $request->fecha,
                    'total'         => $totalCalculado,
                    'estado'        => $request->estado ?? 'Recibida',
                    'observaciones' => $request->observaciones,
                    'user_id'       => $authUser->id,
                ]);

                foreach ($itemsToCreate as $item) {
                    PurchaseItem::create([
                        'purchase_id'     => $purchase->id,
                        'product_id'      => $item['product_id'],
                        'cantidad'        => $item['cantidad'],
                        'precio_unitario' => $item['precio_unitario'],
                        'subtotal'        => $item['subtotal'],
                    ]);

                    // Lógica para actualizar stock si el estado es 'Recibida'
                    if ($purchase->estado === 'Recibida') {
                        $product = Product::lockForUpdate()->find($item['product_id']);
                        if ($product) {
                            // Actualizar stock y costo usando Costo Promedio Ponderado (CPP) y registrar en Kardex
                            $product->aplicarCostoPromedioPonderado($item['cantidad'], $item['precio_unitario'], $authUser->id, "Cálculo PMP por Orden #{$purchase->numero_orden}");
                        }
                    }
                }

                // 2. GENERAR ASIENTO CONTABLE AUTOMÁTICO
                $this->generatePurchaseJournalEntry($purchase, $authUser->id);

                return response()->json([
                    'success' => true, 
                    'message' => 'Compra registrada con éxito, stock actualizado y asiento generado',
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

                        $product->aplicarCostoPromedioPonderado($item->cantidad, $item->precio_unitario, $request->user()?->id, "Cálculo PMP por recepción de Orden #{$purchase->numero_orden}");
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

    /**
     * Genera el asiento contable para una compra.
     */
    private function generatePurchaseJournalEntry(Purchase $purchase, int $userId)
    {
        $entry = JournalEntry::create([
            'fecha' => $purchase->fecha,
            'glosa' => "Compra Orden #{$purchase->numero_orden}",
            'referencia_tipo' => 'Purchase',
            'referencia_id' => $purchase->id,
            'user_id' => $userId,
        ]);

        // Cuentas requeridas
        $cuentaInventario = Account::where('codigo', '1435')->first();
        $cuentaCaja = Account::where('codigo', '1105')->first();
        $cuentaProveedores = Account::where('codigo', '2205')->first();

        // Débito a Inventario (Total)
        if ($cuentaInventario) {
            JournalItem::create([
                'journal_entry_id' => $entry->id,
                'account_id' => $cuentaInventario->id,
                'debe' => $purchase->total,
                'haber' => 0
            ]);
        }

        // Crédito a Caja o Proveedores
        // (Por ahora simplificamos: si el estado es 'Recibida' asumimos Contado, sino Crédito/Proveedores)
        $cuentaCredito = ($purchase->estado === 'Recibida') ? $cuentaCaja : $cuentaProveedores;
        
        if ($cuentaCredito) {
            JournalItem::create([
                'journal_entry_id' => $entry->id,
                'account_id' => $cuentaCredito->id,
                'debe' => 0,
                'haber' => $purchase->total
            ]);
        }
    }
}
