<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class UpdatePrecioCompraSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Actualizar precio_compra solo cuando esté NULL o <= 0 y exista precio_venta > 0
        $updated = DB::table('products')
            ->where(function($q) {
                $q->whereNull('precio_compra')->orWhere('precio_compra', '<=', 0);
            })
            ->where('precio_venta', '>', 0)
            ->update(['precio_compra' => DB::raw('ROUND(precio_venta * 0.6, 2)')]);

        if ($this->command) {
            $this->command->info("UpdatePrecioCompraSeeder: productos actualizados = {$updated}");
        }
    }
}
