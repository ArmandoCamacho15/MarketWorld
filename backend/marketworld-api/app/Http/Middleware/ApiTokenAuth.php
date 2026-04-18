<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * DEPRECATED: middleware legado basado en columna users.api_token.
 *
 * Reemplazado por auth:sanctum en modo sesión/cookie.
 * Se mantiene temporalmente para trazabilidad histórica.
 */
class ApiTokenAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json([
                'success' => false,
                'message' => 'Token no proporcionado',
            ], 401);
        }

        $user = User::where('api_token', $token)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Token inválido o expirado',
            ], 401);
        }

        $request->attributes->set('auth_user', $user);

        return $next($request);
    }
}
