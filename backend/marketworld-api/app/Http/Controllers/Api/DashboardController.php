<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Customer;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
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

    private function resolveGrouping(Carbon $desde, Carbon $hasta): string
    {
        $dias = max($desde->diffInDays($hasta) + 1, 1);

        if ($dias <= 31) {
            return 'dia';
        }

        if ($dias <= 92) {
            return 'semana';
        }

        return 'mes';
    }

    private function buildSalesHistory(string $desde, string $hasta, string $agrupar): array
    {
        $periodExpression = $this->periodExpression('fecha', $agrupar);

        return Invoice::query()
            ->selectRaw($periodExpression . ' as periodo')
            ->selectRaw('SUM(COALESCE(total, 0)) as total')
            ->whereNotIn('estado', ['Anulada', 'Cancelada'])
            ->whereBetween('fecha', [$desde, $hasta])
            ->groupByRaw($periodExpression)
            ->orderBy('periodo')
            ->get()
            ->map(function ($item): array {
                return [
                    'label' => (string) $item->periodo,
                    'total' => round((float) ($item->total ?? 0), 2),
                ];
            })
            ->values()
            ->all();
    }

    private function buildInventoryHistory(string $desde, string $hasta): array
    {
        $movements = InventoryMovement::query()
            ->selectRaw('tipo, COUNT(*) as movimientos, SUM(COALESCE(cantidad, 0)) as unidades')
            ->whereBetween('created_at', [$desde . ' 00:00:00', $hasta . ' 23:59:59'])
            ->groupBy('tipo')
            ->get()
            ->keyBy(function ($item) {
                return strtolower((string) $item->tipo);
            });

        $orderedTypes = [
            'entrada' => 'Entrada',
            'salida' => 'Salida',
            'ajuste' => 'Ajuste',
        ];

        $result = [];

        foreach ($orderedTypes as $key => $label) {
            $item = $movements->get($key);

            $result[] = [
                'tipo' => $key,
                'label' => $label,
                'movimientos' => (int) ($item->movimientos ?? 0),
                'unidades' => (float) ($item->unidades ?? 0),
            ];
        }

        return $result;
    }

    private function buildCxpHistory(string $desde, string $hasta): array
    {
        $purchases = Purchase::query()
            ->where('estado', '!=', 'Cancelada')
            ->whereBetween('fecha', [$desde, $hasta])
            ->with('payments')
            ->get();

        $grouped = $purchases->groupBy(function (Purchase $purchase): string {
            return strtolower((string) ($purchase->estado_pago ?: 'pendiente'));
        });

        $statuses = [
            'pagada' => 'Pagada',
            'parcial' => 'Parcial',
            'pendiente' => 'Pendiente',
        ];

        $result = [];

        foreach ($statuses as $key => $label) {
            $items = $grouped->get($key, collect());

            $result[] = [
                'estado_pago' => $key,
                'label' => $label,
                'compras' => (int) $items->count(),
                'saldo' => round((float) $items->sum(fn (Purchase $purchase) => $purchase->saldo), 2),
                'total' => round((float) $items->sum('total'), 2),
            ];
        }

        return $result;
    }

    private function buildRecentTransactions(int $limit = 10): array
    {
        $recentInvoices = Invoice::with(['seller', 'customer'])
            ->latest('created_at')
            ->latest('id')
            ->take($limit)
            ->get()
            ->map(function ($invoice): array {
                $rawDate = $invoice->created_at ?: $invoice->fecha;
                $sortDate = $rawDate ? Carbon::parse($rawDate) : Carbon::now();

                return [
                    'id' => $invoice->id,
                    'document_type' => 'invoice',
                    'document_label' => 'Factura',
                    'document_number' => $invoice->numero_factura,
                    'counterparty_label' => 'Cliente',
                    'counterparty_name' => $invoice->customer ? $invoice->customer->nombre : 'Consumidor Final',
                    'total' => round((float) $invoice->total, 2),
                    'estado' => $invoice->estado,
                    'fecha' => $sortDate->toIso8601String(),
                    'sort_key' => $sortDate->timestamp,
                ];
            });

        $recentPurchases = Purchase::with('supplier')
            ->latest('created_at')
            ->latest('id')
            ->take($limit)
            ->get()
            ->map(function (Purchase $purchase): array {
                $rawDate = $purchase->created_at ?: $purchase->fecha;
                $sortDate = $rawDate ? Carbon::parse($rawDate) : Carbon::now();

                return [
                    'id' => $purchase->id,
                    'document_type' => 'purchase',
                    'document_label' => 'Compra',
                    'document_number' => $purchase->numero_orden,
                    'counterparty_label' => 'Proveedor',
                    'counterparty_name' => $purchase->supplier ? $purchase->supplier->nombre : 'Sin proveedor',
                    'total' => round((float) $purchase->total, 2),
                    'estado' => ucfirst((string) $purchase->estado_pago ?: 'pendiente'),
                    'fecha' => $sortDate->toIso8601String(),
                    'sort_key' => $sortDate->timestamp,
                ];
            });

        return $recentInvoices
            ->concat($recentPurchases)
            ->sortByDesc('sort_key')
            ->take($limit)
            ->values()
            ->map(function (array $item): array {
                unset($item['sort_key']);

                return $item;
            })
            ->all();
    }

    public function stats(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'desde' => 'nullable|date|before_or_equal:hasta',
            'hasta' => 'nullable|date',
        ]);

        $desde = Carbon::parse($validated['desde'] ?? Carbon::now()->startOfMonth()->toDateString())->startOfDay();
        $hasta = Carbon::parse($validated['hasta'] ?? Carbon::now()->toDateString())->endOfDay();

        if ($desde->greaterThan($hasta)) {
            [$desde, $hasta] = [$hasta->copy()->startOfDay(), $desde->copy()->endOfDay()];
        }

        $desdeDate = $desde->toDateString();
        $hastaDate = $hasta->toDateString();
        $agrupar = $this->resolveGrouping($desde, $hasta);

        $salesHistory = $this->buildSalesHistory($desdeDate, $hastaDate, $agrupar);
        $inventoryHistory = $this->buildInventoryHistory($desdeDate, $hastaDate);
        $cxpHistory = $this->buildCxpHistory($desdeDate, $hastaDate);
        $recentTransactions = $this->buildRecentTransactions(10);
        $productsLow = Product::whereColumn('stock', '<=', 'stock_minimo')
            ->orderBy('stock')
            ->orderBy('nombre')
            ->take(10)
            ->get()
            ->map(function (Product $product): array {
                return [
                    'id' => $product->id,
                    'nombre' => $product->nombre,
                    'stock' => (int) $product->stock,
                    'stock_minimo' => (int) $product->stock_minimo,
                    'stockMinimo' => (int) $product->stock_minimo,
                ];
            })
            ->values()
            ->all();

        return response()->json([
            'success' => true,
            'data' => [
                'periodo' => [
                    'desde' => $desdeDate,
                    'hasta' => $hastaDate,
                    'agrupar' => $agrupar,
                ],
                'sales_today' => Invoice::whereDate('fecha', Carbon::today()->toDateString())
                    ->whereNotIn('estado', ['Anulada', 'Cancelada'])
                    ->sum('total'),
                'sales_month' => Invoice::whereNotIn('estado', ['Anulada', 'Cancelada'])
                    ->whereBetween('fecha', [$desdeDate, $hastaDate])
                    ->sum('total'),
                'purchases_month' => Purchase::where('estado', '!=', 'Cancelada')
                    ->whereBetween('fecha', [$desdeDate, $hastaDate])
                    ->sum('total'),
                'accounts_payable' => round((float) Purchase::query()
                    ->where('estado', '!=', 'Cancelada')
                    ->whereBetween('fecha', [$desdeDate, $hastaDate])
                    ->with('payments')
                    ->get()
                    ->sum(fn (Purchase $purchase) => $purchase->saldo), 2),
                'low_stock_count' => Product::whereColumn('stock', '<=', 'stock_minimo')->count(),
                'total_products' => Product::count(),
                'inventory_value' => (float) Product::query()
                    ->get(['stock', 'precio_compra'])
                    ->sum(function ($product) {
                        $stock = (float) $product->stock;
                        $cost = (float) ($product->precio_compra ?? 0);
                        return $stock * $cost;
                    }),
                'total_customers' => Customer::count(),
                'products_low' => $productsLow,
                'recent_sales' => Invoice::with(['seller', 'customer'])
                    ->latest('created_at')
                    ->latest('id')
                    ->take(5)
                    ->get()
                    ->map(function ($invoice) {
                        $rawDate = $invoice->fecha ?: ($invoice->created_at ?? null);

                        try {
                            $isoDate = $rawDate ? Carbon::parse($rawDate)->toIso8601String() : null;
                        } catch (\Exception $e) {
                            $isoDate = $rawDate;
                        }

                        return [
                            'id' => $invoice->id,
                            'numero_factura' => $invoice->numero_factura,
                            'fecha' => $isoDate,
                            'total' => $invoice->total,
                            'estado' => $invoice->estado,
                            'cliente_nombre' => $invoice->customer ? $invoice->customer->nombre : 'Consumidor Final',
                            'vendedor_nombre' => $invoice->seller ? $invoice->seller->name : 'Sistema'
                        ];
                    })
                    ->values(),
                'recent_purchases' => Purchase::with('supplier')
                    ->latest('created_at')
                    ->latest('id')
                    ->take(5)
                    ->get()
                    ->map(function (Purchase $purchase): array {
                        $rawDate = $purchase->fecha ?: ($purchase->created_at ?? null);

                        try {
                            $isoDate = $rawDate ? Carbon::parse($rawDate)->toIso8601String() : null;
                        } catch (\Exception $e) {
                            $isoDate = $rawDate;
                        }

                        return [
                            'id' => $purchase->id,
                            'numero_orden' => $purchase->numero_orden,
                            'fecha' => $isoDate,
                            'total' => $purchase->total,
                            'estado' => $purchase->estado,
                            'estado_pago' => $purchase->estado_pago,
                            'proveedor_nombre' => $purchase->supplier ? $purchase->supplier->nombre : 'Sin proveedor',
                        ];
                    })
                    ->values(),
                'recent_transactions' => $recentTransactions,
                'sales_history' => $salesHistory,
                'inventory_history' => $inventoryHistory,
                'cxp_history' => $cxpHistory,
            ]
        ]);
    }
}
