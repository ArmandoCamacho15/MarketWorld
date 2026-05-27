<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CompanySetting;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Purchase;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    private function periodExpression(string $column, string $agrupar): string
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            return match ($agrupar) {
                'semana' => "strftime('%Y-%W', {$column})",
                'mes' => "strftime('%Y-%m', {$column})",
                default => "strftime('%Y-%m-%d', {$column})",
            };
        }

        return match ($agrupar) {
            'semana' => "DATE_FORMAT({$column}, '%Y-%u')",
            'mes' => "DATE_FORMAT({$column}, '%Y-%m')",
            default => "DATE_FORMAT({$column}, '%Y-%m-%d')",
        };
    }

    private function buildTaxSummaryData(string $desde, string $hasta): array
    {
        $periodExpression = $this->periodExpression('fecha', 'mes');

        $periodos = Invoice::query()
            ->selectRaw($periodExpression . ' as periodo')
            ->selectRaw('COUNT(*) as cantidad_facturas')
            ->selectRaw('SUM(COALESCE(subtotal, 0)) as base_gravable')
            ->selectRaw('SUM(COALESCE(impuestos, 0)) as iva_generado')
            ->selectRaw('SUM(COALESCE(total, 0)) as total_facturado')
            ->where('estado', '!=', 'Anulada')
            ->whereBetween('fecha', [$desde, $hasta])
            ->groupByRaw($periodExpression)
            ->orderBy('periodo')
            ->get()
            ->map(function ($item): array {
                $base = (float) ($item->base_gravable ?? 0);
                $iva = (float) ($item->iva_generado ?? 0);

                return [
                    'periodo' => $item->periodo,
                    'cantidad_facturas' => (int) $item->cantidad_facturas,
                    'base_gravable' => round($base, 2),
                    'iva_generado' => round($iva, 2),
                    'tasa_promedio' => $base > 0 ? round(($iva / $base) * 100, 2) : 0,
                    'total_facturado' => round((float) ($item->total_facturado ?? 0), 2),
                ];
            })
            ->values();

        $companySetting = CompanySetting::query()->latest('id')->first();

        return [
            'company_tax_id' => $companySetting?->tax_id,
            'company_name' => $companySetting?->company_name,
            'periodo' => [
                'desde' => $desde,
                'hasta' => $hasta,
            ],
            'periodos' => $periodos,
            'totales' => [
                'cantidad_facturas' => (int) $periodos->sum('cantidad_facturas'),
                'base_gravable' => round((float) $periodos->sum('base_gravable'), 2),
                'iva_generado' => round((float) $periodos->sum('iva_generado'), 2),
                'total_facturado' => round((float) $periodos->sum('total_facturado'), 2),
            ],
        ];
    }

    /**
     * Endpoint legacy de ventas (se conserva por compatibilidad temporal).
     */
    public function salesSummary()
    {
        $sales = Invoice::selectRaw('DATE(fecha) as date, SUM(total) as total')
            ->groupBy('date')
            ->orderBy('date', 'desc')
            ->take(30)
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Resumen de ventas generado.',
            'data' => $sales,
            'errors' => null,
        ]);
    }

    /**
     * Endpoint legacy de utilidad de inventario (se conserva por compatibilidad temporal).
     */
    public function inventoryUtility()
    {
        $products = Product::select('nombre', 'sku', 'stock', 'precio_compra', 'precio_venta')->get();
        
        $utility = $products->map(function($product) {
            return [
                'name' => $product->nombre,
                'sku' => $product->sku,
                'stock' => $product->stock,
                'potential_profit' => ($product->precio_venta - $product->precio_compra) * $product->stock
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Utilidad de inventario generada.',
            'data' => $utility,
            'errors' => null,
        ]);
    }

    /**
     * Reporte de ventas por periodo.
     */
    public function ventas(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'desde' => 'nullable|date|before_or_equal:hasta',
            'hasta' => 'nullable|date',
            'agrupar' => 'nullable|in:dia,semana,mes',
        ]);

        $desde = $validated['desde'] ?? Carbon::now()->startOfMonth()->toDateString();
        $hasta = $validated['hasta'] ?? Carbon::now()->toDateString();
        $agrupar = $validated['agrupar'] ?? 'dia';

        $formatoDB = match ($agrupar) {
            'semana' => '%Y-%u',
            'mes' => '%Y-%m',
            default => '%Y-%m-%d',
        };

        $periodExpression = $this->periodExpression('fecha', $agrupar);

        $ventas = Invoice::query()
            ->selectRaw($periodExpression . ' as periodo')
            ->selectRaw('COUNT(*) as cantidad_facturas')
            ->selectRaw('SUM(total) as total_ventas')
            ->selectRaw('SUM(COALESCE(impuestos, 0)) as total_impuestos')
            ->where('estado', '!=', 'Anulada')
            ->whereBetween('fecha', [$desde, $hasta])
            ->groupByRaw($periodExpression)
            ->orderBy('periodo')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Reporte de ventas generado.',
            'data' => [
                'periodos' => $ventas,
                'total_periodo' => (float) $ventas->sum('total_ventas'),
                'total_facturas' => (int) $ventas->sum('cantidad_facturas'),
                'periodo' => [
                    'desde' => $desde,
                    'hasta' => $hasta,
                    'agrupar' => $agrupar,
                ],
            ],
            'errors' => null,
        ]);
    }

    /**
     * Reporte de inventario valorizado.
     */
    public function inventario(): JsonResponse
    {
        $productos = Product::query()
            ->select([
                'id',
                'nombre',
                'sku',
                'categoria',
                'stock',
                'stock_minimo',
                'precio_compra',
                'precio_venta',
            ])
            ->orderBy('nombre')
            ->get()
            ->map(function (Product $p): array {
                $stock = (int) ($p->stock ?? 0);
                $stockMinimo = (int) ($p->stock_minimo ?? 0);
                $precioCompra = (float) ($p->precio_compra ?? 0);

                return [
                    'id' => $p->id,
                    'nombre' => $p->nombre,
                    'sku' => $p->sku,
                    'categoria' => $p->categoria ?: 'Sin categoría',
                    'stock' => $stock,
                    'stock_minimo' => $stockMinimo,
                    'alerta_stock_bajo' => $stock <= $stockMinimo,
                    'precio_compra' => $precioCompra,
                    'precio_venta' => (float) ($p->precio_venta ?? 0),
                    'valorizacion' => round($stock * $precioCompra, 2),
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Reporte de inventario generado.',
            'data' => [
                'productos' => $productos,
                'total_valorizacion' => (float) $productos->sum('valorizacion'),
                'productos_stock_bajo' => (int) $productos->where('alerta_stock_bajo', true)->count(),
            ],
            'errors' => null,
        ]);
    }

    /**
     * Reporte financiero simplificado.
     */
    public function financiero(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'desde' => 'nullable|date|before_or_equal:hasta',
            'hasta' => 'nullable|date',
        ]);

        $desde = $validated['desde'] ?? Carbon::now()->startOfMonth()->toDateString();
        $hasta = $validated['hasta'] ?? Carbon::now()->toDateString();

        $ingresos = (float) Invoice::query()
            ->where('estado', '!=', 'Anulada')
            ->whereBetween('fecha', [$desde, $hasta])
            ->sum(DB::raw('COALESCE(subtotal, total)'));

        $comprasPeriodo = Purchase::query()
            ->where('estado', '!=', 'Cancelada')
            ->whereBetween('fecha', [$desde, $hasta])
            ->with('payments')
            ->get();

        $gastos = (float) $comprasPeriodo->sum('total');
        $cuentasPorPagar = round((float) $comprasPeriodo->sum(fn (Purchase $purchase) => $purchase->saldo), 2);

        return response()->json([
            'success' => true,
            'message' => 'Reporte financiero generado.',
            'data' => [
                'ingresos_ventas' => round($ingresos, 2),
                'gastos_compras' => round($gastos, 2),
                'cuentas_por_pagar' => $cuentasPorPagar,
                'utilidad_bruta' => round($ingresos - $gastos, 2),
                'periodo' => [
                    'desde' => $desde,
                    'hasta' => $hasta,
                ],
            ],
            'errors' => null,
        ]);
    }

    /**
     * Reporte de cuentas por pagar.
     */
    public function cxp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'desde' => 'nullable|date|before_or_equal:hasta',
            'hasta' => 'nullable|date',
        ]);

        $desde = $validated['desde'] ?? Carbon::now()->startOfMonth()->toDateString();
        $hasta = $validated['hasta'] ?? Carbon::now()->toDateString();

        $purchases = Purchase::query()
            ->with(['supplier', 'payments'])
            ->where('estado', '!=', 'Cancelada')
            ->whereBetween('fecha', [$desde, $hasta])
            ->orderByDesc('fecha')
            ->orderByDesc('id')
            ->get();

        $items = $purchases->map(function (Purchase $purchase): array {
            return [
                'id' => $purchase->id,
                'fecha' => Carbon::parse($purchase->fecha)->toDateString(),
                'numero_orden' => $purchase->numero_orden,
                'proveedor' => $purchase->supplier?->nombre ?? 'Sin proveedor',
                'estado' => $purchase->estado,
                'estado_pago' => $purchase->estado_pago,
                'total' => round((float) $purchase->total, 2),
                'pagado' => round((float) $purchase->paid_total, 2),
                'saldo' => round((float) $purchase->saldo, 2),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'message' => 'Reporte de cuentas por pagar generado.',
            'data' => [
                'periodo' => [
                    'desde' => $desde,
                    'hasta' => $hasta,
                ],
                'items' => $items,
                'resumen' => [
                    'compras' => (int) $items->count(),
                    'total' => round((float) $items->sum('total'), 2),
                    'pagado' => round((float) $items->sum('pagado'), 2),
                    'saldo' => round((float) $items->sum('saldo'), 2),
                    'pendientes' => (int) $items->filter(fn ($item) => $item['saldo'] > 0)->count(),
                ],
            ],
            'errors' => null,
        ]);
    }

    /**
     * Reporte de clientes.
     */
    public function clientes(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'desde' => 'nullable|date|before_or_equal:hasta',
            'hasta' => 'nullable|date',
            'search' => 'nullable|string|max:120',
        ]);

        $desde = $validated['desde'] ?? Carbon::now()->startOfMonth()->toDateString();
        $hasta = $validated['hasta'] ?? Carbon::now()->toDateString();
        $search = $validated['search'] ?? null;

        $customers = Customer::query()
            ->withCount(['invoices as facturas_periodo' => function ($query) use ($desde, $hasta) {
                $query->where('estado', '!=', 'Anulada')
                    ->whereBetween('fecha', [$desde, $hasta]);
            }])
            ->withSum(['invoices as ventas_periodo' => function ($query) use ($desde, $hasta) {
                $query->where('estado', '!=', 'Anulada')
                    ->whereBetween('fecha', [$desde, $hasta]);
            }], 'total')
            ->when($search, function ($query, $search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('nombre', 'like', '%' . $search . '%')
                        ->orWhere('documento', 'like', '%' . $search . '%')
                        ->orWhere('email', 'like', '%' . $search . '%');
                });
            })
            ->orderByDesc('ventas_periodo')
            ->orderBy('nombre')
            ->limit(50)
            ->get();

        $items = $customers->map(function (Customer $customer): array {
            $ventasPeriodo = (float) ($customer->ventas_periodo ?? 0);

            return [
                'id' => $customer->id,
                'nombre' => $customer->nombre,
                'documento' => $customer->documento,
                'email' => $customer->email,
                'telefono' => $customer->telefono,
                'segmento' => $customer->segmento,
                'estado' => $customer->estado,
                'facturas_periodo' => (int) ($customer->facturas_periodo ?? 0),
                'valor_periodo' => round($ventasPeriodo, 2),
                'valor_total' => round((float) ($customer->valor_total ?? 0), 2),
                'total_compras' => (int) ($customer->total_compras ?? 0),
                'ticket_promedio' => (int) ($customer->facturas_periodo ?? 0) > 0
                    ? round($ventasPeriodo / max((int) $customer->facturas_periodo, 1), 2)
                    : 0,
                'fecha_registro' => optional($customer->created_at)->toDateString(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'message' => 'Reporte de clientes generado.',
            'data' => [
                'periodo' => [
                    'desde' => $desde,
                    'hasta' => $hasta,
                ],
                'items' => $items,
                'resumen' => [
                    'total_clientes' => (int) $items->count(),
                    'clientes_activos' => (int) $items->where('estado', 'Activo')->count(),
                    'ventas_periodo' => round((float) $items->sum('valor_periodo'), 2),
                    'facturas_periodo' => (int) $items->sum('facturas_periodo'),
                ],
            ],
            'errors' => null,
        ]);
    }

    /**
     * Resumen tributario real derivado de facturas emitidas.
     */
    public function taxSummary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'desde' => 'nullable|date|before_or_equal:hasta',
            'hasta' => 'nullable|date',
        ]);

        $desde = $validated['desde'] ?? Carbon::now()->startOfMonth()->toDateString();
        $hasta = $validated['hasta'] ?? Carbon::now()->toDateString();
        $summary = $this->buildTaxSummaryData($desde, $hasta);

        return response()->json([
            'success' => true,
            'message' => 'Resumen tributario generado.',
            'data' => [
                'company_tax_id' => $summary['company_tax_id'],
                'periodo' => $summary['periodo'],
                'periodos' => $summary['periodos'],
                'totales' => $summary['totales'],
            ],
            'errors' => null,
        ]);
    }

    /**
     * Borrador DIAN descargable derivado del resumen tributario.
     */
    public function dianDraft(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'desde' => 'nullable|date|before_or_equal:hasta',
            'hasta' => 'nullable|date',
        ]);

        $desde = $validated['desde'] ?? Carbon::now()->startOfMonth()->toDateString();
        $hasta = $validated['hasta'] ?? Carbon::now()->toDateString();
        $summary = $this->buildTaxSummaryData($desde, $hasta);

        $periodos = collect($summary['periodos']);
        $companySetting = CompanySetting::query()->latest('id')->first();

        return response()->json([
            'success' => true,
            'message' => 'Borrador DIAN generado correctamente.',
            'data' => [
                'connector' => 'MarketWorld.DIAN.DraftConnector',
                'status' => 'draft',
                'generated_at' => Carbon::now()->toIso8601String(),
                'company' => [
                    'name' => $companySetting?->company_name,
                    'tax_id' => $companySetting?->tax_id,
                ],
                'periodo' => $summary['periodo'],
                'totales' => $summary['totales'],
                'summary' => $summary['periodos'],
                'declaration' => [
                    'form_type' => 'IVA_Renta_Borrador',
                    'periods' => $periodos->map(function ($item): array {
                        return [
                            'periodo' => $item['periodo'],
                            'facturas' => $item['cantidad_facturas'],
                            'base_gravable' => $item['base_gravable'],
                            'iva_generado' => $item['iva_generado'],
                            'tasa_promedio' => $item['tasa_promedio'],
                            'total_facturado' => $item['total_facturado'],
                        ];
                    })->values(),
                ],
            ],
            'errors' => null,
        ]);
    }
}
