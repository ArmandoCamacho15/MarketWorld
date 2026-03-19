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
        Schema::create('purchases', function (Blueprint $table) {
            $table->id();
            $table->string('numero_orden')->unique();
            $table->string('proveedor');
            $table->dateTime('fecha');
            $table->decimal('total', 15, 2);
            $table->enum('estado', ['Recibida', 'Pendiente', 'Cancelada'])->default('Recibida');
            $table->text('observaciones')->nullable();
            $table->foreignId('user_id')->constrained(); // Responsable
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchases');
    }
};
