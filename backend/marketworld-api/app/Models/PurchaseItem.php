<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseItem extends Model
{
    /** @use HasFactory<\Database\Factories\PurchaseItemFactory> */
    use \Illuminate\Database\Eloquent\Factories\HasFactory;

    protected $fillable = [
        'purchase_id',
        'product_id',
        'cantidad',
        'precio_unitario', // Renombrado de costo_unitario
        'subtotal'
    ];

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
