<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JournalEntryMoreBranchesTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_balanced_and_index_search_and_date_filters(): void
    {
        $this->withoutMiddleware();
        $user = User::factory()->create();
        $this->seed(\Database\Seeders\AccountingSeeder::class);
        $account = Account::first();

        // store balanced via endpoint
        $this->actingAs($user)->postJson('/api/v1/journal-entries', [
            'fecha' => now()->toDateString(),
            'glosa' => 'Prueba store',
            'items' => [
                ['account_id' => $account->id, 'debe' => 30, 'haber' => 0],
                ['account_id' => $account->id, 'debe' => 0, 'haber' => 30],
            ],
        ])->assertStatus(201)->assertJson(['success' => true]);

        // index search
        $this->actingAs($user)->getJson('/api/v1/journal-entries?search=Prueba')->assertStatus(200)->assertJson(['success' => true]);

        // fecha range
        $desde = now()->subDay()->toDateString();
        $hasta = now()->addDay()->toDateString();
        $this->actingAs($user)->getJson('/api/v1/journal-entries?fecha_desde=' . $desde . '&fecha_hasta=' . $hasta)->assertStatus(200);
    }
}
