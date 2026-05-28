<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

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

    /**
     * Exporta el Libro Diario como CSV (compatible con Excel).
     * Acepta filtros opcionales: fecha_desde, fecha_hasta, tipo (Manual|Automático|Todos).
     */
    public function export(Request $request)
    {
        $query = JournalEntry::with(['items.account', 'user']);

        if ($request->filled('fecha_desde')) {
            $query->where('fecha', '>=', $request->fecha_desde);
        }

        if ($request->filled('fecha_hasta')) {
            $query->where('fecha', '<=', $request->fecha_hasta);
        }

        if ($request->filled('tipo') && $request->tipo !== 'Todos') {
            if ($request->tipo === 'Manual') {
                $query->where(function ($q) {
                    $q->whereNull('referencia_tipo')
                      ->orWhere('referencia_tipo', 'Manual');
                });
            } elseif ($request->tipo === 'Automático') {
                $query->whereNotNull('referencia_tipo')
                      ->where('referencia_tipo', '!=', 'Manual');
            }
        }

        $entries = $query->orderBy('fecha', 'asc')->orderBy('id', 'asc')->get();

        $filename = 'libro_diario_' . date('Ymd') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($entries) {
            $out = fopen('php://output', 'w');
            // BOM para evitar problemas de codificación en Excel
            fprintf($out, "%s", chr(0xEF) . chr(0xBB) . chr(0xBF));

            // Cabecera
            fputcsv($out, ['Asiento', 'Fecha', 'Glosa', 'Referencia Tipo', 'Referencia ID', 'Usuario', 'Cuenta Codigo', 'Cuenta Nombre', 'Debe', 'Haber']);

            foreach ($entries as $entry) {
                $numero = $entry->numero ?? ('AS-' . str_pad($entry->id, 5, '0', STR_PAD_LEFT));
                $usuario = $entry->user?->name ?? '';

                foreach ($entry->items as $item) {
                    $codigo = $item->account?->codigo ?? '';
                    $nombre = $item->account?->nombre ?? '';

                    fputcsv($out, [
                        $numero,
                        $entry->fecha,
                        $entry->glosa ?? '',
                        $entry->referencia_tipo ?? '',
                        $entry->referencia_id ?? '',
                        $usuario,
                        $codigo,
                        $nombre,
                        number_format((float) ($item->debe ?? 0), 2, '.', ''),
                        number_format((float) ($item->haber ?? 0), 2, '.', ''),
                    ]);
                }
            }

            fclose($out);
        };

        return response()->streamDownload($callback, $filename, $headers);
    }

    /**
     * Exporta el Libro Diario como .xlsx usando PhpSpreadsheet.
     */
    public function exportXlsx(Request $request)
    {
        if (!class_exists('\PhpOffice\PhpSpreadsheet\Spreadsheet')) {
            return response()->json([
                'success' => false,
                'message' => 'PhpSpreadsheet no está instalado. Ejecuta composer require phpoffice/phpspreadsheet',
                'data' => null,
                'errors' => null,
            ], 501);
        }

        $query = JournalEntry::with(['items.account', 'user']);

        if ($request->filled('fecha_desde')) {
            $query->where('fecha', '>=', $request->fecha_desde);
        }

        if ($request->filled('fecha_hasta')) {
            $query->where('fecha', '<=', $request->fecha_hasta);
        }

        if ($request->filled('tipo') && $request->tipo !== 'Todos') {
            if ($request->tipo === 'Manual') {
                $query->where(function ($q) {
                    $q->whereNull('referencia_tipo')
                      ->orWhere('referencia_tipo', 'Manual');
                });
            } elseif ($request->tipo === 'Automático') {
                $query->whereNotNull('referencia_tipo')
                      ->where('referencia_tipo', '!=', 'Manual');
            }
        }

        $entries = $query->orderBy('fecha', 'asc')->orderBy('id', 'asc')->get();

        // Build spreadsheet
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Libro Diario');

        $headers = ['Asiento', 'Fecha', 'Glosa', 'Referencia Tipo', 'Referencia ID', 'Usuario', 'Cuenta Codigo', 'Cuenta Nombre', 'Debe', 'Haber'];
        $col = 1;
        foreach ($headers as $h) {
            $cell = Coordinate::stringFromColumnIndex($col) . '1';
            $sheet->setCellValue($cell, $h);
            $col++;
        }

        $row = 2;
        foreach ($entries as $entry) {
            $numero = $entry->numero ?? ('AS-' . str_pad($entry->id, 5, '0', STR_PAD_LEFT));
            $usuario = $entry->user?->name ?? '';

            foreach ($entry->items as $item) {
                $codigo = $item->account?->codigo ?? '';
                $nombre = $item->account?->nombre ?? '';

                $sheet->setCellValue(Coordinate::stringFromColumnIndex(1) . $row, $numero);
                $sheet->setCellValue(Coordinate::stringFromColumnIndex(2) . $row, $entry->fecha);
                $sheet->setCellValue(Coordinate::stringFromColumnIndex(3) . $row, $entry->glosa ?? '');
                $sheet->setCellValue(Coordinate::stringFromColumnIndex(4) . $row, $entry->referencia_tipo ?? '');
                $sheet->setCellValue(Coordinate::stringFromColumnIndex(5) . $row, $entry->referencia_id ?? '');
                $sheet->setCellValue(Coordinate::stringFromColumnIndex(6) . $row, $usuario);
                $sheet->setCellValue(Coordinate::stringFromColumnIndex(7) . $row, $codigo);
                $sheet->setCellValue(Coordinate::stringFromColumnIndex(8) . $row, $nombre);
                $sheet->setCellValue(Coordinate::stringFromColumnIndex(9) . $row, (float) ($item->debe ?? 0));
                $sheet->setCellValue(Coordinate::stringFromColumnIndex(10) . $row, (float) ($item->haber ?? 0));

                $row++;
            }
        }

        // Autosize columns
        foreach (range('A', 'J') as $colLetter) {
            $sheet->getColumnDimension($colLetter)->setAutoSize(true);
        }

        $filename = 'libro_diario_' . date('Ymd') . '.xlsx';

        // Stream the XLSX
        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);

        ob_start();
        $writer->save('php://output');
        $content = ob_get_clean();

        return response($content, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}