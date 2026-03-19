<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceItem extends Model
{
    protected $fillable = [
        'invoice_id',
        'product_id',
        'cantidad',
        'precio_unitario',
        'descuento',
        'subtotal'
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
