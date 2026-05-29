<?php

namespace Tests\Unit;

use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryServiceReflectionTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_cpp_decimals_via_reflection_returns_int()
    {
        $svc = new InventoryService();

        $ref = new \ReflectionClass($svc);
        $m = $ref->getMethod('getCppDecimals');
        $m->setAccessible(true);

        $dec = $m->invoke($svc);

        $this->assertIsInt($dec);
        $this->assertGreaterThanOrEqual(0, $dec);
        $this->assertLessThanOrEqual(6, $dec);
    }
}
