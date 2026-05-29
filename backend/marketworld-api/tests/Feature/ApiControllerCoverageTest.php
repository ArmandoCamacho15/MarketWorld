<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Category;
use App\Models\CompanySetting;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\PurchasePayment;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\AccountingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ApiControllerCoverageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AccountingSeeder::class);

        Role::firstOrCreate(['name' => 'Administrador']);
        Role::firstOrCreate(['name' => 'Bodeguero']);
        Role::firstOrCreate(['name' => 'Vendedor']);

        CompanySetting::create([
            'company_name' => 'MarketWorld ERP',
            'tax_id' => '900123456-7',
            'email' => 'erp@marketworld.test',
            'cpp_decimals' => 4,
        ]);
    }

    #[Test]
    public function productos_cubren_filtros_busqueda_stock_bajo_y_pantallas_basicas(): void
    {
        $user = User::factory()->create();
        $category = Category::create(['nombre' => 'Tecnología', 'descripcion' => 'Categoría de prueba']);

        $match = Product::factory()->create([
            'sku' => 'SKU-MATCH',
            'nombre' => 'Widget Pro',
            'categoria' => $category->nombre,
            'stock' => 2,
            'stock_minimo' => 5,
            'precio_compra' => 100,
            'precio_venta' => 180,
        ]);

        Product::factory()->create([
            'sku' => 'SKU-OTHER',
            'nombre' => 'Otro Producto',
            'categoria' => 'Hogar',
            'stock' => 10,
            'stock_minimo' => 1,
        ]);

        $index = $this->actingAs($user)->getJson('/api/v1/products?categoria_id=' . $category->id . '&estado=Activo&search=Widget&stock_bajo=1&per_page=5');

        $index->assertStatus(200)
            ->assertJsonPath('data.0.id', $match->id)
            ->assertJsonPath('meta.total', 1);

        $this->actingAs($user)->getJson('/api/v1/products/stock-bajo')
            ->assertStatus(200)
            ->assertJsonPath('total', 1);

        $this->actingAs($user)->getJson('/api/v1/products/valuation')
            ->assertStatus(200)
            ->assertJsonPath('total', 2);

        $this->actingAs($user)->getJson('/api/v1/products/' . $match->id)
            ->assertStatus(200)
            ->assertJsonPath('data.nombre', 'Widget Pro');

        $this->actingAs($user)->getJson('/api/v1/products/999999')
            ->assertStatus(404);

        $store = $this->actingAs($user)->postJson('/api/v1/products', [
            'codigo' => 'SKU-FE-01',
            'nombre' => 'Producto Frontend',
            'descripcion' => 'Alta cobertura',
            'categoria' => 'Tecnología',
            'precio' => 250,
            'stockActual' => 7,
            'stockMinimo' => 3,
            'iva' => 19,
            'unidad' => 'Und',
            'proveedor' => 'Proveedor X',
        ]);

        $store->assertStatus(201)
            ->assertJsonPath('data.sku', 'SKU-FE-01')
            ->assertJsonPath('data.precio_venta', '250.00');
    }

    #[Test]
    public function productos_no_se_eliminan_si_tienen_compras_o_facturas_asociadas(): void
    {
        $user = User::factory()->create();
        $user->assignRole('Administrador');

        $customer = Customer::factory()->create(['estado' => 'Activo']);
        $supplier = Supplier::factory()->create(['estado' => 'Activo']);
        $product = Product::factory()->create([
            'stock' => 10,
            'precio_compra' => 100,
            'precio_venta' => 180,
        ]);

        $purchase = Purchase::create([
            'numero_orden' => 'OC-DEST-01',
            'supplier_id' => $supplier->id,
            'fecha' => now()->toDateString(),
            'total' => 100,
            'estado' => 'Pendiente',
            'estado_pago' => 'pendiente',
            'user_id' => $user->id,
        ]);

        PurchaseItem::create([
            'purchase_id' => $purchase->id,
            'product_id' => $product->id,
            'cantidad' => 1,
            'precio_unitario' => 100,
            'costo_unitario' => 100,
            'subtotal' => 100,
        ]);

        $invoice = Invoice::create([
            'numero_factura' => 'F-DEST-01',
            'customer_id' => $customer->id,
            'fecha' => now()->toDateString(),
            'subtotal' => 180,
            'impuestos' => 34.2,
            'descuento' => 0,
            'total' => 214.2,
            'metodo_pago' => 'Contado',
            'estado' => 'Pagada',
            'user_id' => $user->id,
        ]);

        $invoice->items()->create([
            'product_id' => $product->id,
            'cantidad' => 1,
            'precio_unitario' => 180,
            'descuento' => 0,
            'subtotal' => 180,
        ]);

        $respuesta = $this->actingAs($user)->deleteJson('/api/v1/products/' . $product->id);

        $respuesta->assertStatus(409)
            ->assertJsonPath('errors.product_id.0', 'El producto está relacionado con una o más compras')
            ->assertJsonPath('errors.product_id.1', 'El producto está relacionado con una o más facturas');
    }

    #[Test]
    public function movimientos_de_inventario_cubren_listado_filtros_y_validaciones(): void
    {
        $user = User::factory()->create();
        $user->assignRole('Bodeguero');

        $productA = Product::factory()->create(['stock' => 10]);
        $productB = Product::factory()->create(['stock' => 2]);

        $this->actingAs($user)->postJson('/api/v1/inventory-movements', [
            'product_id' => $productA->id,
            'tipo' => 'Entrada',
            'cantidad' => 4,
            'motivo' => 'Conteo físico',
        ])->assertStatus(201);

        $this->actingAs($user)->postJson('/api/v1/inventory-movements', [
            'product_id' => $productA->id,
            'tipo' => 'Salida',
            'cantidad' => 3,
            'motivo' => 'Merma controlada',
        ])->assertStatus(201);

        $this->actingAs($user)->postJson('/api/v1/inventory-movements', [
            'product_id' => $productB->id,
            'tipo' => 'Salida',
            'cantidad' => 99,
            'motivo' => 'Stock insuficiente',
        ])->assertStatus(422);

        $this->actingAs($user)->postJson('/api/v1/inventory-movements', [
            'product_id' => $productB->id,
            'tipo' => 'Transferencia',
            'cantidad' => 1,
            'motivo' => 'Tipo inválido',
        ])->assertStatus(422);

        $response = $this->actingAs($user)->getJson('/api/v1/inventory-movements?tipo=Entrada&product_id=' . $productA->id . '&fecha_desde=' . now()->toDateString() . '&fecha_hasta=' . now()->toDateString());

        $response->assertStatus(200)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.tipo', 'Entrada');
    }

    #[Test]
    public function compras_cubren_index_show_update_y_pagos_con_conflictos(): void
    {
        $user = User::factory()->create();
        $user->assignRole('Administrador');

        $supplier = Supplier::factory()->create(['estado' => 'Activo']);
        $product = Product::factory()->create(['stock' => 5, 'precio_compra' => 100]);

        $creada = $this->actingAs($user)->postJson('/api/v1/purchases', [
            'numero_orden' => 'OC-CTRL-01',
            'supplier_id' => $supplier->id,
            'fecha' => now()->toDateString(),
            'estado' => 'Pendiente',
            'items' => [
                ['product_id' => $product->id, 'cantidad' => 2, 'precio_unitario' => 120],
            ],
        ]);

        $creada->assertStatus(201);
        $purchaseId = $creada->json('data.id');

        $this->actingAs($user)->getJson('/api/v1/purchases?estado=Pendiente&supplier_id=' . $supplier->id . '&search=OC-CTRL-01')
            ->assertStatus(200)
            ->assertJsonPath('data.0.numero_orden', 'OC-CTRL-01');

        $this->actingAs($user)->getJson('/api/v1/purchases/' . $purchaseId)
            ->assertStatus(200)
            ->assertJsonPath('data.numero_orden', 'OC-CTRL-01');

        $this->actingAs($user)->getJson('/api/v1/purchases/999999')
            ->assertStatus(404);

        $update = $this->actingAs($user)->putJson('/api/v1/purchases/' . $purchaseId, [
            'estado' => 'Recibida',
        ]);

        $update->assertStatus(200)
            ->assertJsonPath('data.estado', 'Recibida');

        $this->assertSame(7, $product->fresh()->stock);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'tipo' => 'Entrada',
            'cantidad' => 2,
            'stock_anterior' => 5,
            'stock_nuevo' => 7,
            'referencia_tipo' => 'Purchase',
            'referencia_id' => $purchaseId,
        ]);

        $this->actingAs($user)->putJson('/api/v1/purchases/' . $purchaseId, [
            'estado' => 'Cancelada',
        ])->assertStatus(409);

        $cancelada = $this->actingAs($user)->postJson('/api/v1/purchases', [
            'numero_orden' => 'OC-CTRL-02',
            'supplier_id' => $supplier->id,
            'fecha' => now()->toDateString(),
            'estado' => 'Cancelada',
            'items' => [
                ['product_id' => $product->id, 'cantidad' => 1, 'precio_unitario' => 120],
            ],
        ]);

        $cancelada->assertStatus(201);
        $canceladaId = $cancelada->json('data.id');

        $this->actingAs($user)->postJson('/api/v1/purchases/' . $canceladaId . '/payments', [
            'monto' => 10,
            'metodo_pago' => 'Efectivo',
            'fecha_pago' => now()->toDateString(),
        ])->assertStatus(409);

        $this->actingAs($user)->postJson('/api/v1/purchases/' . $purchaseId . '/payments', [
            'monto' => 9999,
            'metodo_pago' => 'Efectivo',
            'fecha_pago' => now()->toDateString(),
        ])->assertStatus(422);
    }

    #[Test]
    public function facturas_cubren_indice_busqueda_show_y_anulacion_repetida(): void
    {
        $user = User::factory()->create();
        $user->assignRole('Administrador');

        $customer = Customer::factory()->create(['estado' => 'Activo']);
        $product = Product::factory()->create([
            'stock' => 10,
            'precio_compra' => 100,
            'precio_venta' => 180,
        ]);

        $creada = $this->actingAs($user)->postJson('/api/v1/invoices', [
            'numero_factura' => 'FAC-CTRL-01',
            'customer_id' => $customer->id,
            'fecha' => now()->toDateString(),
            'metodo_pago' => 'Contado',
            'items' => [
                ['product_id' => $product->id, 'cantidad' => 2],
            ],
        ]);

        $creada->assertStatus(201);
        $invoiceId = $creada->json('data.id');

        $this->actingAs($user)->getJson('/api/v1/invoices?estado=Pagada&customer_id=' . $customer->id . '&search=FAC-CTRL-01')
            ->assertStatus(200)
            ->assertJsonPath('data.0.numero_factura', 'FAC-CTRL-01');

        $this->actingAs($user)->getJson('/api/v1/invoices/' . $invoiceId)
            ->assertStatus(200)
            ->assertJsonPath('data.numero_factura', 'FAC-CTRL-01');

        $this->actingAs($user)->getJson('/api/v1/invoices/999999')
            ->assertStatus(404);

        $anulada = $this->actingAs($user)->putJson('/api/v1/invoices/' . $invoiceId, [
            'estado' => 'Anulada',
            'motivo_anulacion' => 'Cliente cambió el pedido por error de referencia',
        ]);

        $anulada->assertStatus(200)
            ->assertJsonPath('data.estado', 'Anulada');

        $this->assertSame(10, $product->fresh()->stock);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'tipo' => 'Entrada',
            'cantidad' => 2,
            'stock_anterior' => 8,
            'stock_nuevo' => 10,
        ]);

        $this->actingAs($user)->putJson('/api/v1/invoices/' . $invoiceId, [
            'estado' => 'Anulada',
            'motivo_anulacion' => 'Segundo intento de anulación',
        ])->assertStatus(409);
    }

    #[Test]
    public function reportes_cubren_rutas_legacy_y_analiticas_reales(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Administrador');

        $customer = Customer::factory()->create();
        $supplier = Supplier::factory()->create();

        Product::create([
            'sku' => 'REP-001',
            'nombre' => 'Producto Reporte',
            'categoria' => 'Reporte',
            'precio_compra' => 100,
            'precio_venta' => 180,
            'stock' => 4,
            'stock_minimo' => 10,
            'iva' => 19,
            'unidad' => 'Und',
            'estado' => 'Activo',
        ]);

        Invoice::create([
            'numero_factura' => 'REP-INV-01',
            'customer_id' => $customer->id,
            'fecha' => now()->toDateString(),
            'subtotal' => 180,
            'impuestos' => 34.2,
            'descuento' => 0,
            'total' => 214.2,
            'metodo_pago' => 'Contado',
            'estado' => 'Pagada',
            'user_id' => $admin->id,
        ]);

        $purchase = Purchase::create([
            'numero_orden' => 'REP-OC-01',
            'supplier_id' => $supplier->id,
            'fecha' => now()->toDateString(),
            'total' => 500,
            'estado' => 'Recibida',
            'estado_pago' => 'parcial',
            'user_id' => $admin->id,
        ]);

        PurchasePayment::create([
            'purchase_id' => $purchase->id,
            'supplier_id' => $supplier->id,
            'user_id' => $admin->id,
            'monto' => 200,
            'metodo_pago' => 'Transferencia',
            'tipo' => 'Abono',
            'fecha_pago' => now()->toDateString(),
        ]);

        $this->actingAs($admin)->getJson('/api/v1/reports/sales-summary')
            ->assertStatus(200)
            ->assertJsonPath('data.0.total', 214.2);

        $this->actingAs($admin)->getJson('/api/v1/reports/inventory-utility')
            ->assertStatus(200)
            ->assertJsonPath('data.0.potential_profit', 320);

        $this->actingAs($admin)->getJson('/api/v1/reports/inventario')
            ->assertStatus(200)
            ->assertJsonPath('data.total_valorizacion', 400)
            ->assertJsonPath('data.productos_stock_bajo', 1);

        $this->actingAs($admin)->getJson('/api/v1/reports/financiero?desde=' . now()->toDateString() . '&hasta=' . now()->toDateString())
            ->assertStatus(200)
            ->assertJsonPath('data.ingresos_ventas', 180)
            ->assertJsonPath('data.gastos_compras', 500)
            ->assertJsonPath('data.cuentas_por_pagar', 300)
            ->assertJsonPath('data.utilidad_bruta', -320);

        $this->actingAs($admin)->getJson('/api/v1/reports/tax-summary?desde=' . now()->toDateString() . '&hasta=' . now()->toDateString())
            ->assertStatus(200)
            ->assertJsonPath('data.totales.total_facturado', 214.2);

        $this->actingAs($admin)->getJson('/api/v1/reports/dian-draft?desde=' . now()->toDateString() . '&hasta=' . now()->toDateString())
            ->assertStatus(200)
            ->assertJsonPath('data.company.name', 'MarketWorld ERP')
            ->assertJsonPath('data.status', 'draft');
    }
}
