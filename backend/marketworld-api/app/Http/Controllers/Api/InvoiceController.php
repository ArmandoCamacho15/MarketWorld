<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class InvoiceController extends Controller
{
    /**
     * Listado de facturas con Eager Loading para evitar N+1.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);

        // Modificado: Se agregó 'customer' al eager loading
        $query = Invoice::with(['customer', 'items.product', 'seller']);

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('numero_factura', 'like', "%{$search}%");
        }

        $invoices = $query
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'success' => true, 
            'message' => 'Facturas listadas correctamente',
            'data'    => $invoices->items(),
            'meta'    => [
                'total'        => $invoices->total(),
                'per_page'     => $invoices->perPage(),
                'current_page' => $invoices->currentPage(),
                'last_page'    => $invoices->lastPage(),
            ],
            'total'   => $invoices->total(),
            'errors'  => null,
        ]);
    }

    /**
     * Registrar una nueva venta (factura).
     */
    public function store(Request $request)
    {
        // Modificado: Ahora el usuario viene de Sanctum $request->user()
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
            'numero_factura' => 'required|unique:invoices',
            'customer_id'    => 'required|exists:customers,id', // Validar existencia del cliente
            'fecha'          => 'required',
            'metodo_pago'    => 'required',
            'descuento'      => 'nullable|numeric|min:0',
            'items'          => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.cantidad'   => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación en los datos de la factura.',
                'data'    => null,
                'errors'  => $validator->errors(),
            ], 422);
        }

        // VALIDACIÓN: Cliente activo
        $customer = \App\Models\Customer::find($request->customer_id);
        if (!$customer || $customer->estado !== 'Activo') {
            return response()->json([
                'success' => false,
                'message' => 'El cliente seleccionado no existe o está inactivo.',
                'errors'  => ['customer_id' => ['Cliente inactivo.']],
            ], 422);
        }

        try {
            return DB::transaction(function () use ($request, $authUser) {
                // 1. Recalcular totales en el servidor
                $subtotal = 0;
                $costoTotal = 0;
                $itemsToCreate = [];

                foreach ($request->items as $itemData) {
                    $product = Product::lockForUpdate()->find($itemData['product_id']);
                    
                    if (!$product) {
                        throw new \Exception("Producto con ID {$itemData['product_id']} no encontrado.");
                    }

                    if ($product->stock < $itemData['cantidad']) {
                        throw new \Exception("Stock insuficiente para el producto: " . $product->nombre);
                    }

                    $cantidad = (int) $itemData['cantidad'];
                    // Day 8: El precio unitario viene de la base de datos, no del request
                    $precioUnitario = (float) $product->precio_venta;
                    $itemSubtotal = round($cantidad * $precioUnitario, 2);
                    
                    $subtotal += $itemSubtotal;
                    $costoTotal += ($product->precio_compra * $cantidad);

                    $itemsToCreate[] = [
                        'product' => $product,
                        'cantidad' => $cantidad,
                        'precio_unitario' => $precioUnitario,
                        'subtotal' => $itemSubtotal,
                        'descuento' => (float) ($itemData['descuento'] ?? 0),
                    ];
                }

                $impuestos = round($subtotal * 0.19, 2);
                $descuento = (float) ($request->descuento ?? 0);
                $total = $subtotal + $impuestos - $descuento;

                // 2. Crear la cabecera de la factura
                $invoice = Invoice::create([
                    'numero_factura' => $request->numero_factura,
                    'customer_id'    => $request->customer_id,
                    'fecha'          => $request->fecha,
                    'subtotal'       => $subtotal,
                    'impuestos'      => $impuestos,
                    'descuento'      => $descuento,
                    'total'          => $total,
                    'metodo_pago'    => $request->metodo_pago,
                    'estado'         => $request->estado ?? 'Pagada',
                    'notas'          => $request->notas,
                    'user_id'        => $authUser->id,
                ]);

                // 3. Procesar ítems y actualizar stock
                foreach ($itemsToCreate as $item) {
                    InvoiceItem::create([
                        'invoice_id'      => $invoice->id,
                        'product_id'      => $item['product']->id,
                        'cantidad'        => $item['cantidad'],
                        'precio_unitario' => $item['precio_unitario'],
                        'descuento'       => $item['descuento'],
                        'subtotal'        => $item['subtotal'],
                    ]);

                    // REDUCIR STOCK (Auditable)
                    $item['product']->registrarSalida($item['cantidad'], $authUser->id, "Venta Factura #{$invoice->numero_factura}");
                }

                // 4. GENERAR ASIENTO CONTABLE AUTOMÁTICO
                $this->generateInvoiceJournalEntry($invoice, $costoTotal, $authUser->id);

                return response()->json([
                    'success' => true, 
                    'message' => 'Venta registrada con éxito y asiento contable generado', 
                    'data'    => $invoice->load(['customer', 'items.product', 'seller']),
                    'errors'  => null,
                ], 201);
            });
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'data'    => null,
                'errors'  => null,
            ], 409); // Conflicto de negocio (stock)
        }
    }

    /**
     * Mostrar una factura específica con sus relaciones cargadas.
     */
    public function show($id)
    {
        $invoice = Invoice::with(['customer', 'items.product', 'seller'])->find($id);

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Factura no encontrada',
                'data'    => null,
                'errors'  => null,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Factura obtenida correctamente',
            'data'    => $invoice,
            'errors'  => null,
        ]);
    }

    /**
     * Anular una factura y restituir stock de sus ítems.
     */
    public function update(Request $request, Invoice $invoice): JsonResponse
    {
        $validated = $request->validate([
            'estado'            => 'required|in:Anulada',
            'motivo_anulacion'  => 'required|string|min:10|max:255',
        ]);

        if ($invoice->estado === 'Anulada') {
            return response()->json([
                'success' => false,
                'message' => 'Esta factura ya está anulada.',
                'data'    => null,
                'errors'  => null,
            ], 409);
        }

        try {
            DB::transaction(function () use ($invoice, $validated, $request) {
                $invoice->loadMissing('items');

                foreach ($invoice->items as $item) {
                    $producto = Product::lockForUpdate()->find($item->product_id);
                    if ($producto) {
                        $producto->registrarEntrada($item->cantidad, $request->user()?->id, "Anulación de Factura #{$invoice->numero_factura}");
                    }
                }

                $lineaAnulacion = '[' . now()->format('Y-m-d H:i:s') . '] Anulación: ' . trim($validated['motivo_anulacion']);
                $notas = trim((string) $invoice->notas);
                $notasActualizadas = $notas === '' ? $lineaAnulacion : ($notas . PHP_EOL . $lineaAnulacion);

                $invoice->update([
                    'estado' => 'Anulada',
                    'notas'  => $notasActualizadas,
                ]);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'No fue posible anular la factura en este momento.',
                'data'    => null,
                'errors'  => null,
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Factura anulada correctamente. El stock fue restituido.',
            'data'    => $invoice->fresh()->load(['customer', 'items.product', 'seller']),
            'errors'  => null,
        ], 200);
    }

    /**
     * Genera el asiento contable para una factura de venta.
     */
    private function generateInvoiceJournalEntry(Invoice $invoice, float $costoTotal, int $userId)
    {
        $entry = JournalEntry::create([
            'fecha' => $invoice->fecha,
            'glosa' => "Venta Factura #{$invoice->numero_factura}",
            'referencia_tipo' => 'Invoice',
            'referencia_id' => $invoice->id,
            'user_id' => $userId,
        ]);

        // Cuentas requeridas
        $cuentaCaja = Account::where('codigo', '1105')->first();
        $cuentaClientes = Account::where('codigo', '1305')->first();
        $cuentaVentas = Account::where('codigo', '4135')->first();
        $cuentaIVA = Account::where('codigo', '2408')->first();
        $cuentaCostoVentas = Account::where('codigo', '6135')->first();
        $cuentaInventario = Account::where('codigo', '1435')->first();

        // 1. Registro de la Venta e Impuestos
        // Débito a Caja o Clientes (Total)
        $cuentaDebito = ($invoice->metodo_pago === 'Contado') ? $cuentaCaja : $cuentaClientes;
        if ($cuentaDebito) {
            JournalItem::create([
                'journal_entry_id' => $entry->id,
                'account_id' => $cuentaDebito->id,
                'debe' => $invoice->total,
                'haber' => 0
            ]);
        }

        // Crédito a Ventas (Subtotal)
        if ($cuentaVentas) {
            JournalItem::create([
                'journal_entry_id' => $entry->id,
                'account_id' => $cuentaVentas->id,
                'debe' => 0,
                'haber' => $invoice->subtotal
            ]);
        }

        // Crédito a IVA (Impuestos)
        if ($cuentaIVA && $invoice->impuestos > 0) {
            JournalItem::create([
                'journal_entry_id' => $entry->id,
                'account_id' => $cuentaIVA->id,
                'debe' => 0,
                'haber' => $invoice->impuestos
            ]);
        }

        // 2. Registro del Costo de Ventas (si hay costo calculado)
        if ($costoTotal > 0) {
            if ($cuentaCostoVentas) {
                JournalItem::create([
                    'journal_entry_id' => $entry->id,
                    'account_id' => $cuentaCostoVentas->id,
                    'debe' => $costoTotal,
                    'haber' => 0
                ]);
            }

            if ($cuentaInventario) {
                JournalItem::create([
                    'journal_entry_id' => $entry->id,
                    'account_id' => $cuentaInventario->id,
                    'debe' => 0,
                    'haber' => $costoTotal
                ]);
            }
        }
    }
}
