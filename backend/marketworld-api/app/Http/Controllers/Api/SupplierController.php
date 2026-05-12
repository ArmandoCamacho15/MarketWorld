<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SupplierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);
        $query = Supplier::query();

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($builder) use ($search) {
                $builder->where('nombre', 'like', "%{$search}%")
                    ->orWhere('nit_ruc', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $suppliers = $query
            ->orderBy('nombre')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Proveedores listados correctamente',
            'data'    => $suppliers->items(),
            'meta'    => [
                'total'        => $suppliers->total(),
                'per_page'     => $suppliers->perPage(),
                'current_page' => $suppliers->currentPage(),
                'last_page'    => $suppliers->lastPage(),
            ],
            'total'   => $suppliers->total(),
            'errors'  => null,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $supplier = Supplier::find($id);

        if (!$supplier) {
            return response()->json([
                'success' => false,
                'message' => 'Proveedor no encontrado',
                'data'    => null,
                'errors'  => null,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Proveedor encontrado',
            'data'    => $supplier,
            'errors'  => null,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge([
            'nit_ruc' => $request->input('nit_ruc', $request->input('nit')),
        ]);

        $validated = $request->validate([
            'nombre'   => 'required|string|max:200',
            'nit_ruc'  => 'required|string|max:50|unique:suppliers,nit_ruc',
            'telefono' => 'nullable|string|max:30',
            'email'    => 'nullable|email|max:150',
            'direccion'=> 'nullable|string|max:255',
            'estado'   => ['nullable', Rule::in(['Activo', 'Inactivo'])],
        ]);

        $supplier = Supplier::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Proveedor creado correctamente',
            'data'    => $supplier,
            'errors'  => null,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $supplier = Supplier::find($id);

        if (!$supplier) {
            return response()->json([
                'success' => false,
                'message' => 'Proveedor no encontrado',
                'data'    => null,
                'errors'  => null,
            ], 404);
        }

        $request->merge([
            'nit_ruc' => $request->input('nit_ruc', $request->input('nit')),
        ]);

        $validated = $request->validate([
            'nombre'   => 'sometimes|required|string|max:200',
            'nit_ruc'  => ['sometimes', 'required', 'string', 'max:50', Rule::unique('suppliers', 'nit_ruc')->ignore($id)],
            'telefono' => 'nullable|string|max:30',
            'email'    => 'nullable|email|max:150',
            'direccion'=> 'nullable|string|max:255',
            'estado'   => ['nullable', Rule::in(['Activo', 'Inactivo'])],
        ]);

        $supplier->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Proveedor actualizado correctamente',
            'data'    => $supplier->fresh(),
            'errors'  => null,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $supplier = Supplier::find($id);

        if (!$supplier) {
            return response()->json([
                'success' => false,
                'message' => 'Proveedor no encontrado',
                'data'    => null,
                'errors'  => null,
            ], 404);
        }

        if ($supplier->purchases()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el proveedor porque tiene compras asociadas',
                'data'    => null,
                'errors'  => null,
            ], 422);
        }

        $supplier->delete();

        return response()->json([
            'success' => true,
            'message' => 'Proveedor eliminado correctamente',
            'data'    => null,
            'errors'  => null,
        ]);
    }
}