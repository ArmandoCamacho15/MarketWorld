<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            if (!Schema::hasColumn('categories', 'nombre')) {
                $table->string('nombre', 100)->nullable()->after('id');
            }

            if (!Schema::hasColumn('categories', 'descripcion')) {
                $table->text('descripcion')->nullable()->after('nombre');
            }

            if (!Schema::hasColumn('categories', 'activo')) {
                $table->boolean('activo')->default(true)->after('descripcion');
            }
        });

        if (Schema::hasColumn('categories', 'nombre')) {
            $categorias = DB::table('products')
                ->select('categoria')
                ->whereNotNull('categoria')
                ->where('categoria', '<>', '')
                ->distinct()
                ->pluck('categoria');

            foreach ($categorias as $categoria) {
                DB::table('categories')->updateOrInsert(
                    ['nombre' => $categoria],
                    [
                        'descripcion' => null,
                        'activo' => true,
                        'updated_at' => now(),
                        'created_at' => now(),
                    ]
                );
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            if (Schema::hasColumn('categories', 'activo')) {
                $table->dropColumn('activo');
            }

            if (Schema::hasColumn('categories', 'descripcion')) {
                $table->dropColumn('descripcion');
            }

            if (Schema::hasColumn('categories', 'nombre')) {
                $table->dropColumn('nombre');
            }
        });
    }
};