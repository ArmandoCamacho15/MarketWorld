<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Purchase;
use App\Models\Product;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function salesSummary()
    {
        $sales = Invoice::selectRaw('DATE(fecha) as date, SUM(total) as total')
            ->groupBy('date')
            ->orderBy('date', 'desc')
            ->take(30)
            ->get();

        return response()->json(['success' => true, 'data' => $sales]);
    }

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

        return response()->json(['success' => true, 'data' => $utility]);
    }
}
