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
        'estado_pago',
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

    /**
     * Recalcula estado_pago según pagos acumulados (pendiente | parcial | pagada).
     */
    public function syncEstadoPago(): void
    {
        $paid = $this->paid_total;
        $total = (float) $this->total;

        if ($paid <= 0) {
            $estadoPago = 'pendiente';
        } elseif ($paid >= round($total - 0.01, 2)) {
            $estadoPago = 'pagada';
        } else {
            $estadoPago = 'parcial';
        }

        if ($this->estado_pago !== $estadoPago) {
            $this->forceFill(['estado_pago' => $estadoPago])->save();
        }
    }
}