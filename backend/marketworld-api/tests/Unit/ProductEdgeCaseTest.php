<?php

namespace Tests\Unit;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductEdgeCaseTest extends TestCase
{
    use RefreshDatabase;

    public function test_aplicar_cpp_no_cambia_cuando_nuevo_stock_cero()
    {
        $product = Product::create([
            'sku' => 'P-EDGE-1',
            'nombre' => 'Prod Edge',
            'precio_compra' => 0,
            'precio_venta' => 0,
            'stock' => 0,
            'stock_minimo' => 0,
        ]);

        $result = $product->aplicarCostoPromedioPonderado(0, 100.0);

        $this->assertEquals(0, $result->stock);
        $this->assertEquals(0.0, (float) $result->precio_compra);
    }
}
