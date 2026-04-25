<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

use App\Models\Customer;
use App\Models\Opportunity;
use Illuminate\Http\JsonResponse;

class CRMController extends Controller
{
    /**
     * Devuelve clientes con su historial de ventas resumido.
     * Permite al equipo comercial ver el valor de cada cliente en el tiempo.
     */
    public function clientes(Request $request): JsonResponse
    {
        $clientes = Customer::withCount('invoices')
            ->withSum(['invoices' => function ($q) {
                // Solo sumar facturas confirmadas para el valor real del cliente
                $q->where('estado', 'confirmada');
            }], 'total')
            ->paginate(15);

        return response()->json([
            'success' => true,
            'message' => 'Clientes CRM cargados.',
            'data'    => $clientes->items(),
            'meta'    => ['total' => $clientes->total(), 'last_page' => $clientes->lastPage()],
            'errors'  => null,
        ]);
    }

    /** CRUD básico de oportunidades comerciales */
    public function oportunidades(): JsonResponse
    {
        $oportunidades = Opportunity::with('customer', 'user')
            ->orderBy('etapa')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'message' => 'Oportunidades cargadas.',
            'data'    => $oportunidades->items(),
            'meta'    => ['total' => $oportunidades->total()],
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
}
