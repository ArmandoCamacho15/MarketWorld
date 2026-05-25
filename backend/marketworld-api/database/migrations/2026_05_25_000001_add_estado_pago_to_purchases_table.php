<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('purchases', 'estado_pago')) {
            Schema::table('purchases', function (Blueprint $table) {
                $table->enum('estado_pago', ['pendiente', 'parcial', 'pagada'])
                    ->default('pendiente')
                    ->after('estado');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('purchases', 'estado_pago')) {
            Schema::table('purchases', function (Blueprint $table) {
                $table->dropColumn('estado_pago');
            });
        }
    }
};
