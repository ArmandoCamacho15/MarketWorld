<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Spatie\Permission\Models\Role;

class InventarioTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'Administrador']);
        Role::create(['name' => 'Usuario']);
    }

    #[Test]
    public function un_administrador_puede_crear_un_producto(): void
    {
        $usuario = User::factory()->create();
        $usuario->assignRole('Administrador');

        $respuesta = $this->actingAs($usuario)->postJson('/api/v1/products', [
            'sku' => 'SKU-001',
            'nombre' => 'Producto de Prueba',
            'precio_venta' => 1000,
            'stock' => 50,
            'stock_minimo' => 5
        ]);

        $respuesta->assertStatus(201)
                  ->assertJsonFragment(['nombre' => 'Producto de Prueba']);

        $this->assertDatabaseHas('products', ['sku' => 'SKU-001']);
    }

    #[Test]
    public function se_pueden_listar_productos_con_stock_bajo(): void
    {
        $usuario = User::factory()->create();
        
        // Producto con stock bajo
        Product::factory()->create(['stock' => 2, 'stock_minimo' => 5, 'estado' => 'Activo']);
        // Producto con stock normal
        Product::factory()->create(['stock' => 20, 'stock_minimo' => 5, 'estado' => 'Activo']);

        $respuesta = $this->actingAs($usuario)->getJson('/api/v1/products/stock-bajo');

        $respuesta->assertStatus(200);
        $this->assertCount(1, $respuesta->json('data'));
    }

    #[Test]
    public function la_valorizacion_del_inventario_es_correcta(): void
    {
        $usuario = User::factory()->create();
        
        Product::factory()->create([
            'precio_compra' => 100, 
            'stock' => 10,
            'estado' => 'Activo'
        ]);

        $respuesta = $this->actingAs($usuario)->getJson('/api/v1/products/valuation');

        $respuesta->assertStatus(200);
        $this->assertEquals(1000, $respuesta->json('data.0.valuation'));
    }
}
