<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = SystemNotification::query()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Notificaciones cargadas.',
            'data' => $notifications->map(fn (SystemNotification $notification) => $this->transform($notification))->values(),
            'meta' => [
                'total' => $notifications->count(),
                'unread_count' => $notifications->where('leida', false)->count(),
            ],
            'errors' => null,
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $unreadCount = SystemNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('leida', false)
            ->count();

        return response()->json([
            'success' => true,
            'message' => 'Conteo de notificaciones no leídas.',
            'data' => ['unread_count' => $unreadCount],
            'errors' => null,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tipo' => 'nullable|in:info,success,warning,danger',
            'titulo' => 'required|string|max:150',
            'mensaje' => 'required|string|max:1000',
            'enlace' => 'nullable|string|max:255',
        ]);

        $notification = SystemNotification::create([
            'user_id' => $request->user()->id,
            'tipo' => $validated['tipo'] ?? 'info',
            'titulo' => $validated['titulo'],
            'mensaje' => $validated['mensaje'],
            'enlace' => $validated['enlace'] ?? null,
            'leida' => false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Notificación creada.',
            'data' => $this->transform($notification),
            'errors' => null,
        ], 201);
    }

    public function markRead(Request $request, SystemNotification $notification): JsonResponse
    {
        $this->authorizeOwnership($request, $notification);

        $notification->update(['leida' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Notificación marcada como leída.',
            'data' => $this->transform($notification->refresh()),
            'errors' => null,
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        SystemNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('leida', false)
            ->update(['leida' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Todas las notificaciones fueron marcadas como leídas.',
            'data' => null,
            'errors' => null,
        ]);
    }

    public function destroy(Request $request, SystemNotification $notification): JsonResponse
    {
        $this->authorizeOwnership($request, $notification);

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notificación eliminada.',
            'data' => null,
            'errors' => null,
        ]);
    }

    public function destroyRead(Request $request): JsonResponse
    {
        SystemNotification::query()
            ->where('user_id', $request->user()->id)
            ->where('leida', true)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Notificaciones leídas eliminadas.',
            'data' => null,
            'errors' => null,
        ]);
    }

    public function destroyAll(Request $request): JsonResponse
    {
        SystemNotification::query()
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'Todas las notificaciones fueron eliminadas.',
            'data' => null,
            'errors' => null,
        ]);
    }

    private function transform(SystemNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'tipo' => $this->normalizeType($notification->tipo),
            'titulo' => $notification->titulo,
            'mensaje' => $notification->mensaje,
            'enlace' => $notification->enlace,
            'leida' => (bool) $notification->leida,
            'fechaCreacion' => optional($notification->created_at)->toIso8601String(),
        ];
    }

    private function normalizeType(?string $type): string
    {
        $normalized = strtolower((string) $type);

        return in_array($normalized, ['info', 'success', 'warning', 'danger'], true)
            ? $normalized
            : 'info';
    }

    private function authorizeOwnership(Request $request, SystemNotification $notification): void
    {
        abort_unless($notification->user_id === $request->user()->id, 403);
    }
}
