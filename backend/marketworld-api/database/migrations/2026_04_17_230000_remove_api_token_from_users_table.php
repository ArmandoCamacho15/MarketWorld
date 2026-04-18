<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Elimina el legado api_token para dejar una sola estrategia de auth (Sanctum).
     */
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'api_token')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['api_token']);
            $table->dropColumn('api_token');
        });
    }

    /**
     * Rollback seguro para restaurar la columna legacy si se requiere.
     */
    public function down(): void
    {
        if (Schema::hasColumn('users', 'api_token')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('api_token', 80)->nullable()->unique()->after('remember_token');
        });
    }
};
