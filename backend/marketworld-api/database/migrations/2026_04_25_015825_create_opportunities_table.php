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
        Schema::create('opportunities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->onDelete('cascade');
            $table->string('titulo');
            $table->decimal('valor_estimado', 15, 2)->default(0);
            // Etapas del pipeline comercial
            $table->enum('etapa', ['prospecto', 'contactado', 'propuesta', 'negociacion', 'ganado', 'perdido'])
                  ->default('prospecto');
            $table->date('fecha_estimada_cierre')->nullable();
            $table->text('notas')->nullable();
            $table->foreignId('user_id')->constrained(); // Vendedor responsable
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('opportunities');
    }
};
