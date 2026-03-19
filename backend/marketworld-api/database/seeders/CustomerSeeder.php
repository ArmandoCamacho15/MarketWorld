<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            [
                'nombre'        => 'Distribuidora El Sol S.A.S',
                'documento'     => '900123456-1',
                'tipo_documento'=> 'NIT',
                'email'         => 'contacto@elsol.com',
                'telefono'      => '3001234567',
                'direccion'     => 'Calle 50 #20-30',
                'ciudad'        => 'Bogotá',
                'tipo_cliente'  => 'Empresa',
                'segmento'      => 'Frecuente',
                'estado'        => 'Activo',
            ],
            [
                'nombre'        => 'María Rodríguez',
                'documento'     => '1098765432',
                'tipo_documento'=> 'CC',
                'email'         => 'maria.rodriguez@email.com',
                'telefono'      => '3109876543',
                'direccion'     => 'Carrera 15 #45-67',
                'ciudad'        => 'Medellín',
                'tipo_cliente'  => 'Persona Natural',
                'segmento'      => 'Nuevo',
                'estado'        => 'Activo',
            ],
            [
                'nombre'        => 'Supermercado La Plaza Ltda',
                'documento'     => '890456789-2',
                'tipo_documento'=> 'NIT',
                'email'         => 'info@laplaza.com',
                'telefono'      => '3205551234',
                'direccion'     => 'Avenida 80 #100-25',
                'ciudad'        => 'Cali',
                'tipo_cliente'  => 'Empresa',
                'segmento'      => 'Premium',
                'estado'        => 'Activo',
            ],
            [
                'nombre'        => 'Carlos Pérez',
                'documento'     => '1045678901',
                'tipo_documento'=> 'CC',
                'email'         => 'carlos.perez@email.com',
                'telefono'      => '3154445566',
                'direccion'     => 'Calle 10 #5-20',
                'ciudad'        => 'Bucaramanga',
                'tipo_cliente'  => 'Persona Natural',
                'segmento'      => 'Nuevo',
                'estado'        => 'Activo',
            ],
        ];

        foreach ($customers as $customer) {
            Customer::firstOrCreate(['documento' => $customer['documento']], $customer);
        }
    }
}
