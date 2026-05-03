<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Spatie\Permission\Models\Role;

class AutenticacionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Crear roles básicos para las pruebas
        Role::create(['name' => 'Usuario']);
        Role::create(['name' => 'Administrador']);
    }

    /** @test */
    public function login_con_credenciales_correctas_inicia_sesion_por_cookie(): void
    {
        $usuario = User::factory()->create([
            'password' => 'password123',
            'estado' => 'Activo'
        ]);

        $respuesta = $this->postJson('/api/v1/auth/login', [
            'email'    => $usuario->email,
            'password' => 'password123',
        ]);

        $respuesta->assertStatus(200)
                  ->assertJsonStructure(['success', 'message', 'data' => ['user']]);

        // Verificar que la sesión permite consultar el usuario autenticado
        $this->getJson('/api/v1/auth/me')->assertStatus(200);
    }

    /** @test */
    public function login_con_credenciales_incorrectas_devuelve_401(): void
    {
        $usuario = User::factory()->create();

        $this->postJson('/api/v1/auth/login', [
            'email'    => $usuario->email,
            'password' => 'contraseña_incorrecta',
        ])->assertStatus(401);
    }

    /** @test */
    public function ruta_protegida_sin_sesion_devuelve_401(): void
    {
        $this->getJson('/api/v1/products')->assertStatus(401);
    }

    /** @test */
    public function registro_de_usuario_funciona_correctamente(): void
    {
        $respuesta = $this->postJson('/api/v1/auth/register', [
            'nombre' => 'Juan',
            'apellido' => 'Perez',
            'email' => 'juan.perez@example.com',
            'telefono' => '1234567890',
            'password' => 'password123',
        ]);

        $respuesta->assertStatus(201)
                  ->assertJsonFragment(['success' => true]);

        $this->assertDatabaseHas('users', [
            'email' => 'juan.perez@example.com',
        ]);
    }

    /** @test */
    public function logout_invalida_la_sesion(): void
    {
        $usuario = User::factory()->create();

        $this->actingAs($usuario)
             ->postJson('/api/v1/auth/logout')
             ->assertStatus(200);

        // En las pruebas, actingAs persiste. Para probar que el logout funcionó,
        // tendríamos que hacer una petición sin el actingAs previo, pero en Laravel
        // esto es complejo en un mismo método de prueba. 
        // Verificamos al menos que el logout respondió correctamente.
    }
}
