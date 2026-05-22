<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Reminder extends Model
{
    use HasFactory;

    protected $fillable = [
        'titulo',
        'descripcion',
        'tipo',
        'fecha_envio',
        'estado',
        'activity_id',
        'user_id',
        'leido',
    ];

    protected $casts = [
        'fecha_envio' => 'datetime',
        'leido' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relación: Un recordatorio pertenece a una actividad
     */
    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    /**
     * Relación: Un recordatorio pertenece a un usuario
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Marcar recordatorio como leído
     */
    public function markAsRead()
    {
        $this->update(['leido' => true]);
    }
}
