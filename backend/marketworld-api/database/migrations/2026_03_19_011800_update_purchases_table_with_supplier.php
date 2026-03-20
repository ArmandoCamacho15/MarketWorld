<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            // Eliminar la columna anterior
            $table->dropColumn('proveedor');
            // Agregar la nueva relación con nulabilidad temporal para evitar error de integridad
            $table->foreignId('supplier_id')->nullable()->after('numero_orden')->constrained('suppliers');
        });
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropColumn('supplier_id');
            $table->string('proveedor')->after('numero_orden');
        });
    }
};