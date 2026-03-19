<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            [
                'sku'           => 'PROD-001',
                'nombre'        => 'Laptop HP 15',
                'descripcion'   => 'Laptop HP 15 pulgadas, Intel i5, 8GB RAM',
                'categoria'     => 'Electrónica',
                'precio_compra' => 2000000,
                'precio_venta'  => 2500000,
                'stock'         => 15,
                'stock_minimo'  => 5,
                'iva'           => 19.00,
                'unidad'        => 'Unidad',
                'proveedor'     => 'Tech Solutions',
                'estado'        => 'Activo',
            ],
            [
                'sku'           => 'PROD-002',
                'nombre'        => 'Mouse Logitech M185',
                'descripcion'   => 'Mouse inalámbrico Logitech M185',
                'categoria'     => 'Electrónica',
                'precio_compra' => 30000,
                'precio_venta'  => 45000,
                'stock'         => 50,
                'stock_minimo'  => 10,
                'iva'           => 19.00,
                'unidad'        => 'Unidad',
                'proveedor'     => 'Tech Solutions',
                'estado'        => 'Activo',
            ],
            [
                'sku'           => 'PROD-003',
                'nombre'        => 'Teclado Mecánico RGB',
                'descripcion'   => 'Teclado mecánico RGB retroiluminado',
                'categoria'     => 'Electrónica',
                'precio_compra' => 120000,
                'precio_venta'  => 180000,
                'stock'         => 3,
                'stock_minimo'  => 5,
                'iva'           => 19.00,
                'unidad'        => 'Unidad',
                'proveedor'     => 'Tech Solutions',
                'estado'        => 'Activo',
            ],
            [
                'sku'           => 'PROD-004',
                'nombre'        => 'Camiseta Polo Hombre',
                'descripcion'   => 'Camiseta tipo polo 100% algodón',
                'categoria'     => 'Ropa',
                'precio_compra' => 25000,
                'precio_venta'  => 45000,
                'stock'         => 100,
                'stock_minimo'  => 20,
                'iva'           => 19.00,
                'unidad'        => 'Unidad',
                'proveedor'     => 'Confecciones Ltda',
                'estado'        => 'Activo',
            ],
            [
                'sku'           => 'PROD-005',
                'nombre'        => 'Arroz Diana 5kg',
                'descripcion'   => 'Arroz blanco premium bulto 5 kilos',
                'categoria'     => 'Alimentos',
                'precio_compra' => 12000,
                'precio_venta'  => 18000,
                'stock'         => 200,
                'stock_minimo'  => 50,
                'iva'           => 0.00,
                'unidad'        => 'Bulto',
                'proveedor'     => 'Distribuciones Alimentarias',
                'estado'        => 'Activo',
            ],
        ];

        foreach ($products as $product) {
            Product::firstOrCreate(['sku' => $product['sku']], $product);
        }
    }
}
