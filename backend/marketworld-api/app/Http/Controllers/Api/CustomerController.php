<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    // GET /api/v1/customers
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);
        $query = Customer::query();

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('segmento')) {
            $query->where('segmento', $request->segmento);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'like', "%{$search}%")
                  ->orWhere('documento', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $customers = $query
            ->orderBy('nombre')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Clientes listados correctamente',
            'data'    => $customers->items(),
            'meta'    => [
                'total'        => $customers->total(),
                'per_page'     => $customers->perPage(),
                'current_page' => $customers->currentPage(),
                'last_page'    => $customers->lastPage(),
            ],
            'total'   => $customers->total(),
            'errors'  => null,
        ]);
    }

    // GET /api/v1/customers/{id}
    public function show(int $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Cliente no encontrado'], 404);
        }

        return response()->json(['success' => true, 'data' => $customer]);
    }

    // POST /api/v1/customers
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre'        => 'required|string|max:200',
            'documento'     => 'required|string|max:50|unique:customers,documento',
            'tipo_documento'=> ['required', Rule::in(['CC', 'NIT', 'CE', 'Pasaporte'])],
            'email'         => 'nullable|email|max:150',
            'telefono'      => 'nullable|string|max:20',
            'direccion'     => 'nullable|string',
            'ciudad'        => 'nullable|string|max:100',
            'tipo_cliente'  => ['nullable', Rule::in(['Persona Natural', 'Empresa'])],
            'segmento'      => ['nullable', Rule::in(['Nuevo', 'Frecuente', 'Premium', 'Corporativo'])],
            'estado'        => ['nullable', Rule::in(['Activo', 'Inactivo'])],
        ]);

        $customer = Customer::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cliente creado correctamente',
            'data'    => $customer,
        ], 201);
    }

    // PUT /api/v1/customers/{id}
    public function update(Request $request, int $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Cliente no encontrado'], 404);
        }

        $validated = $request->validate([
            'nombre'        => 'sometimes|required|string|max:200',
            'documento'     => ['sometimes', 'required', 'string', 'max:50', Rule::unique('customers', 'documento')->ignore($id)],
            'tipo_documento'=> ['sometimes', Rule::in(['CC', 'NIT', 'CE', 'Pasaporte'])],
            'email'         => 'nullable|email|max:150',
            'telefono'      => 'nullable|string|max:20',
            'direccion'     => 'nullable|string',
            'ciudad'        => 'nullable|string|max:100',
            'tipo_cliente'  => ['nullable', Rule::in(['Persona Natural', 'Empresa'])],
            'segmento'      => ['nullable', Rule::in(['Nuevo', 'Frecuente', 'Premium', 'Corporativo'])],
            'estado'        => ['nullable', Rule::in(['Activo', 'Inactivo'])],
        ]);

        $customer->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cliente actualizado correctamente',
            'data'    => $customer->fresh(),
        ]);
    }

    // DELETE /api/v1/customers/{id}
    public function destroy(int $id): JsonResponse
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Cliente no encontrado'], 404);
        }

        $customer->delete();

        return response()->json([
            'success' => true,
            'message' => 'Cliente eliminado correctamente',
        ]);
    }
}
