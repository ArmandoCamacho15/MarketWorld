<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchasePayment;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class DashboardStatsTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function dashboard_stats_reflejan_el_rango_seleccionado_y_documenos_mixtos(): void
    {
        $user = User::factory()->create();

        $customer = Customer::factory()->create();
        $supplier = Supplier::factory()->create(['estado' => 'Activo']);
        $lowStockProduct = Product::factory()->create([
            'stock' => 2,
            'stock_minimo' => 5,
            'precio_compra' => 100,
        ]);

        $today = now()->toDateString();
        $yesterday = now()->subDay()->toDateString();

        $invoiceYesterday = Invoice::create([
            'numero_factura' => 'F-OLD-01',
            'customer_id' => $customer->id,
            'fecha' => $yesterday,
            'subtotal' => 200,
            'impuestos' => 38,
            'descuento' => 0,
            'total' => 238,
            'metodo_pago' => 'Efectivo',
            'estado' => 'Pagada',
            'user_id' => $user->id,
        ]);

        $invoiceToday = Invoice::create([
            'numero_factura' => 'F-TODAY-01',
            'customer_id' => $customer->id,
            'fecha' => $today,
            'subtotal' => 100,
            'impuestos' => 19,
            'descuento' => 0,
            'total' => 119,
            'metodo_pago' => 'Tarjeta',
            'estado' => 'Pagada',
            'user_id' => $user->id,
        ]);

        $purchase = Purchase::create([
            'numero_orden' => 'OC-001',
            'supplier_id' => $supplier->id,
            'fecha' => $today,
            'total' => 500,
            'estado' => 'Recibida',
            'estado_pago' => 'parcial',
            'user_id' => $user->id,
        ]);

        PurchasePayment::create([
            'purchase_id' => $purchase->id,
            'supplier_id' => $supplier->id,
            'user_id' => $user->id,
            'monto' => 200,
            'metodo_pago' => 'Transferencia',
            'tipo' => 'Abono',
            'fecha_pago' => $today,
        ]);

        $movement = InventoryMovement::create([
            'product_id' => $lowStockProduct->id,
            'user_id' => $user->id,
            'tipo' => 'Entrada',
            'cantidad' => 3,
            'stock_anterior' => 0,
            'stock_nuevo' => 3,
            'motivo' => 'Recepción de compra',
            'referencia_tipo' => 'Purchase',
            'referencia_id' => $purchase->id,
        ]);

        DB::table('invoices')->where('id', $invoiceYesterday->id)->update([
            'created_at' => now()->subDay()->subHour(),
            'updated_at' => now()->subDay()->subHour(),
        ]);

        DB::table('invoices')->where('id', $invoiceToday->id)->update([
            'created_at' => now()->subMinutes(5),
            'updated_at' => now()->subMinutes(5),
        ]);

        DB::table('purchases')->where('id', $purchase->id)->update([
            'created_at' => now()->subMinutes(2),
            'updated_at' => now()->subMinutes(2),
        ]);

        DB::table('inventory_movements')->where('id', $movement->id)->update([
            'created_at' => now()->subMinutes(3),
            'updated_at' => now()->subMinutes(3),
        ]);

        $respuestaHoy = $this->actingAs($user)->getJson('/api/v1/dashboard/stats?desde=' . $today . '&hasta=' . $today);

        $respuestaHoy->assertStatus(200)
            ->assertJsonPath('data.periodo.desde', $today)
            ->assertJsonPath('data.periodo.hasta', $today)
            ->assertJsonPath('data.sales_month', 119)
            ->assertJsonPath('data.purchases_month', 500)
            ->assertJsonPath('data.low_stock_count', 1)
            ->assertJsonPath('data.inventory_history.0.label', 'Entrada')
            ->assertJsonPath('data.inventory_history.0.movimientos', 1)
            ->assertJsonPath('data.cxp_history.1.label', 'Parcial')
            ->assertJsonPath('data.cxp_history.1.saldo', 300)
            ->assertJsonPath('data.products_low.0.nombre', $lowStockProduct->nombre)
            ->assertJsonPath('data.recent_transactions.0.document_type', 'purchase');

        $respuestaAyer = $this->actingAs($user)->getJson('/api/v1/dashboard/stats?desde=' . $yesterday . '&hasta=' . $yesterday);

        $respuestaAyer->assertStatus(200)
            ->assertJsonPath('data.sales_month', 238)
            ->assertJsonPath('data.purchases_month', 0)
            ->assertJsonPath('data.periodo.desde', $yesterday)
            ->assertJsonPath('data.periodo.hasta', $yesterday);
    }
}