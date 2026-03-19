<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'sku',
        'nombre',
        'descripcion',
        'categoria',
        'precio_compra',
        'precio_venta',
        'stock',
        'stock_minimo',
        'iva',
        'unidad',
        'proveedor',
        'estado',
    ];

    protected $casts = [
        'precio_compra' => 'decimal:2',
        'precio_venta'  => 'decimal:2',
        'iva'           => 'decimal:2',
        'stock'         => 'integer',
        'stock_minimo'  => 'integer',
    ];

    public function isStockBajo(): bool
    {
        return $this->stock <= $this->stock_minimo;
    }
}
