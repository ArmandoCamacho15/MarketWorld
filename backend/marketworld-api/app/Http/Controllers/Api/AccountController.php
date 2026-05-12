<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Account::query();

        if ($request->filled('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        if ($request->filled('activo')) {
            $query->where('activo', filter_var($request->activo, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($builder) use ($search) {
                $builder->where('codigo', 'like', "%{$search}%")
                    ->orWhere('nombre', 'like', "%{$search}%");
            });
        }

        $accounts = $query->orderBy('codigo')->get();

        return response()->json([
            'success' => true,
            'message' => 'Cuentas listadas correctamente',
            'data'    => $accounts,
            'errors'  => null,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $account = Account::find($id);

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'Cuenta no encontrada',
                'data'    => null,
                'errors'  => null,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Cuenta encontrada',
            'data'    => $account,
            'errors'  => null,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'codigo' => 'required|string|max:50|unique:accounts,codigo',
            'nombre' => 'required|string|max:150',
            'tipo'   => ['required', Rule::in(['Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Gasto'])],
            'activo' => 'nullable|boolean',
        ]);

        $account = Account::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cuenta creada correctamente',
            'data'    => $account,
            'errors'  => null,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $account = Account::find($id);

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'Cuenta no encontrada',
                'data'    => null,
                'errors'  => null,
            ], 404);
        }

        $validated = $request->validate([
            'codigo' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('accounts', 'codigo')->ignore($id)],
            'nombre' => 'sometimes|required|string|max:150',
            'tipo'   => ['sometimes', 'required', Rule::in(['Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Gasto'])],
            'activo' => 'nullable|boolean',
        ]);

        $account->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cuenta actualizada correctamente',
            'data'    => $account->fresh(),
            'errors'  => null,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $account = Account::find($id);

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'Cuenta no encontrada',
                'data'    => null,
                'errors'  => null,
            ], 404);
        }

        $account->delete();

        return response()->json([
            'success' => true,
            'message' => 'Cuenta eliminada correctamente',
            'data'    => null,
            'errors'  => null,
        ]);
    }
}