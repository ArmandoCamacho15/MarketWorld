<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class AuthController extends Controller
{
    /**
     * Registrar un usuario público con rol fijo Usuario.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:80',
            'apellido' => 'required|string|max:80',
            'email' => 'required|email|unique:users,email',
            'telefono' => 'required|string|max:20',
            'password' => 'required|string|min:8',
        ]);

        $user = User::create([
            'name' => $validated['nombre'] . ' ' . $validated['apellido'],
            'apellido' => $validated['apellido'],
            'telefono' => $validated['telefono'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'estado' => 'Activo',
        ]);

        $role = Role::where('name', 'Usuario')->first();
        if ($role) {
            $user->syncRoles([$role->name]);
        }

        AuditLogger::record($request, 'user_registered', 'Se registró un usuario público.', [
            'entity_type' => 'user',
            'entity_id' => $user->id,
            'metadata' => [
                'nombre' => $validated['nombre'],
                'apellido' => $validated['apellido'],
                'email' => $validated['email'],
                'rol' => 'Usuario',
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Usuario registrado correctamente.',
            'data'    => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'rol' => $user->getRoleNames()->first() ?? 'Usuario',
                ],
            ],
            'errors'  => null,
        ], 201);
    }

    /**
     * Iniciar sesión con Sanctum usando Bearer Token (token-based, cross-domain).
     * Genera un Personal Access Token que el cliente almacena y envía
     * en cada petición como: Authorization: Bearer {token}
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        if (!Auth::attempt(['email' => $validated['email'], 'password' => $validated['password']])) {
            return response()->json([
                'success' => false,
                'message' => 'Credenciales inválidas',
                'data'    => null,
                'errors'  => null,
            ], 401);
        }

        /** @var \App\Models\User $user */
        $user = Auth::user();

        // Revocar tokens anteriores del mismo dispositivo para evitar acumulación.
        $user->tokens()->where('name', 'auth_token')->delete();

        // Crear un nuevo Personal Access Token de Sanctum.
        $token = $user->createToken('auth_token')->plainTextToken;

        AuditLogger::record($request, 'user_login', 'Inicio de sesión exitoso (token).', [
            'entity_type' => 'user',
            'entity_id'   => $user->id,
            'metadata'    => [
                'email' => $user->email,
                'rol'   => $user->getRoleNames()->first() ?? 'Sin Rol',
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Inicio de sesión exitoso',
            'data'    => [
                'token' => $token,
                'user'  => [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'rol'   => $user->getRoleNames()->first() ?? 'Sin Rol',
                ],
            ],
            'errors'  => null,
        ]);
    }

    /**
     * Obtener el perfil del usuario autenticado.
     */
    public function me(Request $request): JsonResponse
    {
        // Modificado: Se obtiene el usuario directamente del Request vía Sanctum
        $user = $request->user();

        return response()->json([
            'success' => true,
            'message' => 'Perfil del usuario obtenido',
            'data'    => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'rol'   => $user->getRoleNames()->first() ?? 'Sin Rol',
            ],
            'errors'  => null,
        ]);
    }

    /**
     * Cerrar sesión revocando el Bearer Token actual de Sanctum.
     * El cliente debe eliminar el token de su almacenamiento local.
     */
    public function logout(Request $request): JsonResponse
    {
        $user          = $request->user();
        $currentUserId = $user?->id;

        // Revocar únicamente el token con el que llegó esta petición.
        $accessToken = $user?->currentAccessToken();
        if ($accessToken && method_exists($accessToken, 'delete')) {
            $accessToken->delete();
        }

        AuditLogger::record($request, 'user_logout', 'Token revocado. Sesión cerrada.', [
            'entity_type' => 'user',
            'entity_id'   => $currentUserId,
            'metadata'    => [
                'email' => $user?->email,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sesión cerrada correctamente',
            'data'    => null,
            'errors'  => null,
        ]);
    }
}
