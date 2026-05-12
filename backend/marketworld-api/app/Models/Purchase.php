<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Purchase extends Model
{
    use HasFactory;

    protected $appends = [
        'paid_total',
        'saldo',
    ];

    protected $fillable = [
        'numero_orden',
        'supplier_id', // Modificado: supplier_id
        'fecha',
        'total',
        'estado',
        'observaciones',
        'user_id'
    ];

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function supplier(): BelongsTo // Nueva relación
    {
        return $this->belongsTo(Supplier::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(PurchasePayment::class);
    }

    public function getPaidTotalAttribute(): float
    {
        if ($this->relationLoaded('payments')) {
            return round((float) $this->payments->sum('monto'), 2);
        }

        return round((float) $this->payments()->sum('monto'), 2);
    }

    public function getSaldoAttribute(): float
    {
        return round(max((float) $this->total - $this->paid_total, 0), 2);
    }
}