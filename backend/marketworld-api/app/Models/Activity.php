<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Activity extends Model
{
    use HasFactory;

    protected $fillable = [
        'titulo',
        'descripcion',
        'tipo',
        'estado',
        'fecha_programada',
        'fecha_completada',
        'customer_id',
        'opportunity_id',
        'campaign_id',
        'user_id',
        'notas',
    ];

    protected $casts = [
        'fecha_programada' => 'datetime',
        'fecha_completada' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relación: Una actividad pertenece a un cliente
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Relación: Una actividad pertenece a una oportunidad (opcional)
     */
    public function opportunity()
    {
        return $this->belongsTo(Opportunity::class);
    }

    /**
     * Relación: Una actividad pertenece a una campaña (opcional)
     */
    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }

    /**
     * Relación: Una actividad pertenece a un usuario (responsable)
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relación: Una actividad tiene muchos recordatorios
     */
    public function reminders()
    {
        return $this->hasMany(Reminder::class);
    }
}
