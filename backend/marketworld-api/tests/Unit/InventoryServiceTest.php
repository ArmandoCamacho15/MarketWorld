<?php

namespace Tests\Unit;

use App\Models\CompanySetting;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\User;
use App\Services\InventoryService;
use InvalidArgumentException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class InventoryServiceTest extends TestCase
{
    use RefreshDatabase;

    private InventoryService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new InventoryService();
        CompanySetting::create([
            'company_name' => 'MarketWorld Test',
            'tax_id' => '900123456-7',
            'email' => 'test@marketworld.test',
            'cpp_decimals' => 4,
        ]);
    }

    #[Test]
    public function calcula_cpp_con_redondeo_a_dos_y_cuatro_decimales(): void
    {
        $cppDosDecimales = $this->service->calcularCostoPromedioPonderado(10, 100, 5, 120, 2);
        $cppCuatroDecimales = $this->service->calcularCostoPromedioPonderado(10, 100, 5, 120, 4);

        $this->assertSame(106.67, $cppDosDecimales);
        $this->assertSame(106.6667, $cppCuatroDecimales);
    }

    #[Test]
    public function calcula_cpp_con_stock_cero_en_primera_compra(): void
    {
        $cpp = $this->service->calcularCostoPromedioPonderado(0, 0, 20, 80, 2);

        $this->assertSame(80.0, $cpp);
    }

    #[Test]
    public function lanza_excepcion_si_la_cantidad_es_cero(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->service->calcularCostoPromedioPonderado(10, 100, 0, 120, 2);
    }

    #[Test]
    public function lanza_excepcion_si_la_cantidad_es_negativa(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->service->calcularCostoPromedioPonderado(10, 100, -5, 120, 2);
    }

    #[Test]
    public function aplica_redondeo_simetrico_con_medios_centavos(): void
    {
        $cpp = $this->service->calcularCostoPromedioPonderado(1, 1, 1, 2, 0);

        $this->assertSame(2.0, $cpp);
    }

    #[Test]
    public function entrada_por_compra_actualiza_stock_costo_y_crea_movimiento(): void
    {
        $usuario = User::factory()->create();
        $producto = Product::factory()->create([
            'stock' => 10,
            'precio_compra' => 100,
        ]);

        $actualizado = $this->service->entradaPorCompra($producto, 5, 120, $usuario->id, 'Purchase', 15);

        $this->assertSame(15, $actualizado->stock);
        $this->assertSame('106.67', (string) $actualizado->fresh()->precio_compra);

        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $producto->id,
            'user_id' => $usuario->id,
            'tipo' => 'Entrada',
            'cantidad' => 5,
            'stock_anterior' => 10,
            'stock_nuevo' => 15,
            'referencia_tipo' => 'Purchase',
            'referencia_id' => 15,
        ]);
    }

    #[Test]
    public function salida_por_venta_reduce_stock_y_crea_movimiento(): void
    {
        $usuario = User::factory()->create();
        $producto = Product::factory()->create([
            'stock' => 8,
            'precio_compra' => 250,
        ]);

        $actualizado = $this->service->salidaPorVenta($producto, 3, $usuario->id, 'Invoice', 27, 'Venta Factura #FAC-27');

        $this->assertSame(5, $actualizado->stock);

        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $producto->id,
            'user_id' => $usuario->id,
            'tipo' => 'Salida',
            'cantidad' => 3,
            'stock_anterior' => 8,
            'stock_nuevo' => 5,
            'motivo' => 'Venta Factura #FAC-27',
            'referencia_tipo' => 'Invoice',
            'referencia_id' => 27,
        ]);
    }

    #[Test]
    public function ajuste_manual_permite_entrada_salida_y_ajuste(): void
    {
        $usuario = User::factory()->create();
        $productoEntrada = Product::factory()->create(['stock' => 10]);
        $productoSalida = Product::factory()->create(['stock' => 10]);
        $productoAjuste = Product::factory()->create(['stock' => 14]);

        $this->service->ajusteManual($productoEntrada, 4, 'Entrada', $usuario->id, 'Conteo físico');
        $this->service->ajusteManual($productoSalida, 4, 'Salida', $usuario->id, 'Merma controlada');
        $this->service->ajusteManual($productoAjuste, 10, 'Ajuste', $usuario->id, 'Recuento final');

        $this->assertSame(14, $productoEntrada->fresh()->stock);
        $this->assertSame(6, $productoSalida->fresh()->stock);
        $this->assertSame(10, $productoAjuste->fresh()->stock);

        $this->assertSame(3, InventoryMovement::query()->count());
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $productoAjuste->id,
            'tipo' => 'Ajuste',
            'cantidad' => 4,
            'stock_anterior' => 14,
            'stock_nuevo' => 10,
        ]);
    }

    #[Test]
    public function rechaza_cantidades_invalidas_y_tipo_de_movimiento_invalido(): void
    {
        $usuario = User::factory()->create();
        $producto = Product::factory()->create();

        $this->expectException(InvalidArgumentException::class);

        $this->service->ajusteManual($producto, 1, 'Transferencia', $usuario->id, 'Tipo no permitido');
    }

    #[Test]
    public function salida_por_venta_rechaza_stock_insuficiente(): void
    {
        $usuario = User::factory()->create();
        $producto = Product::factory()->create(['stock' => 2]);

        $this->expectException(InvalidArgumentException::class);

        $this->service->salidaPorVenta($producto, 5, $usuario->id, 'Invoice', 99, 'Salida inválida');
    }
}
