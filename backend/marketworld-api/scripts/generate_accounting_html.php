<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\JournalEntry;

$entries = JournalEntry::with('items.account')->orderBy('created_at', 'desc')->take(10)->get();

$html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Evidence - Libro Diario</title><style>body{font-family:Arial,Helvetica,sans-serif}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}th{background:#f4f4f4}</style></head><body>';
$html .= '<h2>Evidence - Libro Diario</h2>';
$html .= '<p>Generado: ' . date('Y-m-d H:i:s') . '</p>';

foreach ($entries as $entry) {
    $html .= '<h3>Asiento ' . ('AS-' . str_pad($entry->id,5,'0',STR_PAD_LEFT)) . ' - ' . htmlspecialchars($entry->glosa) . ' (' . $entry->fecha . ')</h3>';
    $html .= '<table><thead><tr><th>Cuenta</th><th>Debe</th><th>Haber</th></tr></thead><tbody>';
    foreach ($entry->items as $item) {
        $code = $item->account->codigo ?? '';
        $name = $item->account->nombre ?? '';
        $debe = number_format($item->debe,2,',','.');
        $haber = number_format($item->haber,2,',','.');
        $html .= '<tr><td>' . htmlspecialchars($code . ' - ' . $name) . '</td><td style="text-align:right">' . ($item->debe>0 ? $debe : '') . '</td><td style="text-align:right">' . ($item->haber>0 ? $haber : '') . '</td></tr>';
    }
    $html .= '</tbody></table>';
}

$html .= '<p>Fuente: base de datos local. Archivo generado por scripts/generate_accounting_html.php</p>';
$html .= '</body></html>';

$outFile = __DIR__ . '/../docs/evidence_accounting_diario.html';
file_put_contents($outFile, $html);
echo "EVIDENCE_HTML_SAVED: {$outFile}\n";
