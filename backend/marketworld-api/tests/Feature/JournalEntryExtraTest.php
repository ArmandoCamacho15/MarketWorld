<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JournalEntryExtraTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_filters_and_update_balanced(): void
    {
        $this->withoutMiddleware();

        $user = User::factory()->create();
        $this->seed(\Database\Seeders\AccountingSeeder::class);
        $account = Account::first();

        // create two entries with dates
        $entry1 = JournalEntry::create(['fecha' => '2026-01-01', 'glosa' => 'E1', 'user_id' => $user->id]);
        JournalItem::create(['journal_entry_id' => $entry1->id, 'account_id' => $account->id, 'debe' => 10, 'haber' => 0]);
        JournalItem::create(['journal_entry_id' => $entry1->id, 'account_id' => $account->id, 'debe' => 0, 'haber' => 10]);

        $entry2 = JournalEntry::create(['fecha' => now()->toDateString(), 'glosa' => 'E2', 'user_id' => $user->id]);
        JournalItem::create(['journal_entry_id' => $entry2->id, 'account_id' => $account->id, 'debe' => 20, 'haber' => 0]);
        JournalItem::create(['journal_entry_id' => $entry2->id, 'account_id' => $account->id, 'debe' => 0, 'haber' => 20]);

        // Filter by fecha_desde should return entry2 only
        $this->actingAs($user)->getJson('/api/v1/journal-entries?fecha_desde=' . now()->toDateString())
            ->assertStatus(200)->assertJsonCount(1, 'data');

        // Update entry2 with balanced new items
        $this->actingAs($user)->putJson('/api/v1/journal-entries/' . $entry2->id, [
            'items' => [
                ['account_id' => $account->id, 'debe' => 50, 'haber' => 0],
                ['account_id' => $account->id, 'debe' => 0, 'haber' => 50],
            ]
        ])->assertStatus(200);
    }
}
