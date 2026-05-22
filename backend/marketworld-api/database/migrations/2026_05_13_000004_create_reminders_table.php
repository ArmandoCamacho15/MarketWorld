<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('reminders', function (Blueprint $table) {
            $table->id();
            $table->string('titulo');
            $table->text('descripcion')->nullable();
            $table->enum('tipo', ['Email', 'Notificación', 'SMS', 'Push'])->default('Notificación');
            $table->dateTime('fecha_envio');
            $table->enum('estado', ['Pendiente', 'Enviado', 'Fallido'])->default('Pendiente');
            $table->foreignId('activity_id')->constrained('activities')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->boolean('leido')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'leido', 'fecha_envio']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reminders');
    }
};
