<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Category;
use App\Models\Invoice;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ControllersCoverageTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_index_store_update_show_destroy_and_category_crud_and_journal_export_tipos(): void
    {
        $this->withoutMiddleware();

        $user = User::factory()->create();

        // Accounts: store
        $this->actingAs($user)->postJson('/api/v1/accounts', ['codigo' => '100', 'nombre' => 'Caja', 'tipo' => 'Activo'])->assertStatus(201);
        $this->actingAs($user)->getJson('/api/v1/accounts?tipo=Activo')->assertStatus(200);
        $this->actingAs($user)->getJson('/api/v1/accounts?activo=1')->assertStatus(200);
        $this->actingAs($user)->getJson('/api/v1/accounts?search=Caja')->assertStatus(200);

        $acc = Account::first();
        $this->actingAs($user)->getJson('/api/v1/accounts/' . $acc->id)->assertStatus(200);
        $this->actingAs($user)->putJson('/api/v1/accounts/' . $acc->id, ['nombre' => 'Caja Chica'])->assertStatus(200);
        $this->actingAs($user)->deleteJson('/api/v1/accounts/' . $acc->id)->assertStatus(200);

        // Categories CRUD and destroy blocked by product
        $this->actingAs($user)->postJson('/api/v1/categories', ['nombre' => 'Cat A'])->assertStatus(201);
        $this->actingAs($user)->getJson('/api/v1/categories')->assertStatus(200);
        $cat = Category::first();
        $this->actingAs($user)->putJson('/api/v1/categories/' . $cat->id, ['descripcion' => 'Desc'])->assertStatus(200);

        // Create product tied to category nombre to block deletion
        Product::create(['sku' => 'P1', 'nombre' => 'Prod1', 'categoria' => $cat->nombre, 'precio_compra' => 10, 'precio_venta' => 15, 'stock' => 5]);
        $this->actingAs($user)->deleteJson('/api/v1/categories/' . $cat->id)->assertStatus(422);

        // Remove product and delete category
        Product::query()->delete();
        $this->actingAs($user)->deleteJson('/api/v1/categories/' . $cat->id)->assertStatus(200);

        // JournalEntry export tipos branches (Manual vs Automático)
        $this->seed(\Database\Seeders\AccountingSeeder::class);
        $accnt = Account::first();

        // referencia_tipo null (should be treated as Manual in some filters)
        $e1 = JournalEntry::create(['fecha' => now()->toDateString(), 'glosa' => 'E1', 'user_id' => $user->id, 'referencia_tipo' => null]);
        JournalItem::create(['journal_entry_id' => $e1->id, 'account_id' => $accnt->id, 'debe' => 10, 'haber' => 0]);
        JournalItem::create(['journal_entry_id' => $e1->id, 'account_id' => $accnt->id, 'debe' => 0, 'haber' => 10]);

        // referencia_tipo manual
        $e2 = JournalEntry::create(['fecha' => now()->toDateString(), 'glosa' => 'E2', 'user_id' => $user->id, 'referencia_tipo' => 'Manual']);
        JournalItem::create(['journal_entry_id' => $e2->id, 'account_id' => $accnt->id, 'debe' => 5, 'haber' => 0]);
        JournalItem::create(['journal_entry_id' => $e2->id, 'account_id' => $accnt->id, 'debe' => 0, 'haber' => 5]);

        // referencia_tipo automatica
        $e3 = JournalEntry::create(['fecha' => now()->toDateString(), 'glosa' => 'E3', 'user_id' => $user->id, 'referencia_tipo' => 'Auto']);
        JournalItem::create(['journal_entry_id' => $e3->id, 'account_id' => $accnt->id, 'debe' => 7, 'haber' => 0]);
        JournalItem::create(['journal_entry_id' => $e3->id, 'account_id' => $accnt->id, 'debe' => 0, 'haber' => 7]);

        $this->actingAs($user)->get('/api/v1/journal-entries/export?tipo=Manual')->assertStatus(200)->assertHeaderContains('Content-Disposition', 'libro_diario_');
        $this->actingAs($user)->get('/api/v1/journal-entries/export?tipo=Automático')->assertStatus(200)->assertHeaderContains('Content-Disposition', 'libro_diario_');
    }
}
