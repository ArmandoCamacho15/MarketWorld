<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CostAdjustment extends Model
{
    use HasFactory;

    protected $table = 'cost_adjustments';

    protected $fillable = [
        'user_id',
        'product_id',
        'old_cost',
        'new_cost',
        'reason'
    ];
}
