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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('numero_factura')->unique();
            $table->foreignId('customer_id')->nullable()->constrained();
            $table->dateTime('fecha');
            $table->decimal('subtotal', 15, 2);
            $table->decimal('impuestos', 15, 2);
            $table->decimal('total', 15, 2);
            $table->string('metodo_pago'); // Efectivo, Tarjeta, Transferencia
            $table->enum('estado', ['Pagada', 'Pendiente', 'Anulada'])->default('Pagada');
            $table->text('notas')->nullable();
            $table->foreignId('user_id')->constrained(); // Vendedor
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
