<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Customer;
use App\Models\Opportunity;
use App\Models\Segment;
use App\Models\Campaign;
use App\Models\Activity;
use App\Models\Reminder;
use Illuminate\Http\JsonResponse;

class CRMController extends Controller
{
    /**
     * Devuelve clientes con su historial de ventas resumido.
     * Permite al equipo comercial ver el valor de cada cliente en el tiempo.
     */
    public function clientes(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);

        $query = Customer::withCount('invoices')
            ->withSum(['invoices' => function ($q) {
                // Solo sumar facturas Pagadas (o confirmadas) para el valor real del cliente
                $q->whereIn('estado', ['Pagada', 'confirmada']);
            }], 'total');

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('segmento')) {
            $query->where('segmento', $request->segmento);
        }

        if ($request->filled('tipo_cliente')) {
            $query->where('tipo_cliente', $request->tipo_cliente);
        }

        if ($request->filled('ciudad')) {
            $query->where('ciudad', $request->ciudad);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'like', "%{$search}%")
                    ->orWhere('documento', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $clientes = $query
            ->orderBy('nombre')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Clientes CRM cargados.',
            'data'    => $clientes->items(),
            'meta'    => [
                'total'        => $clientes->total(),
                'per_page'     => $clientes->perPage(),
                'current_page' => $clientes->currentPage(),
                'last_page'    => $clientes->lastPage(),
            ],
            'errors'  => null,
        ]);
    }

    /** CRUD básico de oportunidades comerciales */
    public function oportunidades(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->get('per_page', 20), 1), 100);

        $query = Opportunity::with('customer', 'user');

        if ($request->filled('etapa')) {
            $query->where('etapa', $request->etapa);
        }

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        $oportunidades = $query
            ->orderBy('etapa')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Oportunidades cargadas.',
            'data'    => $oportunidades->items(),
            'meta'    => [
                'total'        => $oportunidades->total(),
                'per_page'     => $oportunidades->perPage(),
                'current_page' => $oportunidades->currentPage(),
                'last_page'    => $oportunidades->lastPage(),
            ],
            'errors'  => null,
        ]);
    }

    public function crearOportunidad(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id'            => 'required|exists:customers,id',
            'titulo'                 => 'required|string|max:150',
            'valor_estimado'         => 'required|numeric|min:0',
            'etapa'                  => 'required|in:prospecto,contactado,propuesta,negociacion,ganado,perdido',
            'fecha_estimada_cierre'  => 'nullable|date|after:today',
            'notas'                  => 'nullable|string|max:1000',
        ]);

        $oportunidad = Opportunity::create([
            ...$validated,
            'user_id' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Oportunidad creada.',
            'data'    => $oportunidad->load('customer'),
            'errors'  => null,
        ], 201);
    }

    public function actualizarOportunidad(Request $request, $id): JsonResponse
    {
        $oportunidad = Opportunity::findOrFail($id);

        $validated = $request->validate([
            'etapa'                  => 'nullable|in:prospecto,contactado,propuesta,negociacion,ganado,perdido',
            'valor_estimado'         => 'nullable|numeric|min:0',
            'fecha_estimada_cierre'  => 'nullable|date',
            'notas'                  => 'nullable|string',
            'titulo'                 => 'nullable|string|max:150',
        ]);

        $oportunidad->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Oportunidad actualizada.',
            'data'    => $oportunidad->load('customer'),
            'errors'  => null,
        ]);
    }

    public function eliminarOportunidad($id): JsonResponse
    {
        $oportunidad = Opportunity::findOrFail($id);
        $oportunidad->delete();

        return response()->json([
            'success' => true,
            'message' => 'Oportunidad eliminada.',
            'data'    => null,
            'errors'  => null,
        ]);
    }

    // ========== SEGMENTOS ==========

    /**
     * Listar todos los segmentos
     */
    public function segmentos(): JsonResponse
    {
        $segmentos = Segment::all();

        return response()->json([
            'success' => true,
            'message' => 'Segmentos cargados.',
            'data'    => $segmentos,
            'errors'  => null,
        ]);
    }

    /**
     * Crear nuevo segmento
     */
    public function crearSegmento(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'required|string|unique:segments,nombre|max:100',
            'descripcion' => 'nullable|string|max:500',
            'criterios' => 'nullable|json',
        ]);

        $segmento = Segment::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Segmento creado.',
            'data'    => $segmento,
            'errors'  => null,
        ], 201);
    }

    /**
     * Actualizar segmento
     */
    public function actualizarSegmento(Request $request, $id): JsonResponse
    {
        $segmento = Segment::findOrFail($id);

        $validated = $request->validate([
            'nombre' => 'nullable|string|max:100|unique:segments,nombre,' . $id,
            'descripcion' => 'nullable|string|max:500',
            'criterios' => 'nullable|json',
        ]);

        $segmento->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Segmento actualizado.',
            'data'    => $segmento,
            'errors'  => null,
        ]);
    }

    /**
     * Eliminar segmento
     */
    public function eliminarSegmento($id): JsonResponse
    {
        $segmento = Segment::findOrFail($id);
        $segmento->delete();

        return response()->json([
            'success' => true,
            'message' => 'Segmento eliminado.',
            'data'    => null,
            'errors'  => null,
        ]);
    }

    // ========== CAMPAÑAS ==========

    /**
     * Listar todas las campañas
     */
    public function campanas(): JsonResponse
    {
        $campanas = Campaign::with('segment', 'user')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'message' => 'Campañas cargadas.',
            'data'    => $campanas->items(),
            'meta'    => ['total' => $campanas->total()],
            'errors'  => null,
        ]);
    }

    /**
     * Crear nueva campaña
     */
    public function crearCampana(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:150',
            'descripcion' => 'nullable|string',
            'canal' => 'required|in:Email,WhatsApp,SMS,Llamada,Presencial',
            'segment_id' => 'nullable|exists:segments,id',
            'fecha_inicio' => 'required|date',
            'fecha_fin' => 'nullable|date|after_or_equal:fecha_inicio',
            'estado' => 'nullable|in:Pendiente,Activa,Pausada,Completada,Cancelada',
        ]);

        $campana = Campaign::create([
            ...$validated,
            'user_id' => $request->user()->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Campaña creada.',
            'data'    => $campana->load('segment'),
            'errors'  => null,
        ], 201);
    }

    /**
     * Actualizar campaña
     */
    public function actualizarCampana(Request $request, $id): JsonResponse
    {
        $campana = Campaign::findOrFail($id);

        $validated = $request->validate([
            'nombre' => 'nullable|string|max:150',
            'descripcion' => 'nullable|string',
            'canal' => 'nullable|in:Email,WhatsApp,SMS,Llamada,Presencial',
            'segment_id' => 'nullable|exists:segments,id',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin' => 'nullable|date|after_or_equal:fecha_inicio',
            'estado' => 'nullable|in:Pendiente,Activa,Pausada,Completada,Cancelada',
            'contactados' => 'nullable|integer|min:0',
            'respuestas' => 'nullable|integer|min:0',
        ]);

        $campana->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Campaña actualizada.',
            'data'    => $campana->load('segment'),
            'errors'  => null,
        ]);
    }

    /**
     * Eliminar campaña
     */
    public function eliminarCampana($id): JsonResponse
    {
        $campana = Campaign::findOrFail($id);
        $campana->delete();

        return response()->json([
            'success' => true,
            'message' => 'Campaña eliminada.',
            'data'    => null,
            'errors'  => null,
        ]);
    }

    // ========== ACTIVIDADES ==========

    /**
     * Listar actividades
     */
    public function actividades(Request $request): JsonResponse
    {
        $query = Activity::with('customer', 'user', 'opportunity', 'campaign');

        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->has('opportunity_id')) {
            $query->where('opportunity_id', $request->opportunity_id);
        }

        if ($request->has('estado')) {
            $query->where('estado', $request->estado);
        }

        $perPage = (int) $request->input('per_page', 100);
        $perPage = max(1, min($perPage, 500));

        $actividades = $query->orderBy('fecha_programada')->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Actividades cargadas.',
            'data'    => $actividades->items(),
            'meta'    => [
                'total' => $actividades->total(),
                'per_page' => $actividades->perPage(),
                'current_page' => $actividades->currentPage(),
                'last_page' => $actividades->lastPage(),
            ],
            'errors'  => null,
        ]);
    }

    /**
     * Crear nueva actividad
     */
    public function crearActividad(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => 'required|string|max:150',
            'descripcion' => 'nullable|string',
            'tipo' => 'required|in:Llamada,Email,Reunión,Seguimiento,Propuesta,Otra',
            'estado' => 'nullable|in:Pendiente,En Progreso,Completada,Cancelada',
            'fecha_programada' => 'required|date_format:Y-m-d H:i:s',
            'customer_id' => 'required|exists:customers,id',
            'opportunity_id' => 'nullable|exists:opportunities,id',
            'campaign_id' => 'nullable|exists:campaigns,id',
            'notas' => 'nullable|string',
        ]);

        $actividad = null;

        \DB::transaction(function () use ($validated, $request, &$actividad) {
            $actividad = Activity::create([
                ...$validated,
                'user_id' => $request->user()->id,
            ]);

            // Si la actividad pertenece a una campaña, actualizar contadores
            if (!empty($validated['campaign_id'])) {
                $campana = Campaign::find($validated['campaign_id']);
                if ($campana) {
                    $campana->increment('contactados');
                    if (!empty($validated['estado']) && $validated['estado'] === 'Completada') {
                        $campana->increment('respuestas');
                    }
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Actividad creada.',
            'data'    => $actividad->load('customer', 'user'),
            'errors'  => null,
        ], 201);
    }

    /**
     * Actualizar actividad
     */
    public function actualizarActividad(Request $request, $id): JsonResponse
    {
        $actividad = Activity::findOrFail($id);

        $originalEstado = $actividad->estado;

        $validated = $request->validate([
            'titulo' => 'nullable|string|max:150',
            'descripcion' => 'nullable|string',
            'tipo' => 'nullable|in:Llamada,Email,Reunión,Seguimiento,Propuesta,Otra',
            'estado' => 'nullable|in:Pendiente,En Progreso,Completada,Cancelada',
            'fecha_programada' => 'nullable|date_format:Y-m-d H:i:s',
            'fecha_completada' => 'nullable|date_format:Y-m-d H:i:s',
            'notas' => 'nullable|string',
            'opportunity_id' => 'nullable|exists:opportunities,id',
        ]);
        \DB::transaction(function () use ($actividad, $validated, $originalEstado) {
            $actividad->update($validated);

            $nuevoEstado = $validated['estado'] ?? $actividad->estado;

            // Ajustar contadores de campaña si aplica
            $campaignId = $validated['campaign_id'] ?? $actividad->campaign_id;
            if ($campaignId) {
                $campana = Campaign::find($campaignId);
                if ($campana) {
                    if ($originalEstado !== 'Completada' && $nuevoEstado === 'Completada') {
                        $campana->increment('respuestas');
                    }
                    if ($originalEstado === 'Completada' && $nuevoEstado !== 'Completada') {
                        if ($campana->respuestas > 0) $campana->decrement('respuestas');
                    }
                }
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Actividad actualizada.',
            'data'    => $actividad,
            'errors'  => null,
        ]);
    }

    /**
     * Eliminar actividad
     */
    public function eliminarActividad($id): JsonResponse
    {
        $actividad = Activity::findOrFail($id);

        \DB::transaction(function () use ($actividad) {
            if ($actividad->campaign_id) {
                $campana = Campaign::find($actividad->campaign_id);
                if ($campana) {
                    if ($campana->contactados > 0) $campana->decrement('contactados');
                    if ($actividad->estado === 'Completada' && $campana->respuestas > 0) $campana->decrement('respuestas');
                }
            }

            $actividad->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Actividad eliminada.',
            'data'    => null,
            'errors'  => null,
        ]);
    }

    // ========== RECORDATORIOS ==========

    /**
     * Listar recordatorios pendientes del usuario
     */
    public function recordatorios(Request $request): JsonResponse
    {
        $recordatorios = Reminder::where('user_id', $request->user()->id)
            ->with('activity')
            ->where('estado', '!=', 'Enviado')
            ->orderBy('fecha_envio')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'message' => 'Recordatorios cargados.',
            'data'    => $recordatorios->items(),
            'meta'    => ['total' => $recordatorios->total()],
            'errors'  => null,
        ]);
    }

    /**
     * Crear recordatorio para una actividad
     */
    public function crearRecordatorio(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'titulo' => 'required|string|max:150',
            'descripcion' => 'nullable|string',
            'tipo' => 'required|in:Email,Notificación,SMS,Push',
            'fecha_envio' => 'required|date_format:Y-m-d H:i:s',
            'activity_id' => 'required|exists:activities,id',
        ]);

        $recordatorio = Reminder::create([
            ...$validated,
            'user_id' => $request->user()->id,
            'estado' => 'Pendiente',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Recordatorio creado.',
            'data'    => $recordatorio,
            'errors'  => null,
        ], 201);
    }

    /**
     * Marcar recordatorio como leído
     */
    public function marcarRecordatorioLeido($id): JsonResponse
    {
        $recordatorio = Reminder::findOrFail($id);
        $recordatorio->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'Recordatorio marcado como leído.',
            'data'    => $recordatorio,
            'errors'  => null,
        ]);
    }

    /**
     * Eliminar recordatorio
     */
    public function eliminarRecordatorio($id): JsonResponse
    {
        $recordatorio = Reminder::findOrFail($id);
        $recordatorio->delete();

        return response()->json([
            'success' => true,
            'message' => 'Recordatorio eliminado.',
            'data'    => null,
            'errors'  => null,
        ]);
    }
}
