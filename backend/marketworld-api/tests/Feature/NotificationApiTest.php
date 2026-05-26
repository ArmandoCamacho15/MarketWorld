<?php

namespace Tests\Feature;

use App\Models\SystemNotification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function un_usuario_autenticado_puede_listar_sus_notificaciones(): void
    {
        $usuario = User::factory()->create();

        SystemNotification::create([
            'user_id' => $usuario->id,
            'tipo' => 'danger',
            'titulo' => 'Stock bajo',
            'mensaje' => 'Producto con stock bajo',
            'enlace' => 'inventario.html',
            'leida' => false,
        ]);

        $respuesta = $this->actingAs($usuario)->getJson('/api/v1/notifications');

        $respuesta->assertStatus(200)
            ->assertJsonFragment(['titulo' => 'Stock bajo'])
            ->assertJsonPath('meta.unread_count', 1);
    }

    #[Test]
    public function un_usuario_puede_crear_y_marcar_una_notificacion_como_leida(): void
    {
        $usuario = User::factory()->create();

        $creada = $this->actingAs($usuario)->postJson('/api/v1/notifications', [
            'tipo' => 'info',
            'titulo' => 'Aviso',
            'mensaje' => 'Mensaje de prueba',
            'enlace' => 'dashboard.html',
        ]);

        $creada->assertStatus(201)
            ->assertJsonFragment(['titulo' => 'Aviso']);

        $notificationId = $creada->json('data.id');

        $this->actingAs($usuario)
            ->postJson('/api/v1/notifications/' . $notificationId . '/mark-read')
            ->assertStatus(200)
            ->assertJsonPath('data.leida', true);
    }

    #[Test]
    public function un_usuario_puede_eliminar_todas_las_notificaciones_leidas(): void
    {
        $usuario = User::factory()->create();

        SystemNotification::create([
            'user_id' => $usuario->id,
            'tipo' => 'info',
            'titulo' => 'Leída',
            'mensaje' => 'Ya fue leída',
            'leida' => true,
        ]);

        $this->actingAs($usuario)
            ->deleteJson('/api/v1/notifications/read')
            ->assertStatus(200);

        $this->assertDatabaseCount('system_notifications', 0);
    }
}
