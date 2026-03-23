<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('suppliers')->updateOrInsert(
            ['nit_ruc' => '900111222'],
            [
                'nombre' => 'Proveedor Demo',
                'telefono' => '300100200',
                'email' => 'proveedor@demo.com',
                'direccion' => 'Calle Demo 123',
                'estado' => 'Activo',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
