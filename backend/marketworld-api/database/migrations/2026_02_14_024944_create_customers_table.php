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
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 200);
            $table->string('documento', 50)->unique();
            $table->enum('tipo_documento', ['CC', 'NIT', 'CE', 'Pasaporte'])->default('CC');
            $table->string('email', 150)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->text('direccion')->nullable();
            $table->string('ciudad', 100)->nullable();
            $table->enum('tipo_cliente', ['Persona Natural', 'Empresa'])->default('Persona Natural');
            $table->enum('segmento', ['Nuevo', 'Frecuente', 'Premium', 'Corporativo'])->default('Nuevo');
            $table->enum('estado', ['Activo', 'Inactivo'])->default('Activo');
            $table->integer('total_compras')->default(0);
            $table->decimal('valor_total', 15, 2)->default(0);
            $table->timestamps();

            $table->index('documento');
            $table->index('estado');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
