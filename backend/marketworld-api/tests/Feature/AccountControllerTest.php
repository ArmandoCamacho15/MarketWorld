<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_crud_basic(): void
    {
        $this->withoutMiddleware();

        $user = User::factory()->create();

        $resp = $this->actingAs($user)->postJson('/api/v1/accounts', [
            'codigo' => '9999',
            'nombre' => 'Cuenta Test',
            'tipo' => 'Activo',
        ]);

        $resp->assertStatus(201)->assertJsonPath('data.codigo', '9999');
        $id = $resp->json('data.id');

        $this->actingAs($user)->getJson('/api/v1/accounts/' . $id)->assertStatus(200);

        $this->actingAs($user)->putJson('/api/v1/accounts/' . $id, ['nombre' => 'Cuenta Editada', 'codigo' => '9999'])
            ->assertStatus(200)->assertJsonPath('data.nombre', 'Cuenta Editada');

        $this->actingAs($user)->deleteJson('/api/v1/accounts/' . $id)->assertStatus(200);
    }
}
