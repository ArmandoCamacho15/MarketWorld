<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Customer;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function stats()
    {
        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();

        // Obtener historial de ventas de los últimos 6 meses para el gráfico
        $salesHistory = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i);
            $total = Invoice::whereMonth('fecha', $month->month)
                ->whereYear('fecha', $month->year)
                ->whereNotIn('estado', ['Anulada', 'Cancelada'])
                ->sum('total');
            
            $salesHistory[] = [
                'label' => $month->translatedFormat('M'),
                'total' => (float)$total
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'sales_today' => Invoice::whereDate('fecha', $today)
                    ->whereNotIn('estado', ['Anulada', 'Cancelada'])
                    ->sum('total'),
                'sales_month' => Invoice::whereMonth('fecha', $today->month)
                    ->whereYear('fecha', $today->year)
                    ->whereNotIn('estado', ['Anulada', 'Cancelada'])
                    ->sum('total'),
                'purchases_month' => Purchase::whereMonth('fecha', $today->month)
                    ->whereYear('fecha', $today->year)
                    ->where('estado', '!=', 'Cancelada')
                    ->sum('total'),
                'accounts_payable' => round((float) Purchase::query()
                    ->where('estado', '!=', 'Cancelada')
                    ->with('payments')
                    ->get()
                    ->sum(fn (Purchase $purchase) => $purchase->saldo), 2),
                'low_stock_count' => Product::whereColumn('stock', '<=', 'stock_minimo')->count(),
                'total_products' => Product::count(),
                // Valor total del inventario (stock * costo unitario)
                'inventory_value' => (float) Product::query()
                    ->get(['stock', 'precio_compra'])
                    ->sum(function ($product) {
                        $stock = (float) $product->stock;
                        $cost = (float) ($product->precio_compra ?? 0);
                        return $stock * $cost;
                    }),
                'total_customers' => Customer::count(),
                'recent_sales' => Invoice::with(['seller', 'customer'])
                    ->latest()
                    ->take(5)
                    ->get()
                    ->map(function($invoice) {
                        // Normalizar fecha a ISO8601 para evitar ambigüedades de zona horaria en frontend
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
                    }),
                'sales_history' => $salesHistory
            ]
        ]);
    }
}
