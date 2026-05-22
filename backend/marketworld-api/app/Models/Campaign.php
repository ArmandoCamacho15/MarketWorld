<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Campaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'nombre',
        'descripcion',
        'canal',
        'segment_id',
        'fecha_inicio',
        'fecha_fin',
        'estado',
        'contactados',
        'respuestas',
        'user_id',
    ];

    protected $casts = [
        'fecha_inicio' => 'date',
        'fecha_fin' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'contactados' => 'integer',
        'respuestas' => 'integer',
    ];

    /**
     * Relación: Una campaña pertenece a un segmento
     */
    public function segment()
    {
        return $this->belongsTo(Segment::class);
    }

    /**
     * Relación: Una campaña pertenece a un usuario (creador)
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relación: Una campaña tiene muchas actividades
     */
    public function activities()
    {
        return $this->hasMany(Activity::class);
    }
}
