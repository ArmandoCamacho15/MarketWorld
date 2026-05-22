<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleManagementController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::query()
            ->with('permissions')
            ->orderBy('name')
            ->get()
            ->map(function (Role $role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'guard_name' => $role->guard_name,
                    'usuarios' => $this->countUsersForRole($role->id),
                    'permissions' => $role->permissions->pluck('name')->values(),
                    'description' => $this->describeRole($role),
                ];
            })
            ->values();

        $permissions = Permission::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Permission $permission) => [
                'id' => $permission->id,
                'name' => $permission->name,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Roles cargados.',
            'data' => [
                'roles' => $roles,
                'permissions' => $permissions,
            ],
            'errors' => null,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:roles,name',
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $role = DB::transaction(function () use ($validated) {
            $role = Role::create([
                'name' => $validated['name'],
                'guard_name' => 'web',
            ]);

            $role->syncPermissions($validated['permissions'] ?? []);

            return $role->load('permissions');
        });

        AuditLogger::record($request, 'role_created', 'Se creó el rol ' . $role->name, [
            'entity_type' => 'role',
            'entity_id' => $role->id,
            'metadata' => [
                'role_name' => $role->name,
                'permissions' => $role->permissions->pluck('name')->values()->all(),
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Rol creado correctamente.',
            'data' => $this->formatRole($role),
            'errors' => null,
        ], 201);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:roles,name,' . $role->id,
            'permissions' => 'array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        if ($role->name === 'Usuario' && $validated['name'] !== 'Usuario') {
            return response()->json([
                'success' => false,
                'message' => 'El rol Usuario no se puede renombrar en esta versión.',
                'data' => null,
                'errors' => null,
            ], 409);
        }

        $beforeName = $role->name;
        $beforePermissions = $role->permissions()->pluck('name')->values()->all();

        $role->update(['name' => $validated['name']]);
        $role->syncPermissions($validated['permissions'] ?? []);
        $role->refresh()->load('permissions');

        AuditLogger::record($request, 'role_updated', 'Se actualizó el rol ' . $role->name, [
            'entity_type' => 'role',
            'entity_id' => $role->id,
            'metadata' => [
                'before' => [
                    'name' => $beforeName,
                    'permissions' => $beforePermissions,
                ],
                'after' => [
                    'name' => $role->name,
                    'permissions' => $role->permissions->pluck('name')->values()->all(),
                ],
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Rol actualizado correctamente.',
            'data' => $this->formatRole($role),
            'errors' => null,
        ]);
    }

    public function destroy(Request $request, Role $role): JsonResponse
    {
        if ($this->countUsersForRole($role->id) > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar un rol asignado a usuarios.',
                'data' => null,
                'errors' => null,
            ], 409);
        }

        $roleName = $role->name;
        $roleId = $role->id;
        $rolePermissions = $role->permissions()->pluck('name')->values()->all();
        $assignedUsers = $this->countUsersForRole($roleId);
        $role->delete();

        AuditLogger::record($request, 'role_deleted', 'Se eliminó el rol ' . $roleName, [
            'entity_type' => 'role',
            'entity_id' => $roleId,
            'metadata' => [
                'role_name' => $roleName,
                'permissions' => $rolePermissions,
                'usuarios_afectados' => $assignedUsers,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Rol eliminado correctamente.',
            'data' => null,
            'errors' => null,
        ]);
    }

    public function permissions(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Permisos cargados.',
            'data' => Permission::query()->orderBy('name')->get(['id', 'name'])->values(),
            'errors' => null,
        ]);
    }

    private function formatRole(Role $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'guard_name' => $role->guard_name,
            'usuarios' => $this->countUsersForRole($role->id),
            'permissions' => $role->permissions->pluck('name')->values(),
            'description' => $this->describeRole($role),
        ];
    }

    private function countUsersForRole(int $roleId): int
    {
        $roleName = Role::query()->whereKey($roleId)->value('name');

        if (!$roleName) {
            return 0;
        }

        return User::query()
            ->with(['roles' => function ($query) {
                $query->orderBy('roles.id');
            }])
            ->get()
            ->filter(function (User $user) use ($roleName) {
                return $user->roles->pluck('name')->first() === $roleName;
            })
            ->count();
    }

    private function describeRole(Role $role): string
    {
        $permissionNames = $role->permissions->pluck('name')->values()->all();

        if (in_array('ver reportes', $permissionNames, true) && in_array('gestionar inventario', $permissionNames, true)) {
            return 'Acceso amplio a operaciones, inventario y reportes.';
        }

        if (in_array('gestionar ventas', $permissionNames, true)) {
            return 'Perfil enfocado en ventas y atención comercial.';
        }

        if (in_array('gestionar compras', $permissionNames, true)) {
            return 'Perfil enfocado en compras y recepción de mercancía.';
        }

        return 'Rol configurado manualmente desde el panel.';
    }
}