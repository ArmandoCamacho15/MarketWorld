<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            if (!Schema::hasColumn('customers', 'limite_credito')) {
                $table->decimal('limite_credito', 15, 2)->nullable();
            }

            if (!Schema::hasColumn('customers', 'ejecutivo_asignado')) {
                $table->string('ejecutivo_asignado', 150)->nullable();
            }

            if (!Schema::hasColumn('customers', 'notas')) {
                $table->text('notas')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            if (Schema::hasColumn('customers', 'notas')) {
                $table->dropColumn('notas');
            }

            if (Schema::hasColumn('customers', 'ejecutivo_asignado')) {
                $table->dropColumn('ejecutivo_asignado');
            }

            if (Schema::hasColumn('customers', 'limite_credito')) {
                $table->dropColumn('limite_credito');
            }
        });
    }
};
