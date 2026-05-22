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
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->enum('canal', ['Email', 'WhatsApp', 'SMS', 'Llamada', 'Presencial'])->default('Email');
            $table->foreignId('segment_id')->nullable()->constrained('segments')->onDelete('set null');
            $table->date('fecha_inicio');
            $table->date('fecha_fin')->nullable();
            $table->enum('estado', ['Pendiente', 'Activa', 'Pausada', 'Completada', 'Cancelada'])->default('Pendiente');
            $table->integer('contactados')->default(0);
            $table->integer('respuestas')->default(0);
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            $table->index(['estado', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
