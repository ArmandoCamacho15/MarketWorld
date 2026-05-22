<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogger
{
    public static function record(?Request $request, string $action, string $description, array $context = []): void
    {
        try {
            AuditLog::create([
                'user_id' => $request && $request->user() ? $request->user()->id : null,
                'action' => $action,
                'entity_type' => $context['entity_type'] ?? null,
                'entity_id' => $context['entity_id'] ?? null,
                'description' => $description,
                'metadata' => $context['metadata'] ?? null,
                'ip_address' => $request ? $request->ip() : null,
                'user_agent' => $request ? substr((string) $request->userAgent(), 0, 1000) : null,
            ]);
        } catch (\Throwable $e) {
            // La auditoría no debe romper el flujo principal.
        }
    }
}