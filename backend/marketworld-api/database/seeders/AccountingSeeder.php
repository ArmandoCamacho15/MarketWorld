<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

use App\Models\Account;

class AccountingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $accounts = [
            ['codigo' => '1105', 'nombre' => 'Caja General', 'tipo' => 'Activo'],
            ['codigo' => '1110', 'nombre' => 'Bancos', 'tipo' => 'Activo'],
            ['codigo' => '1305', 'nombre' => 'Clientes', 'tipo' => 'Activo'],
            ['codigo' => '1435', 'nombre' => 'Mercancías no fabricadas por la empresa', 'tipo' => 'Activo'],
            ['codigo' => '2205', 'nombre' => 'Proveedores Nacionales', 'tipo' => 'Pasivo'],
            ['codigo' => '2408', 'nombre' => 'Impuesto sobre las ventas por pagar (IVA)', 'tipo' => 'Pasivo'],
            ['codigo' => '4135', 'nombre' => 'Comercio al por mayor y al por menor', 'tipo' => 'Ingreso'],
            ['codigo' => '6135', 'nombre' => 'Costo de Ventas', 'tipo' => 'Gasto'],
        ];

        foreach ($accounts as $account) {
            Account::updateOrCreate(['codigo' => $account['codigo']], $account);
        }
    }
}
