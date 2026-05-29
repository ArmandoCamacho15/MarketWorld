<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Purchase;
use App\Models\PurchasePayment;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ReportesOperativosTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'Administrador']);
    }

    #[Test]
    public function reportes_de_ventas_y_tributario_reflejan_facturas_reales(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Administrador');

        $customer = Customer::factory()->create();

        Invoice::create([
            'numero_factura' => 'F-1001',
            'customer_id' => $customer->id,
            'fecha' => now()->toDateString(),
            'subtotal' => 1000,
            'impuestos' => 190,
            'descuento' => 0,
            'total' => 1190,
            'metodo_pago' => 'Efectivo',
            'estado' => 'Pagada',
            'user_id' => $admin->id,
        ]);

        Invoice::create([
            'numero_factura' => 'F-1002',
            'customer_id' => $customer->id,
            'fecha' => now()->toDateString(),
            'subtotal' => 500,
            'impuestos' => 95,
            'descuento' => 0,
            'total' => 595,
            'metodo_pago' => 'Tarjeta',
            'estado' => 'Pagada',
            'user_id' => $admin->id,
        ]);

        $respuestaVentas = $this->actingAs($admin)->getJson('/api/v1/reports/ventas?desde=' . now()->toDateString() . '&hasta=' . now()->toDateString());

        $respuestaVentas->assertStatus(200)
            ->assertJsonPath('data.total_facturas', 2)
            ->assertJsonPath('data.total_periodo', 1785);

        $respuestaTributario = $this->actingAs($admin)->getJson('/api/v1/reports/tax-summary?desde=' . now()->toDateString() . '&hasta=' . now()->toDateString());

        $respuestaTributario->assertStatus(200)
            ->assertJsonPath('data.totales.cantidad_facturas', 2)
            ->assertJsonPath('data.totales.base_gravable', 1500)
            ->assertJsonPath('data.totales.iva_generado', 285)
            ->assertJsonPath('data.totales.total_facturado', 1785);
    }

    #[Test]
    public function reporte_de_cxp_refleja_saldos_y_el_reporte_de_clientes_lista_clientes_reales(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Administrador');

        $supplier = Supplier::factory()->create();
        $customerA = Customer::factory()->create(['nombre' => 'Cliente Alpha']);
        $customerB = Customer::factory()->create(['nombre' => 'Cliente Beta']);

        $purchaseA = Purchase::create([
            'numero_orden' => 'OC-1001',
            'supplier_id' => $supplier->id,
            'fecha' => now()->toDateString(),
            'total' => 1000,
            'estado' => 'Recibida',
            'estado_pago' => 'parcial',
            'user_id' => $admin->id,
        ]);

        PurchasePayment::create([
            'purchase_id' => $purchaseA->id,
            'supplier_id' => $supplier->id,
            'user_id' => $admin->id,
            'monto' => 400,
            'metodo_pago' => 'Transferencia',
            'tipo' => 'Abono',
            'fecha_pago' => now()->toDateString(),
        ]);

        Purchase::create([
            'numero_orden' => 'OC-1002',
            'supplier_id' => $supplier->id,
            'fecha' => now()->toDateString(),
            'total' => 500,
            'estado' => 'Recibida',
            'estado_pago' => 'pendiente',
            'user_id' => $admin->id,
        ]);

        Invoice::create([
            'numero_factura' => 'F-2001',
            'customer_id' => $customerA->id,
            'fecha' => now()->toDateString(),
            'subtotal' => 300,
            'impuestos' => 57,
            'descuento' => 0,
            'total' => 357,
            'metodo_pago' => 'Efectivo',
            'estado' => 'Pagada',
            'user_id' => $admin->id,
        ]);

        Invoice::create([
            'numero_factura' => 'F-2002',
            'customer_id' => $customerA->id,
            'fecha' => now()->toDateString(),
            'subtotal' => 200,
            'impuestos' => 38,
            'descuento' => 0,
            'total' => 238,
            'metodo_pago' => 'Tarjeta',
            'estado' => 'Pagada',
            'user_id' => $admin->id,
        ]);

        Invoice::create([
            'numero_factura' => 'F-2003',
            'customer_id' => $customerB->id,
            'fecha' => now()->toDateString(),
            'subtotal' => 150,
            'impuestos' => 28.5,
            'descuento' => 0,
            'total' => 178.5,
            'metodo_pago' => 'Transferencia',
            'estado' => 'Pagada',
            'user_id' => $admin->id,
        ]);

        $respuestaCxp = $this->actingAs($admin)->getJson('/api/v1/reports/cxp?desde=' . now()->toDateString() . '&hasta=' . now()->toDateString());

        $respuestaCxp->assertStatus(200)
            ->assertJsonPath('data.resumen.compras', 2)
            ->assertJsonPath('data.resumen.pagado', 400)
            ->assertJsonPath('data.resumen.saldo', 1100)
            ->assertJsonPath('data.resumen.pendientes', 2);

        $respuestaClientes = $this->actingAs($admin)->getJson('/api/v1/reports/clientes?desde=' . now()->toDateString() . '&hasta=' . now()->toDateString());

        $respuestaClientes->assertStatus(200)
            ->assertJsonPath('data.resumen.total_clientes', 2)
            ->assertJsonPath('data.resumen.clientes_activos', 2)
            ->assertJsonPath('data.items.0.nombre', 'Cliente Alpha')
            ->assertJsonPath('data.items.0.valor_periodo', 595);
    }
}
