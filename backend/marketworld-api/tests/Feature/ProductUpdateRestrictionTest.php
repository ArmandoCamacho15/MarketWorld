<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ProductUpdateRestrictionTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function put_product_ignora_stock_y_precio_compra_en_el_payload(): void
    {
        $usuario = User::factory()->create();
        $producto = Product::factory()->create([
            'nombre' => 'Producto Original',
            'stock' => 7,
            'precio_compra' => 150,
            'precio_venta' => 250,
        ]);

        $respuesta = $this->actingAs($usuario)->putJson('/api/v1/products/' . $producto->id, [
            'nombre' => 'Producto Actualizado',
            'stock' => 999,
            'precio_compra' => 9999,
            'precio_venta' => 300,
        ]);

        $respuesta->assertStatus(200)
            ->assertJsonPath('data.nombre', 'Producto Actualizado');

        $productoActualizado = $producto->fresh();

        $this->assertSame(7, $productoActualizado->stock);
        $this->assertSame('150.00', (string) $productoActualizado->precio_compra);
        $this->assertSame('300.00', (string) $productoActualizado->precio_venta);
    }
}
