<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Purchase;
use App\Models\PurchasePayment;
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
        $query = Purchase::with(['supplier', 'items.product', 'user', 'payments.user']);

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('estado_pago')) {
            $query->where('estado_pago', $request->estado_pago);
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
        $purchase = Purchase::with(['supplier', 'items.product', 'user', 'payments.user'])->find($id);
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
                        'costo_unitario' => $precioUnitario,
                        'subtotal' => $itemSubtotal,
                    ];
                }

                $estadoRecepcion = $request->estado ?? 'Recibida';

                $purchase = Purchase::create([
                    'numero_orden'  => $request->numero_orden,
                    'supplier_id'   => $request->supplier_id,
                    'fecha'         => $request->fecha,
                    'total'         => $totalCalculado,
                    'estado'        => $estadoRecepcion,
                    'estado_pago'   => $estadoRecepcion === 'Recibida' ? 'pagada' : 'pendiente',
                    'observaciones' => $request->observaciones,
                    'user_id'       => $authUser->id,
                ]);

                foreach ($itemsToCreate as $item) {
                    PurchaseItem::create([
                        'purchase_id'     => $purchase->id,
                        'product_id'      => $item['product_id'],
                        'cantidad'        => $item['cantidad'],
                        'precio_unitario' => $item['precio_unitario'],
                        'costo_unitario'  => $item['costo_unitario'],
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
                    'data'    => $purchase->load(['supplier', 'items.product', 'user', 'payments.user']),
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
            DB::transaction(function () use ($purchase, $validated, $request) {
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
            'data'    => $purchase->fresh()->load(['supplier', 'items.product', 'user', 'payments.user']),
            'errors'  => null,
        ], 200);
    }

    /**
     * Registra un pago asociado a una compra existente.
     */
    public function registerPayment(Request $request, Purchase $purchase): JsonResponse
    {
        $validated = $request->validate([
            'monto' => 'required|numeric|min:0.01',
            'metodo_pago' => 'required|string|max:50',
            'referencia_transaccion' => 'nullable|string|max:120',
            'fecha_pago' => 'required|date',
        ]);

        $purchase->loadMissing('payments');

        if ($purchase->estado === 'Cancelada') {
            return response()->json([
                'success' => false,
                'message' => 'No se pueden registrar pagos sobre una compra cancelada.',
                'data'    => null,
                'errors'  => null,
            ], 409);
        }

        $paidTotal = (float) $purchase->payments->sum('monto');
        $saldoActual = round(max((float) $purchase->total - $paidTotal, 0), 2);

        if ((float) $validated['monto'] > $saldoActual) {
            return response()->json([
                'success' => false,
                'message' => 'El monto del pago supera el saldo pendiente de la compra.',
                'data'    => null,
                'errors'  => null,
            ], 422);
        }

        $payment = DB::transaction(function () use ($purchase, $validated, $request, $saldoActual) {
            $payment = PurchasePayment::create([
                'purchase_id' => $purchase->id,
                'supplier_id' => $purchase->supplier_id,
                'user_id' => $request->user()->id,
                'monto' => round((float) $validated['monto'], 2),
                'metodo_pago' => $validated['metodo_pago'],
                'referencia_transaccion' => $validated['referencia_transaccion'] ?? null,
                'tipo' => round($saldoActual - (float) $validated['monto'], 2) <= 0 ? 'Completo' : 'Parcial',
                'fecha_pago' => $validated['fecha_pago'],
            ]);

            $this->generatePaymentJournalEntry($purchase, $payment, $request->user()->id);
            $purchase->refresh()->load('payments')->syncEstadoPago();

            return $payment;
        });

        return response()->json([
            'success' => true,
            'message' => 'Pago registrado correctamente.',
            'data'    => [
                'purchase' => $purchase->fresh()->load(['supplier', 'items.product', 'user', 'payments.user']),
                'payment'  => $payment->load(['supplier', 'user']),
            ],
            'errors'   => null,
        ], 201);
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

    /**
     * Asiento de pago a proveedor: débito CxP (2205), crédito caja (1105).
     */
    private function generatePaymentJournalEntry(Purchase $purchase, PurchasePayment $payment, int $userId): void
    {
        $cuentaProveedores = Account::where('codigo', '2205')->first();
        $cuentaCaja = Account::where('codigo', '1105')->first();

        if (! $cuentaProveedores || ! $cuentaCaja) {
            return;
        }

        $entry = JournalEntry::create([
            'fecha' => $payment->fecha_pago,
            'glosa' => "Pago compra Orden #{$purchase->numero_orden}",
            'referencia_tipo' => 'PurchasePayment',
            'referencia_id' => $payment->id,
            'user_id' => $userId,
        ]);

        $monto = (float) $payment->monto;

        JournalItem::create([
            'journal_entry_id' => $entry->id,
            'account_id' => $cuentaProveedores->id,
            'debe' => $monto,
            'haber' => 0,
        ]);

        JournalItem::create([
            'journal_entry_id' => $entry->id,
            'account_id' => $cuentaCaja->id,
            'debe' => 0,
            'haber' => $monto,
        ]);
    }
}
