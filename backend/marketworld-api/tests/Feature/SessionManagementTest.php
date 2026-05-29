<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SessionManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_and_destroy_and_revoke_others(): void
    {
        $this->withoutMiddleware();

        $user = User::factory()->create();

        // Insert a session row
        $sessionId = 'sess-1';
        DB::table('sessions')->insert([
            'id' => $sessionId,
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit',
            'payload' => '{}',
            'last_activity' => time(),
        ]);

        $this->actingAs($user)->getJson('/api/v1/admin/sessions')->assertStatus(200)->assertJsonCount(1, 'data');

        $this->actingAs($user)->deleteJson('/api/v1/admin/sessions/' . $sessionId)->assertStatus(200);

        // Revoke others (no other sessions) should still return 200
        $this->actingAs($user)->postJson('/api/v1/admin/sessions/revoke-others')->assertStatus(200);
    }
}
