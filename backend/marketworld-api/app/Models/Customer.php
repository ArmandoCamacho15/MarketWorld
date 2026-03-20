<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $fillable = [
        'nombre',
        'documento',
        'tipo_documento',
        'email',
        'telefono',
        'direccion',
        'ciudad',
        'tipo_cliente',
        'segmento',
        'estado',
        'total_compras',
        'valor_total',
    ];

    protected $casts = [
        'valor_total'   => 'decimal:2',
        'total_compras' => 'integer',
    ];

    /**
     * Relación con las facturas del cliente.
     */
    public function invoices(): \Illuminate\Database\Eloquent\Relations\HasMany // Nueva relación
    {
        return $this->hasMany(Invoice::class);
    }
}
