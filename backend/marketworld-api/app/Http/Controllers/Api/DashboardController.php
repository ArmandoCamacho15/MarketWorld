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

        return response()->json([
            'success' => true,
            'data' => [
                'sales_today' => Invoice::whereDate('fecha', $today)->sum('total'),
                'sales_month' => Invoice::whereMonth('fecha', $today->month)->sum('total'),
                'purchases_month' => Purchase::whereMonth('fecha', $today->month)->sum('total'),
                'low_stock_count' => Product::whereRaw('stock <= stock_minimo')->count(),
                'total_products' => Product::count(),
                'total_customers' => Customer::count(),
                'recent_sales' => Invoice::with(['seller'])->latest()->take(5)->get(),
                'recent_purchases' => Purchase::latest()->take(5)->get()
            ]
        ]);
    }
}
