<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminUsersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::create(['name' => 'Administrador']);
        Role::create(['name' => 'Vendedor']);
    }

    #[Test]
    public function administrador_puede_crear_actualizar_y_desactivar_un_usuario_con_rol(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('Administrador');

        $createResponse = $this->actingAs($admin)->postJson('/api/v1/admin/users', [
            'nombre' => 'Laura',
            'apellido' => 'Gomez',
            'telefono' => '3001112222',
            'email' => 'laura.gomez@example.com',
            'password' => 'password123',
            'rol' => 'Vendedor',
            'estado' => 'Activo',
        ]);

        $createResponse->assertStatus(201)
            ->assertJsonPath('data.rol', 'Vendedor')
            ->assertJsonPath('data.estado', 'Activo');

        $userId = $createResponse->json('data.id');

        $this->assertDatabaseHas('model_has_roles', [
            'model_id' => $userId,
        ]);

        $updateResponse = $this->actingAs($admin)->putJson('/api/v1/admin/users/' . $userId, [
            'nombre' => 'Laura',
            'apellido' => 'Perez',
            'rol' => 'Administrador',
            'estado' => 'Activo',
        ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('data.apellido', 'Perez')
            ->assertJsonPath('data.rol', 'Administrador');

        $destroyResponse = $this->actingAs($admin)->deleteJson('/api/v1/admin/users/' . $userId);

        $destroyResponse->assertStatus(200)
            ->assertJsonPath('data.estado', 'Inactivo');

        $this->assertDatabaseHas('users', [
            'id' => $userId,
            'estado' => 'Inactivo',
        ]);
    }
}
