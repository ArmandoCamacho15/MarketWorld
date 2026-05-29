<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ManualAdjustmentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'Administrador']);
        Role::firstOrCreate(['name' => 'Bodeguero']);
        Role::firstOrCreate(['name' => 'Vendedor']);
    }

    #[Test]
    public function bodeguero_puede_registrar_ajuste_manual_sin_cambiar_costo_promedio(): void
    {
        $usuario = User::factory()->create();
        $usuario->assignRole('Bodeguero');

        $producto = Product::factory()->create([
            'stock' => 10,
            'precio_compra' => 250,
        ]);

        $respuesta = $this->actingAs($usuario)->postJson('/api/v1/inventory-movements', [
            'product_id' => $producto->id,
            'tipo' => 'Entrada',
            'cantidad' => 10,
            'motivo' => 'Ajuste físico de inventario',
        ]);

        $respuesta->assertStatus(201)
            ->assertJsonPath('data.tipo', 'Entrada');

        $productoActualizado = $producto->fresh();

        $this->assertSame(20, $productoActualizado->stock);
        $this->assertSame('250.00', (string) $productoActualizado->precio_compra);
    }

    #[Test]
    public function vendedor_no_puede_registrar_ajuste_manual(): void
    {
        $usuario = User::factory()->create();
        $usuario->assignRole('Vendedor');

        $producto = Product::factory()->create([
            'stock' => 10,
            'precio_compra' => 250,
        ]);

        $this->actingAs($usuario)->postJson('/api/v1/inventory-movements', [
            'product_id' => $producto->id,
            'tipo' => 'Entrada',
            'cantidad' => 10,
            'motivo' => 'Intento no autorizado',
        ])->assertStatus(403);

        $this->assertSame(10, $producto->fresh()->stock);
        $this->assertSame('250.00', (string) $producto->fresh()->precio_compra);
    }
}
