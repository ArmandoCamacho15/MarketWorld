<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Campaign;
use App\Models\Customer;
use App\Models\Segment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CRMMoreCoverageTest extends TestCase
{
    use RefreshDatabase;

    public function test_segmentos_crud_and_campaigns_activity_counters_and_recordatorios_list(): void
    {
        $this->withoutMiddleware();

        $user = User::factory()->create();

        // Segmentos CRUD
        $this->actingAs($user)->postJson('/api/v1/crm/segmentos', ['nombre' => 'Seg X'])->assertStatus(201);
        $this->actingAs($user)->getJson('/api/v1/crm/segmentos')->assertStatus(200)->assertJson(['success' => true]);

        $seg = Segment::first();
        $this->actingAs($user)->putJson('/api/v1/crm/segmentos/' . $seg->id, ['descripcion' => 'Desc'])->assertStatus(200);
        $this->actingAs($user)->deleteJson('/api/v1/crm/segmentos/' . $seg->id)->assertStatus(200);

        // Campañas list + update
        $camp = Campaign::create(['nombre' => 'C1', 'canal' => 'Email', 'fecha_inicio' => now()->toDateString(), 'user_id' => $user->id]);
        $this->actingAs($user)->getJson('/api/v1/crm/campanas')->assertStatus(200);
        $this->actingAs($user)->putJson('/api/v1/crm/campanas/' . $camp->id, ['contactados' => 5, 'respuestas' => 2])->assertStatus(200);

        // Actividad delete branch: decrement counters
        $camp->contactados = 1;
        $camp->respuestas = 1;
        $camp->save();
        $customer = Customer::create(['nombre' => 'C', 'documento' => 'D1', 'tipo_documento' => 'CC', 'estado' => 'Activo']);
        $act = Activity::create(['titulo' => 'A1', 'tipo' => 'Llamada', 'fecha_programada' => now()->format('Y-m-d H:i:s'), 'customer_id' => $customer->id, 'campaign_id' => $camp->id, 'user_id' => $user->id, 'estado' => 'Completada']);

        $this->actingAs($user)->deleteJson('/api/v1/crm/actividades/' . $act->id)->assertStatus(200);

        // Actividad update branch: original Completada -> new Pendiente should decrement respuestas
        $camp2 = Campaign::create(['nombre' => 'C2', 'canal' => 'SMS', 'fecha_inicio' => now()->toDateString(), 'user_id' => $user->id, 'contactados' => 0, 'respuestas' => 1]);
        $act2 = Activity::create(['titulo' => 'A2', 'tipo' => 'Email', 'fecha_programada' => now()->format('Y-m-d H:i:s'), 'customer_id' => $customer->id, 'campaign_id' => $camp2->id, 'user_id' => $user->id, 'estado' => 'Completada']);

        $this->actingAs($user)->putJson('/api/v1/crm/actividades/' . $act2->id, ['estado' => 'Pendiente'])->assertStatus(200);

        // Recordatorios listing
        $this->actingAs($user)->getJson('/api/v1/crm/recordatorios')->assertStatus(200);
    }
}
