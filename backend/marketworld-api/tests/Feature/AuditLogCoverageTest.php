<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AuditLogCoverageTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function audit_logs_index_filters_and_format(): void
    {
        $this->withoutMiddleware();

        $user = User::factory()->create(['name' => 'Alice']);
        $other = User::factory()->create(['name' => 'Bob']);

        AuditLog::create([
            'action' => 'user_created',
            'description' => 'Created user Alice',
            'entity_type' => 'user',
            'entity_id' => $user->id,
            'user_id' => $other->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit',
        ]);

        AuditLog::create([
            'action' => 'login',
            'description' => 'User logged in',
            'entity_type' => 'session',
            'entity_id' => null,
            'user_id' => $user->id,
            'ip_address' => '127.0.0.2',
            'user_agent' => 'phpunit',
        ]);

        // No filter: returns both (admin audit route)
        $this->actingAs($user)->getJson('/api/v1/admin/audit-logs')->assertStatus(200)->assertJsonCount(2, 'data');

        // Filter by action
        $this->actingAs($user)->getJson('/api/v1/admin/audit-logs?action=login')->assertStatus(200)->assertJsonCount(1, 'data');

        // Filter by user name
        $this->actingAs($user)->getJson('/api/v1/admin/audit-logs?user=Bob')->assertStatus(200)->assertJsonCount(1, 'data');

        // Date range (from future) should return zero
        $future = now()->addDays(10)->toDateString();
        $this->actingAs($user)->getJson('/api/v1/admin/audit-logs?from=' . $future)->assertStatus(200)->assertJsonCount(0, 'data');
    }
}
