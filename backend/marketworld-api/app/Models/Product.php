<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Product extends Model
{
    use HasFactory;

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
     * @param int|null $userId
     * @param string|null $reason
     * @return $this
     */
    public function aplicarCostoPromedioPonderado(int $cantidad, float $precioUnitarioNuevo, ?int $userId = null, ?string $reason = null)
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

        if ($costoActual != $nuevoCosto) {
            \App\Models\CostAdjustment::create([
                'user_id'    => $userId,
                'product_id' => $this->id,
                'old_cost'   => $costoActual,
                'new_cost'   => $nuevoCosto,
                'reason'     => $reason ?: "Cálculo automático PMP (Recepción: {$cantidad} unds @ {$precioUnitarioNuevo})",
            ]);
        }

        return $this;
    }

    /**
     * Registra una salida de stock (Venta o Ajuste).
     *
     * @param int $cantidad Cantidad a descontar (debe ser positiva)
     * @param int|null $userId ID del usuario que realiza la acción
     * @param string|null $reason Motivo del movimiento
     * @return $this
     */
    public function registrarSalida(int $cantidad, ?int $userId = null, ?string $reason = null)
    {
        $this->decrement('stock', max(0, $cantidad));
        
        // Aquí se podría disparar un evento de Kardex en el futuro
        // Event::dispatch(new StockMovement($this, -$cantidad, $userId, $reason));
        
        return $this;
    }

    /**
     * Registra una entrada de stock sin afectar el costo promedio (Anulación o Ajuste).
     *
     * @param int $cantidad Cantidad a sumar (debe ser positiva)
     * @param int|null $userId ID del usuario que realiza la acción
     * @param string|null $reason Motivo del movimiento
     * @return $this
     */
    public function registrarEntrada(int $cantidad, ?int $userId = null, ?string $reason = null)
    {
        $this->increment('stock', max(0, $cantidad));
        return $this;
    }
}
