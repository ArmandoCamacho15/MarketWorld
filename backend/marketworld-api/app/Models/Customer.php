<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Customer extends Model
{
    use HasFactory;

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
        'limite_credito',
        'ejecutivo_asignado',
        'notas',
        'total_compras',
        'valor_total',
    ];

    protected $casts = [
        'valor_total'   => 'decimal:2',
        'limite_credito' => 'decimal:2',
        'total_compras' => 'integer',
    ];

    /**
     * Relación con las facturas del cliente.
     */
    public function invoices(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    /**
     * Relación: Un cliente pertenece a un segmento
     */
    public function segment()
    {
        return $this->belongsTo(Segment::class);
    }

    /**
     * Relación: Un cliente tiene muchas actividades
     */
    public function activities()
    {
        return $this->hasMany(Activity::class);
    }

    /**
     * Relación: Un cliente tiene muchas oportunidades
     */
    public function opportunities()
    {
        return $this->hasMany(Opportunity::class);
    }
}
