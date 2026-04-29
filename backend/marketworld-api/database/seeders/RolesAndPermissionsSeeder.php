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
        $verReportes = Permission::firstOrCreate(['name' => 'ver reportes']);
        $gestionarCompras = Permission::firstOrCreate(['name' => 'gestionar compras']);
        $gestionarVentas = Permission::firstOrCreate(['name' => 'gestionar ventas']);
        $gestionarInventario = Permission::firstOrCreate(['name' => 'gestionar inventario']);

        // Crear roles y asignar permisos
        
        // Administrador: Todo
        $role = Role::firstOrCreate(['name' => 'Administrador']);
        $role->syncPermissions(Permission::all());

        // Vendedor: Solo ventas y ver inventario
        $role = Role::firstOrCreate(['name' => 'Vendedor']);
        $role->syncPermissions([$gestionarVentas, $gestionarInventario]);

        // Bodeguero: Solo inventario y compras
        $role = Role::firstOrCreate(['name' => 'Bodeguero']);
        $role->syncPermissions([$gestionarInventario, $gestionarCompras]);

        // Usuario: sin permisos especiales
        Role::firstOrCreate(['name' => 'Usuario']);
    }
}