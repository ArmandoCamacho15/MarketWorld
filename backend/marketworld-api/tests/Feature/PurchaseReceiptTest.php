<?php

namespace Tests\Feature;

use App\Models\CompanySetting;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\AccountingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PurchaseReceiptTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccountingSeeder::class);
        Role::firstOrCreate(['name' => 'Administrador']);
        Role::firstOrCreate(['name' => 'Bodeguero']);
        CompanySetting::create([
            'company_name' => 'MarketWorld ERP',
            'tax_id' => '900000000-1',
            'email' => 'admin@marketworld.test',
            'cpp_decimals' => 4,
        ]);
    }

    #[Test]
    public function recepcion_de_compra_actualiza_stock_y_crea_movimiento_entrada(): void
    {
        $usuario = User::factory()->create();
        $usuario->assignRole('Administrador');

        $proveedor = Supplier::factory()->create(['estado' => 'Activo']);
        $producto = Product::factory()->create([
            'stock' => 0,
            'precio_compra' => 100,
        ]);

        $compra = $this->actingAs($usuario)->postJson('/api/v1/purchases', [
            'numero_orden' => 'ORD-REC-001',
            'supplier_id' => $proveedor->id,
            'fecha' => now()->toDateString(),
            'estado' => 'Pendiente',
            'items' => [
                [
                    'product_id' => $producto->id,
                    'cantidad' => 5,
                    'precio_unitario' => 120,
                ],
            ],
        ]);

        $compra->assertStatus(201);

        $purchaseId = $compra->json('data.id');

        $recepcion = $this->actingAs($usuario)->putJson('/api/v1/purchases/' . $purchaseId, [
            'estado' => 'Recibida',
        ]);

        $recepcion->assertStatus(200)
            ->assertJsonPath('data.estado', 'Recibida');

        $productoActualizado = $producto->fresh();

        $this->assertSame(5, $productoActualizado->stock);
        $this->assertSame('120.00', (string) $productoActualizado->precio_compra);

        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $producto->id,
            'tipo' => 'Entrada',
            'cantidad' => 5,
            'stock_anterior' => 0,
            'stock_nuevo' => 5,
            'referencia_tipo' => 'Purchase',
            'referencia_id' => $purchaseId,
        ]);
    }

    #[Test]
    public function segunda_compra_recalcula_cpp_correctamente(): void
    {
        $usuario = User::factory()->create();
        $usuario->assignRole('Administrador');

        $proveedor = Supplier::factory()->create(['estado' => 'Activo']);
        $producto = Product::factory()->create([
            'stock' => 0,
            'precio_compra' => 100,
        ]);

        $primeraCompra = $this->actingAs($usuario)->postJson('/api/v1/purchases', [
            'numero_orden' => 'ORD-REC-002',
            'supplier_id' => $proveedor->id,
            'fecha' => now()->toDateString(),
            'estado' => 'Pendiente',
            'items' => [
                [
                    'product_id' => $producto->id,
                    'cantidad' => 5,
                    'precio_unitario' => 120,
                ],
            ],
        ])->assertStatus(201);

        $this->actingAs($usuario)->putJson('/api/v1/purchases/' . $primeraCompra->json('data.id'), [
            'estado' => 'Recibida',
        ])->assertStatus(200);

        $segundaCompra = $this->actingAs($usuario)->postJson('/api/v1/purchases', [
            'numero_orden' => 'ORD-REC-003',
            'supplier_id' => $proveedor->id,
            'fecha' => now()->toDateString(),
            'estado' => 'Pendiente',
            'items' => [
                [
                    'product_id' => $producto->id,
                    'cantidad' => 5,
                    'precio_unitario' => 80,
                ],
            ],
        ])->assertStatus(201);

        $this->actingAs($usuario)->putJson('/api/v1/purchases/' . $segundaCompra->json('data.id'), [
            'estado' => 'Recibida',
        ])->assertStatus(200);

        $productoActualizado = $producto->fresh();

        $this->assertSame(10, $productoActualizado->stock);
        $this->assertSame('100.00', (string) $productoActualizado->precio_compra);
        $this->assertDatabaseCount('inventory_movements', 2);
    }
}
