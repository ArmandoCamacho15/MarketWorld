<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min((int) $request->query('per_page', 25), 100));

        $query = AuditLog::query()->with('user')->orderByDesc('created_at');

        if ($request->filled('action')) {
            $query->where('action', $request->query('action'));
        }

        if ($request->filled('user')) {
            $search = $request->query('user');
            $query->whereHas('user', function ($userQuery) use ($search) {
                $userQuery->where('name', 'like', '%' . $search . '%')
                    ->orWhere('email', 'like', '%' . $search . '%');
            });
        }

        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->query('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->query('to'));
        }

        $logs = $query->paginate($perPage);
        $payload = $logs->getCollection()->map(function (AuditLog $log) {
            return $this->formatLog($log);
        })->values();

        return response()->json([
            'success' => true,
            'message' => 'Auditoría cargada.',
            'data' => $payload,
            'meta' => [
                'total' => $logs->total(),
                'per_page' => $logs->perPage(),
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
            ],
            'errors' => null,
        ]);
    }

    private function formatLog(AuditLog $log): array
    {
        return [
            'id' => $log->id,
            'action' => $log->action,
            'description' => $log->description,
            'entity_type' => $log->entity_type,
            'entity_id' => $log->entity_id,
            'metadata' => $log->metadata ?? [],
            'usuario' => $log->user?->name ?? 'Sistema',
            'email' => $log->user?->email ?? null,
            'ip_address' => $log->ip_address,
            'user_agent' => $log->user_agent,
            'created_at' => optional($log->created_at)->toDateTimeString(),
        ];
    }
}