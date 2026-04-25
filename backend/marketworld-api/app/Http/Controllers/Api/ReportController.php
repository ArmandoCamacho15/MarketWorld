<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Purchase;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
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

        $ventas = Invoice::query()
            ->selectRaw("DATE_FORMAT(fecha, '{$formatoDB}') as periodo")
            ->selectRaw('COUNT(*) as cantidad_facturas')
            ->selectRaw('SUM(total) as total_ventas')
            ->selectRaw('SUM(COALESCE(impuestos, 0)) as total_impuestos')
            ->where('estado', '!=', 'Anulada')
            ->whereBetween('fecha', [$desde, $hasta])
            ->groupByRaw("DATE_FORMAT(fecha, '{$formatoDB}')")
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

        $gastos = (float) Purchase::query()
            ->where('estado', 'Recibida')
            ->whereBetween('fecha', [$desde, $hasta])
            ->sum('total');

        return response()->json([
            'success' => true,
            'message' => 'Reporte financiero generado.',
            'data' => [
                'ingresos_ventas' => round($ingresos, 2),
                'gastos_compras' => round($gastos, 2),
                'utilidad_bruta' => round($ingresos - $gastos, 2),
                'periodo' => [
                    'desde' => $desde,
                    'hasta' => $hasta,
                ],
            ],
            'errors' => null,
        ]);
    }
}
