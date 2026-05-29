<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JournalEntryFinalPushTest extends TestCase
{
    use RefreshDatabase;

    public function test_show_existing_and_partial_update(): void
    {
        $this->withoutMiddleware();
        $user = User::factory()->create();
        $this->seed(\Database\Seeders\AccountingSeeder::class);
        $account = Account::first();

        // create via endpoint (balanced)
        $resp = $this->actingAs($user)->postJson('/api/v1/journal-entries', [
            'fecha' => now()->toDateString(),
            'glosa' => 'FinalPush',
            'items' => [
                ['account_id' => $account->id, 'debe' => 11, 'haber' => 0],
                ['account_id' => $account->id, 'debe' => 0, 'haber' => 11],
            ],
        ])->assertStatus(201);

        $id = $resp->json('data.id');

        $this->actingAs($user)->getJson('/api/v1/journal-entries/' . $id)->assertStatus(200)->assertJsonPath('data.glosa', 'FinalPush');

        // partial update: only glosa
        $this->actingAs($user)->putJson('/api/v1/journal-entries/' . $id, ['glosa' => 'Updated'])->assertStatus(200)->assertJsonPath('data.glosa', 'Updated');
    }
}
