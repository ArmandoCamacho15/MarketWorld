<?php

namespace Tests\Feature;

use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupplierControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_show_update_and_destroy_behaviour(): void
    {
        $this->withoutMiddleware();

        $user = User::factory()->create();

        // Store
        $resp = $this->actingAs($user)->postJson('/api/v1/suppliers', [
            'nombre' => 'Proveedor X',
            'nit_ruc' => 'RUT-12345',
            'email' => 'prov@example.test',
        ]);

        $resp->assertStatus(201)->assertJsonPath('data.nombre', 'Proveedor X');
        $id = $resp->json('data.id');

        // Show
        $this->actingAs($user)->getJson('/api/v1/suppliers/' . $id)
            ->assertStatus(200)->assertJsonPath('data.nit_ruc', 'RUT-12345');

        // Update
        $this->actingAs($user)->putJson('/api/v1/suppliers/' . $id, [
            'nombre' => 'Proveedor Y',
            'nit_ruc' => 'RUT-12345',
        ])->assertStatus(200)->assertJsonPath('data.nombre', 'Proveedor Y');

        // Create a purchase linked to supplier -> deletion should fail
        $purchase = Purchase::create([
            'numero_orden' => 'PO-1',
            'supplier_id' => $id,
            'fecha' => now()->toDateString(),
            'total' => 100,
            'estado' => 'Creada',
            'estado_pago' => 'pendiente',
            'user_id' => $user->id,
        ]);

        $this->actingAs($user)->deleteJson('/api/v1/suppliers/' . $id)
            ->assertStatus(422);

        // Remove purchase then delete supplier
        $purchase->delete();
        $this->actingAs($user)->deleteJson('/api/v1/suppliers/' . $id)
            ->assertStatus(200);

        // Not found cases
        $this->actingAs($user)->getJson('/api/v1/suppliers/999999')->assertStatus(404);
        $this->actingAs($user)->putJson('/api/v1/suppliers/999999', [])->assertStatus(404);
        $this->actingAs($user)->deleteJson('/api/v1/suppliers/999999')->assertStatus(404);

        // Validation error on store
        $this->actingAs($user)->postJson('/api/v1/suppliers', ['nombre' => 'SinNit'])->assertStatus(422);
    }
}
