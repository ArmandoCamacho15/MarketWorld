<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class JournalEntryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = JournalEntry::with(['items.account', 'user']);

        if ($request->filled('fecha_desde')) {
            $query->where('fecha', '>=', $request->fecha_desde);
        }

        if ($request->filled('fecha_hasta')) {
            $query->where('fecha', '<=', $request->fecha_hasta);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($builder) use ($search) {
                $builder->where('glosa', 'like', "%{$search}%")
                    ->orWhere('referencia_tipo', 'like', "%{$search}%");
            });
        }

        $entries = $query->orderBy('fecha', 'desc')->orderBy('id', 'desc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Asientos listados correctamente',
            'data'    => $entries,
            'errors'  => null,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $entry = JournalEntry::with(['items.account', 'user'])->find($id);

        if (!$entry) {
            return response()->json([
                'success' => false,
                'message' => 'Asiento no encontrado',
                'data'    => null,
                'errors'  => null,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Asiento encontrado',
            'data'    => $entry,
            'errors'  => null,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fecha'            => 'required|date',
            'glosa'            => 'required|string|max:255',
            'referencia_tipo'  => 'nullable|string|max:100',
            'referencia_id'    => 'nullable|integer',
            'items'            => 'required|array|min:2',
            'items.*.account_id' => 'required|exists:accounts,id',
            'items.*.debe'     => 'nullable|numeric|min:0',
            'items.*.haber'    => 'nullable|numeric|min:0',
        ]);

        $user = $request->user();

        $debeTotal = 0;
        $haberTotal = 0;

        foreach ($validated['items'] as $item) {
            $debeTotal += (float) ($item['debe'] ?? 0);
            $haberTotal += (float) ($item['haber'] ?? 0);
        }

        if (round($debeTotal, 2) !== round($haberTotal, 2)) {
            return response()->json([
                'success' => false,
                'message' => 'El asiento no está balanceado.',
                'data'    => null,
                'errors'  => ['items' => ['Debe y haber deben ser iguales.']],
            ], 422);
        }

        $entry = DB::transaction(function () use ($validated, $user) {
            $entry = JournalEntry::create([
                'fecha'           => $validated['fecha'],
                'glosa'           => $validated['glosa'],
                'referencia_tipo' => $validated['referencia_tipo'] ?? null,
                'referencia_id'   => $validated['referencia_id'] ?? null,
                'user_id'         => $user?->id,
            ]);

            foreach ($validated['items'] as $item) {
                JournalItem::create([
                    'journal_entry_id' => $entry->id,
                    'account_id'       => $item['account_id'],
                    'debe'             => (float) ($item['debe'] ?? 0),
                    'haber'            => (float) ($item['haber'] ?? 0),
                ]);
            }

            return $entry->load(['items.account', 'user']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Asiento creado correctamente',
            'data'    => $entry,
            'errors'  => null,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $entry = JournalEntry::find($id);

        if (!$entry) {
            return response()->json([
                'success' => false,
                'message' => 'Asiento no encontrado',
                'data'    => null,
                'errors'  => null,
            ], 404);
        }

        $validated = $request->validate([
            'fecha'            => 'sometimes|required|date',
            'glosa'            => 'sometimes|required|string|max:255',
            'referencia_tipo'  => 'nullable|string|max:100',
            'referencia_id'    => 'nullable|integer',
            'items'            => 'sometimes|array|min:2',
            'items.*.account_id' => 'required_with:items|exists:accounts,id',
            'items.*.debe'     => 'nullable|numeric|min:0',
            'items.*.haber'    => 'nullable|numeric|min:0',
        ]);

        $items = $validated['items'] ?? null;
        if ($items) {
            $debeTotal = 0;
            $haberTotal = 0;

            foreach ($items as $item) {
                $debeTotal += (float) ($item['debe'] ?? 0);
                $haberTotal += (float) ($item['haber'] ?? 0);
            }

            if (round($debeTotal, 2) !== round($haberTotal, 2)) {
                return response()->json([
                    'success' => false,
                    'message' => 'El asiento no está balanceado.',
                    'data'    => null,
                    'errors'  => ['items' => ['Debe y haber deben ser iguales.']],
                ], 422);
            }
        }

        $entry = DB::transaction(function () use ($entry, $validated, $items) {
            $entry->update([
                'fecha'           => $validated['fecha'] ?? $entry->fecha,
                'glosa'           => $validated['glosa'] ?? $entry->glosa,
                'referencia_tipo' => array_key_exists('referencia_tipo', $validated) ? $validated['referencia_tipo'] : $entry->referencia_tipo,
                'referencia_id'   => array_key_exists('referencia_id', $validated) ? $validated['referencia_id'] : $entry->referencia_id,
            ]);

            if ($items) {
                $entry->items()->delete();

                foreach ($items as $item) {
                    JournalItem::create([
                        'journal_entry_id' => $entry->id,
                        'account_id'       => $item['account_id'],
                        'debe'             => (float) ($item['debe'] ?? 0),
                        'haber'            => (float) ($item['haber'] ?? 0),
                    ]);
                }
            }

            return $entry->fresh()->load(['items.account', 'user']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Asiento actualizado correctamente',
            'data'    => $entry,
            'errors'  => null,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $entry = JournalEntry::find($id);

        if (!$entry) {
            return response()->json([
                'success' => false,
                'message' => 'Asiento no encontrado',
                'data'    => null,
                'errors'  => null,
            ], 404);
        }

        $entry->delete();

        return response()->json([
            'success' => true,
            'message' => 'Asiento eliminado correctamente',
            'data'    => null,
            'errors'  => null,
        ]);
    }
}