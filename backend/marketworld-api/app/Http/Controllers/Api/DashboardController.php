<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Customer;
use Illuminate\Http\Request;
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
                ->sum('total');
            
            $salesHistory[] = [
                'label' => $month->translatedFormat('M'),
                'total' => (float)$total
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'sales_today' => Invoice::whereDate('fecha', $today)->sum('total'),
                'sales_month' => Invoice::whereMonth('fecha', $today->month)
                    ->whereYear('fecha', $today->year)
                    ->sum('total'),
                'purchases_month' => Purchase::whereMonth('fecha', $today->month)
                    ->whereYear('fecha', $today->year)
                    ->sum('total'),
                'low_stock_count' => Product::whereRaw('stock <= stock_minimo')->count(),
                'total_products' => Product::count(),
                'total_customers' => Customer::count(),
                'recent_sales' => Invoice::with(['seller', 'customer'])
                    ->latest()
                    ->take(5)
                    ->get()
                    ->map(function($invoice) {
                        return [
                            'id' => $invoice->id,
                            'numero_factura' => $invoice->numero_factura,
                            'fecha' => $invoice->fecha,
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
