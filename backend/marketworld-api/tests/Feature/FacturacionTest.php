<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Product;
use App\Models\Customer;
use App\Models\Account;
use App\Models\InventoryMovement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Database\Seeders\AccountingSeeder;
use Spatie\Permission\Models\Role;

class FacturacionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Inicializar datos contables y roles
        $this->seed(AccountingSeeder::class);
        Role::create(['name' => 'Administrador']);
        Role::create(['name' => 'Usuario']);
    }

    #[Test]
    public function crear_factura_descuenta_stock_del_producto(): void
    {
        $usuario  = User::factory()->create();
        $usuario->assignRole('Administrador');

        $cliente  = Customer::factory()->create(['estado' => 'Activo']);
        $producto = Product::factory()->create([
            'stock' => 10,
            'precio_venta' => 50000,
            'precio_compra' => 30000
        ]);

        $stockAntes = $producto->stock;

        $respuesta = $this->actingAs($usuario)->postJson('/api/v1/invoices', [
            'numero_factura' => 'FAC-001',
            'customer_id'    => $cliente->id,
            'fecha'          => now()->format('Y-m-d'),
            'metodo_pago'    => 'Contado',
            'items' => [
                ['product_id' => $producto->id, 'cantidad' => 3],
            ],
        ]);

        $respuesta->assertStatus(201);

        // Verificar que el stock bajó exactamente en la cantidad facturada
        $this->assertEquals($stockAntes - 3, $producto->fresh()->stock);

        // Verificar que se creó el asiento contable
        $this->assertDatabaseHas('journal_entries', [
            'referencia_tipo' => 'Invoice',
            'referencia_id' => $respuesta->json('data.id')
        ]);
    }

    #[Test]
    public function factura_con_stock_insuficiente_devuelve_409(): void
    {
        $usuario  = User::factory()->create();
        $cliente  = Customer::factory()->create(['estado' => 'Activo']);
        $producto = Product::factory()->create(['stock' => 2]);

        $this->actingAs($usuario)->postJson('/api/v1/invoices', [
            'numero_factura' => 'FAC-002',
            'customer_id'    => $cliente->id,
            'fecha'          => now()->format('Y-m-d'),
            'metodo_pago'    => 'Contado',
            'items' => [['product_id' => $producto->id, 'cantidad' => 999]],
        ])->assertStatus(409);

        // Verificar que el stock NO cambió
        $this->assertEquals(2, $producto->fresh()->stock);
    }

    #[Test]
    public function no_se_puede_facturar_a_cliente_inactivo(): void
    {
        $usuario  = User::factory()->create();
        $cliente  = Customer::factory()->create(['estado' => 'Inactivo']);
        $producto = Product::factory()->create(['stock' => 10]);

        $this->actingAs($usuario)->postJson('/api/v1/invoices', [
            'numero_factura' => 'FAC-003',
            'customer_id'    => $cliente->id,
            'fecha'          => now()->format('Y-m-d'),
            'metodo_pago'    => 'Contado',
            'items' => [['product_id' => $producto->id, 'cantidad' => 1]],
        ])->assertStatus(422);
    }

    #[Test]
    public function anular_factura_restituye_stock_y_crea_movimiento_de_entrada(): void
    {
        $usuario  = User::factory()->create();
        $usuario->assignRole('Administrador');

        $cliente  = Customer::factory()->create(['estado' => 'Activo']);
        $producto = Product::factory()->create([
            'stock' => 10,
            'precio_venta' => 50000,
            'precio_compra' => 30000,
        ]);

        $respuesta = $this->actingAs($usuario)->postJson('/api/v1/invoices', [
            'numero_factura' => 'FAC-004',
            'customer_id'    => $cliente->id,
            'fecha'          => now()->format('Y-m-d'),
            'metodo_pago'    => 'Contado',
            'items' => [
                ['product_id' => $producto->id, 'cantidad' => 3],
            ],
        ]);

        $respuesta->assertStatus(201);

        $invoiceId = $respuesta->json('data.id');
        $stockAntesDeAnular = $producto->fresh()->stock;

        $anulacion = $this->actingAs($usuario)->putJson('/api/v1/invoices/' . $invoiceId, [
            'estado' => 'Anulada',
            'motivo_anulacion' => 'Cliente devolvió la compra por error de pedido',
        ]);

        $anulacion->assertStatus(200)
            ->assertJsonPath('data.estado', 'Anulada');

        $productoActualizado = $producto->fresh();

        $this->assertEquals(10, $productoActualizado->stock);
        $this->assertEquals('30000.00', (string) $productoActualizado->precio_compra);

        $this->assertEquals(1, InventoryMovement::query()->where('product_id', $producto->id)->where('tipo', 'Entrada')->count());

        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $producto->id,
            'tipo' => 'Entrada',
            'cantidad' => 3,
            'stock_anterior' => $stockAntesDeAnular,
            'stock_nuevo' => 10,
        ]);
    }
}
