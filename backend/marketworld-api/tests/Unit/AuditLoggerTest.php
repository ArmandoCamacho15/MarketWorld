<?php

namespace Tests\Unit;

use App\Models\AuditLog;
use App\Services\AuditLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLoggerTest extends TestCase
{
    use RefreshDatabase;

    public function test_record_creates_audit_log_with_null_request(): void
    {
        AuditLogger::record(null, 'test_action', 'Testing audit logger', ['entity_type' => 'test', 'entity_id' => 1]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'test_action',
            'entity_type' => 'test',
            'entity_id' => 1,
        ]);
    }

    public function test_record_creates_audit_log_with_request_and_user()
    {
        $user = \App\Models\User::factory()->create();
        $request = \Illuminate\Http\Request::create('/', 'GET', [], [], [], ['HTTP_USER_AGENT' => 'PHPUnitAgent']);
        $request->setUserResolver(fn() => $user);

        AuditLogger::record($request, 'test_action_2', 'Testing with request', ['entity_type' => 'test2', 'entity_id' => 2]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'test_action_2',
            'entity_type' => 'test2',
            'entity_id' => 2,
        ]);
    }
}
