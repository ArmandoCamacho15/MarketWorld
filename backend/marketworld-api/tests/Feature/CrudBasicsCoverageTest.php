<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Supplier;
use App\Models\User;
use Database\Seeders\AccountingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class CrudBasicsCoverageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccountingSeeder::class);
    }

    #[Test]
    public function customer_crud_basic(): void
    {
        $user = User::factory()->create();

        $store = $this->actingAs($user)->postJson('/api/v1/customers', [
            'nombre' => 'Cliente Test',
            'documento' => 'C-1000',
            'tipo_documento' => 'CC',
        ]);

        $store->assertStatus(201)->assertJsonPath('data.nombre', 'Cliente Test');

        $id = $store->json('data.id');

        $this->actingAs($user)->getJson('/api/v1/customers/' . $id)
            ->assertStatus(200)
            ->assertJsonPath('data.id', $id);

        $this->actingAs($user)->putJson('/api/v1/customers/' . $id, ['nombre' => 'Cliente Editado'])
            ->assertStatus(200)
            ->assertJsonPath('data.nombre', 'Cliente Editado');

        $this->actingAs($user)->deleteJson('/api/v1/customers/' . $id)
            ->assertStatus(200);
    }

    #[Test]
    public function supplier_and_category_crud_basic(): void
    {
        $user = User::factory()->create();
        $this->withoutMiddleware();

        $supplier = $this->actingAs($user)->postJson('/api/v1/suppliers', [
            'nombre' => 'Sup Test',
            'nit_ruc' => '900111222-1'
        ])->assertStatus(201)->json('data');

        $this->actingAs($user)->getJson('/api/v1/suppliers/' . $supplier['id'])
            ->assertStatus(200)->assertJsonPath('data.nombre', 'Sup Test');

        $category = $this->actingAs($user)->postJson('/api/v1/categories', [
            'nombre' => 'Cat Test'
        ])->assertStatus(201)->json('data');

        $this->actingAs($user)->getJson('/api/v1/categories/' . $category['id'])
            ->assertStatus(200)->assertJsonPath('data.nombre', 'Cat Test');

        $this->actingAs($user)->deleteJson('/api/v1/categories/' . $category['id'])
            ->assertStatus(200);
    }

    #[Test]
    public function journal_entry_crud_and_export_fallbacks(): void
    {
        $user = User::factory()->create();
        $this->withoutMiddleware();

        $account = Account::first();
        $this->actingAs($user)->postJson('/api/v1/journal-entries', [
            'fecha' => now()->toDateString(),
            'glosa' => 'Asiento Test',
            'items' => [
                ['account_id' => $account->id, 'debe' => 100, 'haber' => 0],
                ['account_id' => $account->id, 'debe' => 0, 'haber' => 100],
            ]
        ])->assertStatus(201);

        $this->actingAs($user)->getJson('/api/v1/journal-entries')
            ->assertStatus(200);

        // export CSV uses streamDownload; assert route returns OK (200 or stream)
        $this->actingAs($user)->get('/api/v1/journal-entries/export')->assertStatus(200);
    }
}
