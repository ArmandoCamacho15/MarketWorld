<?php

namespace Tests\Unit;

use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryServiceDbTest extends TestCase
{
    use RefreshDatabase;

    public function test_entrada_por_compra_actualiza_stock_y_crea_movimiento()
    {
        $product = Product::create([
            'sku' => 'P-INV-1',
            'nombre' => 'Prod Inv 1',
            'precio_compra' => 100.00,
            'precio_venta' => 150.00,
            'stock' => 10,
            'stock_minimo' => 0,
        ]);

        $svc = new InventoryService();

        $updated = $svc->entradaPorCompra($product, 5, 120.0, null, 'Purchase', 1);

        $this->assertEquals(15, $updated->stock);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'tipo' => 'Entrada',
            'cantidad' => 5,
        ]);
    }

    public function test_salida_por_venta_disminuye_stock_y_crea_movimiento()
    {
        $product = Product::create([
            'sku' => 'P-INV-2',
            'nombre' => 'Prod Inv 2',
            'precio_compra' => 50.00,
            'precio_venta' => 80.00,
            'stock' => 10,
            'stock_minimo' => 0,
        ]);

        $svc = new InventoryService();

        $updated = $svc->salidaPorVenta($product, 3, null, 'Sale', 2);

        $this->assertEquals(7, $updated->stock);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'tipo' => 'Salida',
            'cantidad' => 3,
        ]);
    }

    public function test_ajuste_manual_entrada_salida_y_ajuste_directo()
    {
        $product = Product::create([
            'sku' => 'P-INV-3',
            'nombre' => 'Prod Inv 3',
            'precio_compra' => 20.00,
            'precio_venta' => 30.00,
            'stock' => 5,
            'stock_minimo' => 0,
        ]);

        $svc = new InventoryService();

        // Ajuste tipo Entrada
        $p1 = $svc->ajusteManual($product, 4, 'Entrada', null, 'Ajuste entrada');
        $this->assertEquals(9, $p1->stock);

        // Ajuste tipo Salida
        $p2 = $svc->ajusteManual($p1, 2, 'Salida', null, 'Ajuste salida');
        $this->assertEquals(7, $p2->stock);

        // Ajuste directo (fijar stock)
        $p3 = $svc->ajusteManual($p2, 3, 'Ajuste', null, 'Fijar a 3');
        $this->assertEquals(3, $p3->stock);

        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'referencia_tipo' => 'Ajuste Manual',
        ]);
    }
}
