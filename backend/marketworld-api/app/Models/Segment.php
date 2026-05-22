<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Segment extends Model
{
    use HasFactory;

    protected $fillable = [
        'nombre',
        'descripcion',
        'criterios',
        'estado',
    ];

    protected $casts = [
        'criterios' => 'json',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relación: Un segmento tiene muchos clientes
     */
    public function customers()
    {
        return $this->hasMany(Customer::class);
    }

    /**
     * Relación: Un segmento tiene muchas campañas
     */
    public function campaigns()
    {
        return $this->hasMany(Campaign::class);
    }
}
