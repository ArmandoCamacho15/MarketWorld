<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Manejar la solicitud entrante.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string  ...$roles
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'No autenticado.',
                'data' => null,
                'errors' => null,
            ], 401);
        }

        $requiredRoles = collect($roles)
            ->flatMap(static function (string $role): array {
                return preg_split('/[|,]/', $role) ?: [];
            })
            ->map(static function (string $role): string {
                return trim($role);
            })
            ->filter(static function (string $role): bool {
                return $role !== '';
            })
            ->values()
            ->all();

        if (empty($requiredRoles) || !$user->hasAnyRole($requiredRoles)) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permisos para realizar esta acción.',
                'data' => null,
                'errors' => null,
            ], 403);
        }

        return $next($request);
    }
}