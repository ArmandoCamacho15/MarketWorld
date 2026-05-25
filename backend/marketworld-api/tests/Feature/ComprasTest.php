<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Product;
use App\Models\Supplier;
use App\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;
use Database\Seeders\AccountingSeeder;
use Spatie\Permission\Models\Role;

class ComprasTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Inicializar datos contables y roles
        $this->seed(AccountingSeeder::class);
        Role::create(['name' => 'Administrador']);
        Role::create(['name' => 'Bodeguero']);
        Role::create(['name' => 'Usuario']);
    }

    #[Test]
    public function registrar_compra_actualiza_stock_y_costo_promedio(): void
    {
        $usuario = User::factory()->create();
        $usuario->assignRole('Administrador');

        $proveedor = Supplier::factory()->create(['estado' => 'Activo']);
        $producto  = Product::factory()->create([
            'stock' => 10,
            'precio_compra' => 1000, // Costo inicial 1000
        ]);

        $respuesta = $this->actingAs($usuario)->postJson('/api/v1/purchases', [
            'numero_orden' => 'ORD-100',
            'supplier_id'  => $proveedor->id,
            'fecha'        => now()->format('Y-m-d'),
            'estado'       => 'Recibida',
            'items' => [
                [
                    'product_id' => $producto->id,
                    'cantidad' => 10,
                    'precio_unitario' => 2000 // Entran 10 a 2000
                ]
            ]
        ]);

        $respuesta->assertStatus(201);

        $productoActualizado = $producto->fresh();
        
        // Stock debe ser 20 (10 iniciales + 10 nuevos)
        $this->assertEquals(20, $productoActualizado->stock);
        
        // Nuevo costo promedio: (10 * 1000 + 10 * 2000) / 20 = 1500
        $this->assertEquals(1500, (float) $productoActualizado->precio_compra);

        // Verificar que se creó el asiento contable
        $this->assertDatabaseHas('journal_entries', [
            'referencia_tipo' => 'Purchase',
            'referencia_id' => $respuesta->json('data.id')
        ]);
    }

    #[Test]
    public function no_se_puede_comprar_a_proveedor_inactivo(): void
    {
        $usuario = User::factory()->create();
        $usuario->assignRole('Administrador');

        $proveedor = Supplier::factory()->create(['estado' => 'Inactivo']);
        $producto  = Product::factory()->create();

        $this->actingAs($usuario)->postJson('/api/v1/purchases', [
            'numero_orden' => 'ORD-101',
            'supplier_id'  => $proveedor->id,
            'fecha'        => now()->format('Y-m-d'),
            'items' => [
                ['product_id' => $producto->id, 'cantidad' => 1, 'precio_unitario' => 100]
            ]
        ])->assertStatus(422);
    }

    #[Test]
    public function pago_parcial_actualiza_estado_pago_y_saldo_cxp(): void
    {
        $usuario = User::factory()->create();
        $usuario->assignRole('Administrador');

        $proveedor = Supplier::factory()->create(['estado' => 'Activo']);
        $producto  = Product::factory()->create(['stock' => 5, 'precio_compra' => 500]);

        $compra = $this->actingAs($usuario)->postJson('/api/v1/purchases', [
            'numero_orden' => 'ORD-CXP-01',
            'supplier_id'  => $proveedor->id,
            'fecha'        => now()->format('Y-m-d'),
            'estado'       => 'Pendiente',
            'items' => [
                [
                    'product_id' => $producto->id,
                    'cantidad' => 2,
                    'precio_unitario' => 1000,
                ],
            ],
        ]);

        $compra->assertStatus(201);
        $purchaseId = $compra->json('data.id');

        $this->assertDatabaseHas('purchases', [
            'id' => $purchaseId,
            'estado_pago' => 'pendiente',
        ]);

        $pago = $this->actingAs($usuario)->postJson("/api/v1/purchases/{$purchaseId}/payments", [
            'monto' => 1000,
            'metodo_pago' => 'Transferencia',
            'fecha_pago' => now()->format('Y-m-d'),
        ]);

        $pago->assertStatus(201);

        $this->assertDatabaseHas('purchases', [
            'id' => $purchaseId,
            'estado_pago' => 'parcial',
        ]);

        $purchasePayload = $pago->json('data.purchase');
        $this->assertEquals(1000.0, (float) $purchasePayload['saldo']);
    }

    #[Test]
    public function pago_completo_marca_compra_como_pagada_y_cero_saldo(): void
    {
        $usuario = User::factory()->create();
        $usuario->assignRole('Administrador');

        $proveedor = Supplier::factory()->create(['estado' => 'Activo']);
        $producto  = Product::factory()->create(['stock' => 5, 'precio_compra' => 500]);

        $compra = $this->actingAs($usuario)->postJson('/api/v1/purchases', [
            'numero_orden' => 'ORD-CXP-02',
            'supplier_id'  => $proveedor->id,
            'fecha'        => now()->format('Y-m-d'),
            'estado'       => 'Pendiente',
            'items' => [
                [
                    'product_id' => $producto->id,
                    'cantidad' => 1,
                    'precio_unitario' => 500,
                ],
            ],
        ])->assertStatus(201);

        $purchaseId = $compra->json('data.id');

        $this->actingAs($usuario)->postJson("/api/v1/purchases/{$purchaseId}/payments", [
            'monto' => 500,
            'metodo_pago' => 'Efectivo',
            'fecha_pago' => now()->format('Y-m-d'),
        ])->assertStatus(201);

        $this->assertDatabaseHas('purchases', [
            'id' => $purchaseId,
            'estado_pago' => 'pagada',
        ]);
    }

    #[Test]
    public function pago_mayor_al_saldo_devuelve_422(): void
    {
        $usuario = User::factory()->create();
        $usuario->assignRole('Administrador');

        $proveedor = Supplier::factory()->create(['estado' => 'Activo']);
        $producto  = Product::factory()->create();

        $compra = $this->actingAs($usuario)->postJson('/api/v1/purchases', [
            'numero_orden' => 'ORD-CXP-03',
            'supplier_id'  => $proveedor->id,
            'fecha'        => now()->format('Y-m-d'),
            'estado'       => 'Pendiente',
            'items' => [
                ['product_id' => $producto->id, 'cantidad' => 1, 'precio_unitario' => 300],
            ],
        ])->assertStatus(201);

        $purchaseId = $compra->json('data.id');

        $this->actingAs($usuario)->postJson("/api/v1/purchases/{$purchaseId}/payments", [
            'monto' => 9999,
            'metodo_pago' => 'Efectivo',
            'fecha_pago' => now()->format('Y-m-d'),
        ])->assertStatus(422);
    }

    #[Test]
    public function reporte_financiero_refleja_cuentas_por_pagar_tras_pago_parcial(): void
    {
        $usuario = User::factory()->create();
        $usuario->assignRole('Administrador');

        $proveedor = Supplier::factory()->create(['estado' => 'Activo']);
        $producto  = Product::factory()->create();

        $compra = $this->actingAs($usuario)->postJson('/api/v1/purchases', [
            'numero_orden' => 'ORD-CXP-04',
            'supplier_id'  => $proveedor->id,
            'fecha'        => now()->toDateString(),
            'estado'       => 'Pendiente',
            'items' => [
                ['product_id' => $producto->id, 'cantidad' => 1, 'precio_unitario' => 1000],
            ],
        ])->assertStatus(201);

        $purchaseId = $compra->json('data.id');

        $this->actingAs($usuario)->postJson("/api/v1/purchases/{$purchaseId}/payments", [
            'monto' => 400,
            'metodo_pago' => 'Transferencia',
            'fecha_pago' => now()->toDateString(),
        ])->assertStatus(201);

        $desde = now()->startOfMonth()->toDateString();
        $hasta = now()->endOfMonth()->toDateString();

        $reporte = $this->actingAs($usuario)->getJson("/api/v1/reports/financiero?desde={$desde}&hasta={$hasta}");
        $reporte->assertStatus(200);
        $reporte->assertJsonPath('data.cuentas_por_pagar', 600);
    }
}
