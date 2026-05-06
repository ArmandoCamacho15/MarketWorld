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
        Schema::table('inventory_movements', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_movements', 'referencia_tipo')) {
                $table->string('referencia_tipo')->nullable()->after('motivo');
            }

            if (!Schema::hasColumn('inventory_movements', 'referencia_id')) {
                $table->unsignedBigInteger('referencia_id')->nullable()->after('referencia_tipo');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_movements', function (Blueprint $table) {
            if (Schema::hasColumn('inventory_movements', 'referencia_id')) {
                $table->dropColumn('referencia_id');
            }

            if (Schema::hasColumn('inventory_movements', 'referencia_tipo')) {
                $table->dropColumn('referencia_tipo');
            }
        });
    }
};