<?php

namespace Tests\Unit;

use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class InventoryServiceExceptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_entrada_por_compra_lanza_excepcion_para_cantidad_no_positiva()
    {
        $this->expectException(InvalidArgumentException::class);

        $svc = new InventoryService();
        $product = Product::create([
            'sku' => 'P-EX-1',
            'nombre' => 'Prod Ex 1',
            'precio_compra' => 0,
            'precio_venta' => 0,
            'stock' => 0,
            'stock_minimo' => 0,
        ]);

        $svc->entradaPorCompra($product, 0, 10.0, null, 'X', 1);
    }

    public function test_salida_por_venta_lanza_excepcion_para_cantidad_no_positiva()
    {
        $this->expectException(InvalidArgumentException::class);

        $svc = new InventoryService();
        $product = Product::create([
            'sku' => 'P-EX-2',
            'nombre' => 'Prod Ex 2',
            'precio_compra' => 0,
            'precio_venta' => 0,
            'stock' => 0,
            'stock_minimo' => 0,
        ]);

        $svc->salidaPorVenta($product, 0, null, 'X', 1);
    }

    public function test_ajuste_manual_lanza_excepcion_para_cantidad_no_positiva()
    {
        $this->expectException(InvalidArgumentException::class);

        $svc = new InventoryService();
        $product = Product::create([
            'sku' => 'P-EX-3',
            'nombre' => 'Prod Ex 3',
            'precio_compra' => 0,
            'precio_venta' => 0,
            'stock' => 0,
            'stock_minimo' => 0,
        ]);

        $svc->ajusteManual($product, 0, 'Entrada', null, 'motivo');
    }
}
