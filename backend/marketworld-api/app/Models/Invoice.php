<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    protected $fillable = [
        'numero_factura',
        'customer_id',
        'fecha',
        'subtotal',
        'impuestos',
        'total',
        'metodo_pago',
        'estado',
        'notas',
        'user_id'
    ];

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function customer(): BelongsTo // Nueva relación
    {
        return $this->belongsTo(Customer::class);
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Accessor para el total calculado: subtotal + impuestos.
     */
    public function getTotalCalculadoAttribute(): float // Nuevo accessor
    {
        return (float) ($this->subtotal + $this->impuestos);
    }
}
