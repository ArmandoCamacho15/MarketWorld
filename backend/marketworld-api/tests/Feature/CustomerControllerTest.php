<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_filters_and_pagination_and_crud_show(): void
    {
        $this->withoutMiddleware();

        $user = User::factory()->create();

        Customer::create(['nombre' => 'Ana', 'documento' => 'D1', 'tipo_documento' => 'CC', 'ciudad' => 'Quito', 'segmento' => 'Nuevo', 'tipo_cliente' => 'Persona Natural', 'estado' => 'Activo']);
        Customer::create(['nombre' => 'Bruno', 'documento' => 'D2', 'tipo_documento' => 'NIT', 'ciudad' => 'Cali', 'segmento' => 'Frecuente', 'tipo_cliente' => 'Empresa', 'estado' => 'Inactivo']);

        // No filters
        $this->actingAs($user)->getJson('/api/v1/customers')->assertStatus(200)->assertJsonCount(2, 'data');

        // Filter by ciudad
        $this->actingAs($user)->getJson('/api/v1/customers?ciudad=Quito')->assertStatus(200)->assertJsonCount(1, 'data');

        // Search
        $this->actingAs($user)->getJson('/api/v1/customers?search=Bruno')->assertStatus(200)->assertJsonCount(1, 'data');

        // Show not found
        $this->actingAs($user)->getJson('/api/v1/customers/9999')->assertStatus(404);
    }
}
