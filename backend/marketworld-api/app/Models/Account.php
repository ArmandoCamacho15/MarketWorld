<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    protected $fillable = ['codigo', 'nombre', 'tipo', 'activo'];

    protected $casts = [
        'activo' => 'boolean',
    ];
}
