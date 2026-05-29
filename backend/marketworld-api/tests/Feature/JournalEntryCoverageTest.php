<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class JournalEntryCoverageTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function create_balanced_and_unbalanced_entries_and_exports(): void
    {
        $this->withoutMiddleware();

        $this->seed(\Database\Seeders\AccountingSeeder::class);
        $user = User::factory()->create();
        $account = Account::first();

        // Balanced entry
        $resp = $this->actingAs($user)->postJson('/api/v1/journal-entries', [
            'fecha' => now()->toDateString(),
            'glosa' => 'Asiento balanceado',
            'items' => [
                ['account_id' => $account->id, 'debe' => 50, 'haber' => 0],
                ['account_id' => $account->id, 'debe' => 0, 'haber' => 50],
            ],
        ]);

        $resp->assertStatus(201)->assertJsonPath('data.glosa', 'Asiento balanceado');
        $id = $resp->json('data.id');

        // Unbalanced entry
        $this->actingAs($user)->postJson('/api/v1/journal-entries', [
            'fecha' => now()->toDateString(),
            'glosa' => 'Asiento no balanceado',
            'items' => [
                ['account_id' => $account->id, 'debe' => 30, 'haber' => 0],
                ['account_id' => $account->id, 'debe' => 0, 'haber' => 20],
            ],
        ])->assertStatus(422);

        // Update entry with unbalanced items should return 422
        $this->actingAs($user)->putJson('/api/v1/journal-entries/' . $id, [
            'items' => [
                ['account_id' => $account->id, 'debe' => 10, 'haber' => 0],
            ],
        ])->assertStatus(422);

        // Export CSV route
        $this->actingAs($user)->get('/api/v1/journal-entries/export')->assertStatus(200);

        // Export XLSX: aceptar 200 (si está instalado) o 501 (fallback si no)
        $xlsxResp = $this->actingAs($user)->getJson('/api/v1/journal-entries/export-xlsx');
        $this->assertTrue(in_array($xlsxResp->status(), [200, 501]));

        // Destroy
        $this->actingAs($user)->deleteJson('/api/v1/journal-entries/' . $id)->assertStatus(200);
    }
}
