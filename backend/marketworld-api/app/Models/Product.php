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

    /**
     * Aplica el Costo Promedio Ponderado (CPP) al recibir una compra.
     * Calcula el nuevo costo promedio y actualiza el stock y precio de compra.
     *
     * @param int $cantidad
     * @param float $precioUnitarioNuevo
     * @return $this
     */
    public function aplicarCostoPromedioPonderado(int $cantidad, float $precioUnitarioNuevo)
    {
        $stockActual = (int) ($this->stock ?? 0);
        $costoActual = (float) ($this->precio_compra ?? 0.0);

        $cantidadEntrante = max(0, $cantidad);
        $nuevoStock = $stockActual + $cantidadEntrante;

        if ($nuevoStock <= 0) {
            return $this;
        }

        $nuevoCosto = ($stockActual * $costoActual + $cantidadEntrante * $precioUnitarioNuevo) / $nuevoStock;
        $nuevoCosto = round($nuevoCosto, 2);

        $this->stock = $nuevoStock;
        $this->precio_compra = $nuevoCosto;
        $this->save();

        return $this;
    }
}
