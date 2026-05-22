<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SessionManagementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $sessions = DB::table('sessions')
            ->leftJoin('users', 'sessions.user_id', '=', 'users.id')
            ->select([
                'sessions.id',
                'sessions.user_id',
                'sessions.ip_address',
                'sessions.user_agent',
                'sessions.last_activity',
                'users.name as user_name',
                'users.email as user_email',
            ])
            ->orderByDesc('sessions.last_activity')
            ->limit(100)
            ->get()
            ->map(function ($session) use ($request) {
                return [
                    'id' => $session->id,
                    'user_id' => $session->user_id,
                    'user_name' => $session->user_name,
                    'user_email' => $session->user_email,
                    'ip_address' => $session->ip_address,
                    'user_agent' => $session->user_agent,
                    'last_activity' => $session->last_activity,
                    'last_activity_human' => $session->last_activity ? date('Y-m-d H:i:s', (int) $session->last_activity) : null,
                    'is_current' => $request->hasSession() ? $session->id === $request->session()->getId() : false,
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Sesiones cargadas.',
            'data' => $sessions,
            'errors' => null,
        ]);
    }

    public function destroy(Request $request, string $sessionId): JsonResponse
    {
        $session = DB::table('sessions')
            ->leftJoin('users', 'sessions.user_id', '=', 'users.id')
            ->select([
                'sessions.id',
                'sessions.user_id',
                'sessions.ip_address',
                'sessions.user_agent',
                'users.name as user_name',
                'users.email as user_email',
            ])
            ->where('sessions.id', $sessionId)
            ->first();

        $deleted = DB::table('sessions')->where('id', $sessionId)->delete();

        if (!$deleted) {
            return response()->json([
                'success' => false,
                'message' => 'La sesión no existe o ya fue cerrada.',
                'data' => null,
                'errors' => null,
            ], 404);
        }

        if ($request->hasSession() && $request->session()->getId() === $sessionId) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        AuditLogger::record($request, 'session_revoked', 'Se cerró una sesión activa.', [
            'entity_type' => 'session',
            'entity_id' => null,
            'metadata' => [
                'session_id' => $sessionId,
                'user_id' => $session?->user_id,
                'usuario' => $session?->user_name,
                'email' => $session?->user_email,
                'ip_address' => $session?->ip_address,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Sesión cerrada correctamente.',
            'data' => null,
            'errors' => null,
        ]);
    }

    public function revokeOthers(Request $request): JsonResponse
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

        $currentSessionId = $request->hasSession() ? $request->session()->getId() : null;

        $removedCount = DB::table('sessions')
            ->where('user_id', $user->id)
            ->when($currentSessionId, fn ($query) => $query->where('id', '!=', $currentSessionId))
            ->delete();

        AuditLogger::record($request, 'sessions_revoked_other', 'Se cerraron otras sesiones del usuario autenticado.', [
            'entity_type' => 'session',
            'metadata' => [
                'user_id' => $user->id,
                'email' => $user->email,
                'removed_count' => $removedCount,
                'current_session_id' => $currentSessionId,
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Otras sesiones cerradas correctamente.',
            'data' => null,
            'errors' => null,
        ]);
    }
}