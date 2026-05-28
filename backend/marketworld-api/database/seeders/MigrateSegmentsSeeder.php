<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Segment;
use App\Models\Customer;

class MigrateSegmentsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Iniciando migración de customers.segmento -> customers.segment_id');

        $segmentValues = DB::table('customers')->select('segmento')->distinct()->pluck('segmento')->filter()->values();

        foreach ($segmentValues as $segName) {
            $this->command->info("Procesando segmento: {$segName}");
            $segment = Segment::firstOrCreate([
                'nombre' => $segName,
            ], [
                'descripcion' => 'Creado desde migración de segmento textual',
                'criterios' => null,
                'estado' => 'Activo',
            ]);

            // Actualizar customers que tienen este valor y no tienen segment_id
            $updated = DB::table('customers')
                ->where('segmento', $segName)
                ->whereNull('segment_id')
                ->update(['segment_id' => $segment->id]);

            $this->command->info("Clientes actualizados para segmento '{$segName}': {$updated}");
        }

        $this->command->info('Migración de segmentos completada. Revisa los resultados antes de eliminar la columna textual.');
    }
}
