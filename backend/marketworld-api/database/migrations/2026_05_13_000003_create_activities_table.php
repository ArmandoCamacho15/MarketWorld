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
        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->string('titulo');
            $table->text('descripcion')->nullable();
            $table->enum('tipo', ['Llamada', 'Email', 'Reunión', 'Seguimiento', 'Propuesta', 'Otra'])->default('Llamada');
            $table->enum('estado', ['Pendiente', 'En Progreso', 'Completada', 'Cancelada'])->default('Pendiente');
            $table->dateTime('fecha_programada')->nullable();
            $table->dateTime('fecha_completada')->nullable();
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
            $table->foreignId('opportunity_id')->nullable()->constrained('opportunities')->onDelete('set null');
            $table->foreignId('campaign_id')->nullable()->constrained('campaigns')->onDelete('set null');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->text('notas')->nullable();
            $table->timestamps();

            $table->index(['customer_id', 'estado']);
            $table->index(['user_id', 'fecha_programada']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
