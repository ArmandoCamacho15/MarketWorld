<?php

namespace Tests\Unit;

use App\Services\InventoryService;
use InvalidArgumentException;
use Tests\TestCase;

class InventoryServiceUnitTest extends TestCase
{
    public function test_calcular_throws_on_non_positive_cantidad()
    {
        $svc = new InventoryService();

        $this->expectException(InvalidArgumentException::class);
        $svc->calcularCostoPromedioPonderado(10.0, 5.0, 0.0, 2.0);
    }

    public function test_calcular_returns_precio_when_stock_actual_zero()
    {
        $svc = new InventoryService();

        $res = $svc->calcularCostoPromedioPonderado(0.0, 0.0, 10.0, 12.3456, 4);

        $this->assertEqualsWithDelta(12.3456, $res, 0.0001);
    }

    public function test_calcular_returns_weighted_cost()
    {
        $svc = new InventoryService();

        $res = $svc->calcularCostoPromedioPonderado(10.0, 100.0, 5.0, 120.0, 2);

        $this->assertEqualsWithDelta(106.67, $res, 0.01);
    }
}
