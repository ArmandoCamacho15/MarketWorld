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
        Schema::table('customers', function (Blueprint $table) {
            // Agregar segment_id si no existe
            if (!Schema::hasColumn('customers', 'segment_id')) {
                $table->foreignId('segment_id')->nullable()->constrained('segments')->onDelete('set null')->after('segmento');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropForeignIdFor('Segment');
            $table->dropColumn('segment_id');
        });
    }
};
