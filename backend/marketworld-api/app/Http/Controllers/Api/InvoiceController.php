<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class InvoiceController extends Controller
{
    /**
     * Listado de facturas con Eager Loading para evitar N+1.
     */
    public function index()
    {
        // Modificado: Se agregó 'customer' al eager loading
        $invoices = Invoice::with(['customer', 'items.product', 'seller'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true, 
            'message' => 'Facturas listadas correctamente',
            'data'    => $invoices,
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
            'items'          => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.cantidad'   => 'required|integer|min:1',
            'items.*.precio_unitario' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Error de validación en los datos de la factura.',
                'data'    => null,
                'errors'  => $validator->errors(),
            ], 422);
        }

        try {
            return DB::transaction(function () use ($request, $authUser) {
                // 1. Crear la cabecera de la factura
                $invoice = Invoice::create([
                    'numero_factura' => $request->numero_factura,
                    'customer_id'    => $request->customer_id,
                    'fecha'          => $request->fecha,
                    'subtotal'       => $request->subtotal,
                    'impuestos'      => $request->impuestos,
                    'total'          => $request->total,
                    'metodo_pago'    => $request->metodo_pago,
                    'estado'         => $request->estado ?? 'Pagada',
                    'notas'          => $request->notas,
                    'user_id'        => $authUser->id,
                ]);

                // 2. Procesar ítems y actualizar stock
                foreach ($request->items as $item) {
                    $product = Product::lockForUpdate()->find($item['product_id']);
                    
                    if (!$product) {
                        throw new \Exception("Producto no encontrado.");
                    }

                    if ($product->stock < $item['cantidad']) {
                        throw new \Exception("Stock insuficiente para el producto: " . $product->nombre);
                    }

                    InvoiceItem::create([
                        'invoice_id'      => $invoice->id,
                        'product_id'      => $item['product_id'],
                        'cantidad'        => $item['cantidad'],
                        'precio_unitario' => $item['precio_unitario'],
                        'descuento'       => $item['descuento'] ?? 0,
                        'subtotal'        => $item['subtotal'],
                    ]);

                    // REDUCIR STOCK
                    $product->decrement('stock', $item['cantidad']);
                }

                return response()->json([
                    'success' => true, 
                    'message' => 'Venta registrada con éxito', 
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
}
