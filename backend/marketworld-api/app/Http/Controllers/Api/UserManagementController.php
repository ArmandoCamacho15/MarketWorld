<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class UserManagementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->query('per_page', 15), 100));
        $query = User::query()->orderByDesc('id');

        if ($request->filled('estado')) {
            $query->where('estado', $request->query('estado'));
        }

        if ($request->filled('rol')) {
            $rol = $request->query('rol');
            $query->whereHas('roles', function ($roleQuery) use ($rol) {
                $roleQuery->where('name', $rol);
            });
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                    ->orWhere('apellido', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%');
            });
        }

        $users = $query->paginate($perPage);
        $payload = $users->getCollection()->map(function (User $user) {
            return $this->formatUser($user);
        })->values();

        return response()->json([
            'success' => true,
            'message' => 'Usuarios cargados.',
            'data'    => $payload,
            'meta'    => [
                'total' => $users->total(),
                'per_page' => $users->perPage(),
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
            ],
            'errors'  => null,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:80',
            'apellido' => 'required|string|max:80',
            'telefono' => 'nullable|string|max:20',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'rol' => 'required|string',
            'estado' => 'nullable|in:Activo,Inactivo',
        ]);

        $user = User::create([
            'name' => $validated['nombre'] . ' ' . $validated['apellido'],
            'apellido' => $validated['apellido'],
            'telefono' => $validated['telefono'] ?? null,
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'estado' => $validated['estado'] ?? 'Activo',
        ]);

        $this->syncRole($user, $validated['rol']);

        AuditLogger::record($request, 'admin_user_created', 'Se creó un usuario interno.', [
            'entity_type' => 'user',
            'entity_id' => $user->id,
            'metadata' => [
                'nombre' => $validated['nombre'],
                'apellido' => $validated['apellido'],
                'email' => $validated['email'],
                'rol' => $validated['rol'],
                'estado' => $validated['estado'] ?? 'Activo',
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Usuario creado.',
            'data'    => $this->formatUser($user->fresh()),
            'errors'  => null,
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Usuario encontrado.',
            'data'    => $this->formatUser($user),
            'errors'  => null,
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'sometimes|required|string|max:80',
            'apellido' => 'sometimes|required|string|max:80',
            'telefono' => 'nullable|string|max:20',
            'email' => 'sometimes|required|email|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:8',
            'rol' => 'nullable|string',
            'estado' => 'nullable|in:Activo,Inactivo',
        ]);

        $beforeRole = $user->roles()->pluck('name')->first() ?? 'Usuario';
        $beforeSnapshot = [
            'nombre' => $user->name,
            'apellido' => $user->apellido,
            'telefono' => $user->telefono,
            'email' => $user->email,
            'rol' => $beforeRole,
            'estado' => $user->estado,
        ];

        $nombre = $validated['nombre'] ?? null;
        $apellido = $validated['apellido'] ?? null;

        if ($nombre !== null && $apellido !== null) {
            $user->name = $nombre . ' ' . $apellido;
            $user->apellido = $apellido;
        } elseif ($nombre !== null && $user->apellido) {
            $user->name = $nombre . ' ' . $user->apellido;
        } elseif ($apellido !== null) {
            $user->apellido = $apellido;
            $user->name = trim(($validated['nombre'] ?? $user->name) . ' ' . $apellido);
        }

        if (array_key_exists('email', $validated)) {
            $user->email = $validated['email'];
        }

        if (array_key_exists('telefono', $validated)) {
            $user->telefono = $validated['telefono'];
        }

        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        if (!empty($validated['estado'])) {
            $user->estado = $validated['estado'];
        }

        $user->save();

        $afterRole = $beforeRole;
        if (!empty($validated['rol'])) {
            $this->syncRole($user, $validated['rol']);
            $afterRole = $validated['rol'];
        }

        AuditLogger::record($request, 'admin_user_updated', 'Se actualizó un usuario interno.', [
            'entity_type' => 'user',
            'entity_id' => $user->id,
            'metadata' => [
                'before' => $beforeSnapshot,
                'after' => [
                    'nombre' => $user->name,
                    'apellido' => $user->apellido,
                    'telefono' => $user->telefono,
                    'email' => $user->email,
                    'rol' => $afterRole,
                    'estado' => $user->estado,
                ],
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Usuario actualizado.',
            'data'    => $this->formatUser($user->fresh()),
            'errors'  => null,
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $user->estado = 'Inactivo';
        $user->save();

        AuditLogger::record($request, 'admin_user_deactivated', 'Se desactivó un usuario interno.', [
            'entity_type' => 'user',
            'entity_id' => $user->id,
            'metadata' => [
                'nombre' => $user->name,
                'email' => $user->email,
                'rol' => $user->roles()->pluck('name')->first() ?? 'Usuario',
                'estado' => $user->estado,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Usuario desactivado.',
            'data'    => $this->formatUser($user->fresh()),
            'errors'  => null,
        ]);
    }

    private function syncRole(User $user, string $roleName): void
    {
        $role = Role::where('name', $roleName)->first();
        if ($role) {
            $user->syncRoles([$role->name]);
        }
    }

    private function formatUser(User $user): array
    {
        $nombre = $user->name ?? '';
        $apellido = $user->apellido ?? '';

        return [
            'id' => $user->id,
            'nombre' => trim(str_replace($apellido, '', $nombre)),
            'apellido' => $apellido,
            'telefono' => $user->telefono,
            'email' => $user->email,
            'rol' => $user->roles()->pluck('name')->first() ?? 'Usuario',
            'estado' => $user->estado ?? 'Activo',
            'fechaCreacion' => optional($user->created_at)->toDateString(),
        ];
    }
}
