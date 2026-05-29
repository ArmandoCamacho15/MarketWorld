<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountEdgeCasesTest extends TestCase
{
    use RefreshDatabase;

    public function test_not_found_and_validation_errors(): void
    {
        $this->withoutMiddleware();

        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/api/v1/accounts/999999')->assertStatus(404);
        $this->actingAs($user)->putJson('/api/v1/accounts/999999', [])->assertStatus(404);
        $this->actingAs($user)->deleteJson('/api/v1/accounts/999999')->assertStatus(404);

        // validation error: missing required fields
        $this->actingAs($user)->postJson('/api/v1/accounts', ['nombre' => 'NoCodigo'])->assertStatus(422);
    }
}
