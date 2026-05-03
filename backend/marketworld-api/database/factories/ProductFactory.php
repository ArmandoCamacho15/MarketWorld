<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'sku' => $this->faker->unique()->bothify('SKU-####'),
            'nombre' => $this->faker->words(3, true),
            'descripcion' => $this->faker->sentence(),
            'categoria' => 'General',
            'precio_compra' => $this->faker->randomFloat(2, 1000, 10000),
            'precio_venta' => $this->faker->randomFloat(2, 15000, 50000),
            'stock' => $this->faker->numberBetween(10, 100),
            'stock_minimo' => 5,
            'iva' => 19.00,
            'unidad' => 'Und',
            'proveedor' => 'Proveedor Local',
            'estado' => 'Activo',
        ];
    }
}
