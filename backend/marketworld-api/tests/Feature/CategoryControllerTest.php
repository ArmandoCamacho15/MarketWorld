<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_category_crud_and_delete_blocked_by_products(): void
    {
        $this->withoutMiddleware();

        $user = User::factory()->create();

        $resp = $this->actingAs($user)->postJson('/api/v1/categories', [
            'nombre' => 'Categoria X',
            'descripcion' => 'Desc',
        ]);

        $resp->assertStatus(201)->assertJsonPath('data.nombre', 'Categoria X');
        $id = $resp->json('data.id');

        $this->actingAs($user)->getJson('/api/v1/categories/' . $id)->assertStatus(200);

        // Create product linked to category to block deletion
        $product = Product::create(['sku' => 'C-1', 'nombre' => 'P', 'precio_venta' => 10, 'precio_compra' => 5, 'stock' => 1, 'stock_minimo' => 0, 'categoria' => 'Categoria X']);

        $this->actingAs($user)->deleteJson('/api/v1/categories/' . $id)->assertStatus(422);

        // Remove product and delete category
        $product->delete();
        $this->actingAs($user)->deleteJson('/api/v1/categories/' . $id)->assertStatus(200);
    }
}
