<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JournalEntryControllerCoverageTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_unbalanced_and_show_not_found_and_destroy_and_exports(): void
    {
        $this->withoutMiddleware();

        $user = User::factory()->create();
        $this->seed(\Database\Seeders\AccountingSeeder::class);
        $account = Account::first();

        // Unbalanced store
        $this->actingAs($user)->postJson('/api/v1/journal-entries', [
            'fecha' => now()->toDateString(),
            'glosa' => 'Unbalanced',
            'items' => [
                ['account_id' => $account->id, 'debe' => 10, 'haber' => 0],
                ['account_id' => $account->id, 'debe' => 0, 'haber' => 5],
            ]
        ])->assertStatus(422);

        // show not found
        $this->actingAs($user)->getJson('/api/v1/journal-entries/999999')->assertStatus(404);

        // create balanced entry and destroy
        $entry = JournalEntry::create(['fecha' => now()->toDateString(), 'glosa' => 'ToDelete', 'user_id' => $user->id]);
        JournalItem::create(['journal_entry_id' => $entry->id, 'account_id' => $account->id, 'debe' => 10, 'haber' => 0]);
        JournalItem::create(['journal_entry_id' => $entry->id, 'account_id' => $account->id, 'debe' => 0, 'haber' => 10]);

        $this->actingAs($user)->deleteJson('/api/v1/journal-entries/' . $entry->id)->assertStatus(200);

        // export CSV (streamed; assert headers)
        $this->actingAs($user)->get('/api/v1/journal-entries/export')->assertStatus(200)->assertHeaderContains('Content-Disposition', 'libro_diario_');

        // exportXlsx: accept either 501 (not installed) or 200 (installed)
        $resp = $this->actingAs($user)->getJson('/api/v1/journal-entries/export-xlsx');
        $this->assertTrue(in_array($resp->status(), [200, 501]));
    }
}
