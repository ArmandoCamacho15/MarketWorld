<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ImportedSuppliersSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            [
                'id' => 1,
                'nombre' => 'Tecnología Global S.A.',
                'nit' => '900123456-1',
                'contacto' => 'Carlos Mendoza',
                'email' => 'carlos@tecnoglobal.com',
                'telefono' => '(601) 345 6789',
                'direccion' => 'Calle 100 #25-30, Bogotá',
                'ciudad' => 'Bogotá',
                'terminosPago' => '30 días',
                'descuento' => 5,
                'tipo' => 'Premium',
                'activo' => true,
                'fechaCreacion' => '2025-01-15T10:00:00.000Z',
            ],
            [
                'id' => 2,
                'nombre' => 'Distribuidora Alimentos S.A.S.',
                'nit' => '800987654-2',
                'contacto' => 'María Rodríguez',
                'email' => 'maria@distribalimentos.com',
                'telefono' => '(604) 567 8901',
                'direccion' => 'Carrera 45 #12-10, Medellín',
                'ciudad' => 'Medellín',
                'terminosPago' => '60 días',
                'descuento' => 3,
                'tipo' => 'Regular',
                'activo' => true,
                'fechaCreacion' => '2025-02-20T10:00:00.000Z',
            ],
            [
                'id' => 3,
                'nombre' => 'Suministros Industriales Ltda.',
                'nit' => '700654321-3',
                'contacto' => 'Roberto Sánchez',
                'email' => 'roberto@suministrosind.com',
                'telefono' => '(602) 234 5678',
                'direccion' => 'Av. 6N #25-30, Cali',
                'ciudad' => 'Cali',
                'terminosPago' => '30 días',
                'descuento' => 0,
                'tipo' => 'Regular',
                'activo' => true,
                'fechaCreacion' => '2025-03-10T10:00:00.000Z',
            ],
            [
                'id' => 4,
                'nombre' => 'Tech Solutions',
                'nit' => 'AUTO-1773886958733-5',
                'contacto' => '',
                'email' => '',
                'telefono' => '',
                'direccion' => '',
                'ciudad' => '',
                'terminosPago' => '30 días',
                'descuento' => 0,
                'tipo' => 'Regular',
                'activo' => true,
                'fechaCreacion' => '2026-03-19',
            ],
            [
                'id' => 5,
                'nombre' => 'Confecciones Ltda',
                'nit' => 'AUTO-1773886958733-6',
                'contacto' => '',
                'email' => '',
                'telefono' => '',
                'direccion' => '',
                'ciudad' => '',
                'terminosPago' => '30 días',
                'descuento' => 0,
                'tipo' => 'Regular',
                'activo' => true,
                'fechaCreacion' => '2026-03-19',
            ],
            [
                'id' => 6,
                'nombre' => 'Distribuciones Alimentarias',
                'nit' => 'AUTO-1773886958733-7',
                'contacto' => '',
                'email' => '',
                'telefono' => '',
                'direccion' => '',
                'ciudad' => '',
                'terminosPago' => '30 días',
                'descuento' => 0,
                'tipo' => 'Regular',
                'activo' => true,
                'fechaCreacion' => '2026-03-19',
            ],
            [
                'id' => 7,
                'nombre' => 'Apple corporation',
                'nit' => 'AUTO-1773886958733-8',
                'contacto' => '',
                'email' => '',
                'telefono' => '',
                'direccion' => '',
                'ciudad' => '',
                'terminosPago' => '30 días',
                'descuento' => 0,
                'tipo' => 'Regular',
                'activo' => true,
                'fechaCreacion' => '2026-03-19',
            ],
            [
                'id' => 8,
                'nombre' => 'alberto vo5',
                'nit' => 'AUTO-1773886958733-9',
                'contacto' => '',
                'email' => '',
                'telefono' => '',
                'direccion' => '',
                'ciudad' => '',
                'terminosPago' => '30 días',
                'descuento' => 0,
                'tipo' => 'Regular',
                'activo' => true,
                'fechaCreacion' => '2026-03-19',
            ],
        ];

        foreach ($suppliers as $s) {
            try {
                $createdAt = isset($s['fechaCreacion']) && $s['fechaCreacion'] ? Carbon::parse($s['fechaCreacion'])->toDateTimeString() : Carbon::now()->toDateTimeString();
            } catch (\Exception $e) {
                $createdAt = Carbon::now()->toDateTimeString();
            }

            DB::table('suppliers')->updateOrInsert(
                ['nit_ruc' => $s['nit']],
                [
                    'nombre' => $s['nombre'] ?? '',
                    'nit_ruc' => $s['nit'] ?? null,
                    'telefono' => $s['telefono'] ?? '',
                    'email' => $s['email'] ?? '',
                    'direccion' => $s['direccion'] ?? '',
                    'estado' => (isset($s['activo']) && $s['activo']) ? 'Activo' : 'Inactivo',
                    'created_at' => $createdAt,
                    'updated_at' => Carbon::now()->toDateTimeString(),
                ]
            );
        }
    }
}
