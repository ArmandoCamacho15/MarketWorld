<?php

// Bootstrap Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Customer;
use App\Models\Opportunity;
use App\Models\Activity;
use App\Models\Reminder;
use Illuminate\Support\Facades\DB;

$out = "";

// Crear o reutilizar cliente
$customer = Customer::first() ?: Customer::create([
    'nombre' => 'Cliente Prueba E2E',
    'documento' => '999',
    'email' => 'e2e@example.com',
]);

$opp = Opportunity::create([
    'customer_id' => $customer->id,
    'titulo' => 'Oportunidad E2E',
    'valor_estimado' => 100,
    'etapa' => 'prospecto',
    'fecha_estimada_cierre' => now()->addDays(10),
    'user_id' => 1,
]);

$out .= "OPP_ID: {$opp->id}\n";

// Avanzar etapa
$opp->update(['etapa' => 'contactado']);
$out .= "Etapa actual: {$opp->fresh()->etapa}\n";

// Crear actividad vinculada
$activity = Activity::create([
    'titulo' => 'Actividad E2E',
    'tipo' => 'Seguimiento',
    'fecha_programada' => now()->addHour(),
    'customer_id' => $customer->id,
    'opportunity_id' => $opp->id,
    'user_id' => 1,
    'estado' => 'Pendiente',
]);

$out .= "ACT_ID: {$activity->id}\n";

// Crear recordatorio
$rem = Reminder::create([
    'titulo' => 'Recordatorio E2E',
    'tipo' => 'Notificación',
    'fecha_envio' => now()->addMinutes(30),
    'activity_id' => $activity->id,
    'user_id' => 1,
    'estado' => 'Pendiente',
]);

$out .= "REM_ID: {$rem->id}\n";

// Marcar leído
$rem->markAsRead();
$out .= 'REM leido: ' . ($rem->fresh()->leido ? 'si' : 'no') . "\n";

// Consultas SQL de verificación
$out .= "-- opportunities --\n" . print_r(DB::select('select * from opportunities where id = ?', [$opp->id]), true) . "\n";
$out .= "-- activities --\n" . print_r(DB::select('select * from activities where opportunity_id = ?', [$opp->id]), true) . "\n";
$out .= "-- reminders --\n" . print_r(DB::select('select * from reminders where activity_id = ?', [$activity->id]), true) . "\n";

$file = __DIR__ . '/../docs/evidence_crm_flow.txt';
file_put_contents($file, $out);
echo "EVIDENCE_SAVED: {$file}\n";
