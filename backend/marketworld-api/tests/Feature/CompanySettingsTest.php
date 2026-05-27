<?php

namespace Tests\Feature;

use App\Models\CompanySetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CompanySettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'Administrador']);
    }

    #[Test]
    public function un_administrador_puede_guardar_y_recuperar_cpp_decimals_y_logo(): void
    {
        Storage::fake('public');

        $usuario = User::factory()->create();
        $usuario->assignRole('Administrador');

        $respuesta = $this->actingAs($usuario)->post('/api/v1/company-settings', [
            'company_name' => 'MarketWorld SAS',
            'tax_id' => '900.123.456-1',
            'address' => 'Calle 123',
            'phone' => '3001234567',
            'email' => 'admin@marketworld.com',
            'website' => 'https://marketworld.com',
            'currency' => 'COP',
            'cpp_decimals' => 6,
            'logo' => UploadedFile::fake()->create('logo.png', 10, 'image/png'),
        ]);

        $respuesta->assertStatus(200)
            ->assertJsonPath('data.cpp_decimals', 6)
            ->assertJsonPath('data.company_name', 'MarketWorld SAS');

        $this->assertDatabaseHas('company_settings', [
            'company_name' => 'MarketWorld SAS',
            'cpp_decimals' => 6,
        ]);

        $this->actingAs($usuario)
            ->getJson('/api/v1/company-settings')
            ->assertStatus(200)
            ->assertJsonPath('data.cpp_decimals', 6);
    }

    #[Test]
    public function inventory_service_usa_el_valor_configurado_de_decimales(): void
    {
        CompanySetting::create([
            'company_name' => 'MarketWorld SAS',
            'tax_id' => '900.123.456-1',
            'address' => 'Calle 123',
            'phone' => '3001234567',
            'email' => 'admin@marketworld.com',
            'website' => 'https://marketworld.com',
            'currency' => 'COP',
            'cpp_decimals' => 2,
        ]);

        $servicio = new \App\Services\InventoryService();
        $resultado = $servicio->calcularCostoPromedioPonderado(10, 100, 5, 120, 2);

        $this->assertSame(106.67, $resultado);
    }
}