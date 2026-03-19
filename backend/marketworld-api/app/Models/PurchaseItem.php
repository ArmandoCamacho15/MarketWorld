<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseItem extends Model
{
    protected $fillable = [
        'purchase_id',
        'product_id',
        'cantidad',
        'costo_unitario',
        'subtotal'
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
