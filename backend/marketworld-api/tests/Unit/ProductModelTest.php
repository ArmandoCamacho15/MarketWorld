<?php

namespace Tests\Unit;

use App\Models\CostAdjustment;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_aplicar_cpp_calcula_y_crea_cost_adjustment(): void
    {
        $user = User::factory()->create();

        $product = Product::create([
            'sku' => 'P-100',
            'nombre' => 'Producto Test',
            'precio_compra' => 100.00,
            'precio_venta' => 150.00,
            'stock' => 10,
            'stock_minimo' => 1,
        ]);

        $product->aplicarCostoPromedioPonderado(5, 120.0, $user->id, 'Compra prueba');

        $product->refresh();

        $this->assertEquals(15, $product->stock);
        $this->assertEqualsWithDelta(106.67, (float) $product->precio_compra, 0.01);

        $this->assertDatabaseHas('cost_adjustments', [
            'product_id' => $product->id,
            'old_cost' => 100.00,
            'new_cost' => 106.67,
        ]);
    }

    public function test_aplicar_cpp_first_purchase_when_stock_zero(): void
    {
        $product = Product::create([
            'sku' => 'P-200',
            'nombre' => 'Producto Nuevo',
            'precio_compra' => 0,
            'precio_venta' => 0,
            'stock' => 0,
            'stock_minimo' => 0,
        ]);

        $product->aplicarCostoPromedioPonderado(20, 80.0);

        $product->refresh();

        $this->assertEquals(20, $product->stock);
        $this->assertEqualsWithDelta(80.00, (float) $product->precio_compra, 0.01);
    }

    public function test_registrar_salida_crea_movement_and_prevents_negative_stock(): void
    {
        $product = Product::create([
            'sku' => 'P-300',
            'nombre' => 'Producto Salida',
            'precio_compra' => 50.00,
            'precio_venta' => 80.00,
            'stock' => 5,
            'stock_minimo' => 0,
        ]);

        $product->registrarSalida(3, null, 'Venta prueba');
        $product->refresh();
        $this->assertEquals(2, $product->stock);

        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'tipo' => 'Salida',
            'cantidad' => 3,
        ]);

        // Registrar salida mayor al stock deja stock en 0
        $product->registrarSalida(10, null, 'Venta mayor');
        $product->refresh();
        $this->assertEquals(0, $product->stock);
    }

    public function test_registrar_entrada_crea_movement(): void
    {
        $product = Product::create([
            'sku' => 'P-400',
            'nombre' => 'Producto Entrada',
            'precio_compra' => 20.00,
            'precio_venta' => 30.00,
            'stock' => 2,
            'stock_minimo' => 0,
        ]);

        $product->registrarEntrada(5, null, 'Devolución');
        $product->refresh();

        $this->assertEquals(7, $product->stock);

        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'tipo' => 'Entrada',
            'cantidad' => 5,
        ]);
    }
}
