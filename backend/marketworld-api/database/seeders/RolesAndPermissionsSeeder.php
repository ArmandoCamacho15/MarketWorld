<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Limpiar caché de roles y permisos
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Crear permisos básicos
        Permission::create(['name' => 'ver reportes']);
        Permission::create(['name' => 'gestionar compras']);
        Permission::create(['name' => 'gestionar ventas']);
        Permission::create(['name' => 'gestionar inventario']);

        // Crear roles y asignar permisos
        
        // Administrador: Todo
        $role = Role::create(['name' => 'Administrador']);
        $role->givePermissionTo(Permission::all());

        // Vendedor: Solo ventas y ver inventario
        $role = Role::create(['name' => 'Vendedor']);
        $role->givePermissionTo(['gestionar ventas', 'gestionar inventario']);

        // Bodeguero: Solo inventario y compras
        $role = Role::create(['name' => 'Bodeguero']);
        $role->givePermissionTo(['gestionar inventario', 'gestionar compras']);
    }
}