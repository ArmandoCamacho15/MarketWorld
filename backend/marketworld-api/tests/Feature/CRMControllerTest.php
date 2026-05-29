<?php

namespace Tests\Feature;

use App\Models\Campaign;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Opportunity;
use App\Models\Activity;
use App\Models\Reminder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CRMControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_clientes_and_oportunidades_and_campaigns_activities_reminders(): void
    {
        $this->withoutMiddleware();

        $user = User::factory()->create();

        $customer = Customer::create(['nombre' => 'CRM Cliente', 'documento' => 'C1', 'tipo_documento' => 'CC', 'estado' => 'Activo']);

        // Invoice pagada to be counted in withSum
        Invoice::create([
            'fecha' => now()->toDateString(),
            'user_id' => $user->id,
            'total' => 100,
            'subtotal' => 90,
            'impuestos' => 10,
            'estado' => 'Pagada',
            'numero_factura' => 'F-1',
            'metodo_pago' => 'Efectivo',
            'cliente_id' => $customer->id,
        ]);

        $this->actingAs($user)->getJson('/api/v1/crm/clientes')->assertStatus(200);

        // Oportunidad CRUD
        $this->actingAs($user)->postJson('/api/v1/crm/oportunidades', [
            'customer_id' => $customer->id,
            'titulo' => 'Oppo 1',
            'valor_estimado' => 1000,
            'etapa' => 'prospecto',
            'fecha_estimada_cierre' => now()->addDays(10)->toDateString(),
        ])->assertStatus(201);

        $opp = Opportunity::first();
        $this->actingAs($user)->putJson('/api/v1/crm/oportunidades/' . $opp->id, ['etapa' => 'contactado'])->assertStatus(200);
        $this->actingAs($user)->deleteJson('/api/v1/crm/oportunidades/' . $opp->id)->assertStatus(200);

        // Segmentos
        $this->actingAs($user)->postJson('/api/v1/crm/segmentos', ['nombre' => 'Seg A'])->assertStatus(201);

        // Campañas y actividades counters
        $camp = $this->actingAs($user)->postJson('/api/v1/crm/campanas', ['nombre' => 'Camp 1', 'canal' => 'Email', 'fecha_inicio' => now()->toDateString()])->assertStatus(201)->json('data');

        $this->actingAs($user)->postJson('/api/v1/crm/actividades', [
            'titulo' => 'Act 1',
            'tipo' => 'Llamada',
            'fecha_programada' => now()->addDay()->format('Y-m-d H:i:s'),
            'customer_id' => $customer->id,
            'campaign_id' => $camp['id'],
        ])->assertStatus(201);

        $act = Activity::first();
        $this->actingAs($user)->putJson('/api/v1/crm/actividades/' . $act->id, ['estado' => 'Completada'])->assertStatus(200);

        // Recordatorios
        $this->actingAs($user)->postJson('/api/v1/crm/recordatorios', [
            'titulo' => 'Rec 1',
            'tipo' => 'Email',
            'fecha_envio' => now()->addHour()->format('Y-m-d H:i:s'),
            'activity_id' => $act->id,
        ])->assertStatus(201);

        $rem = Reminder::first();
        $this->actingAs($user)->putJson('/api/v1/crm/recordatorios/' . $rem->id . '/leido')->assertStatus(200);
        $this->actingAs($user)->deleteJson('/api/v1/crm/recordatorios/' . $rem->id)->assertStatus(200);
    }
}
