<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RolePermissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'Administrador']);
        Role::firstOrCreate(['name' => 'Vendedor']);
    }

    #[Test]
    public function vendedor_no_puede_acceder_a_reportes(): void
    {
        $usuario = User::factory()->create();
        $usuario->assignRole('Vendedor');

        $this->actingAs($usuario)
            ->getJson('/api/v1/reports/ventas')
            ->assertStatus(403);
    }

    #[Test]
    public function administrador_puede_acceder_a_endpoints_protegidos(): void
    {
        $usuario = User::factory()->create();
        $usuario->assignRole('Administrador');

        $this->actingAs($usuario)
            ->getJson('/api/v1/reports/ventas')
            ->assertStatus(200);

        $this->actingAs($usuario)
            ->getJson('/api/v1/admin/users')
            ->assertStatus(200);
    }

    #[Test]
    public function usuario_no_autenticado_recibe_401_en_ruta_protegida(): void
    {
        $this->getJson('/api/v1/reports/ventas')->assertStatus(401);
    }
}
