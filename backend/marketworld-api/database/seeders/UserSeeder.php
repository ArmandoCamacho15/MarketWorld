<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => 'admin@marketworld.com'],
            [
                'name' => 'Admin MarketWorld',
                'password' => Hash::make('admin123'),
                'api_token' => null,
            ]
        );

        // Asignar rol Administrador si existe (evita errores si no se han seeded roles)
        try {
            if (class_exists('\\Spatie\\Permission\\Models\\Role') && \Spatie\Permission\Models\Role::where('name', 'Administrador')->exists()) {
                $user->assignRole('Administrador');
            }
        } catch (\Exception $e) {
            // No detener el seeder por falta de roles; se puede ejecutar RolesAndPermissionsSeeder antes.
        }
    }
}
