<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('purchases', 'proveedor')) {
            Schema::table('purchases', function (Blueprint $table) {
                $table->dropColumn('proveedor');
            });
        }

        if (!Schema::hasColumn('purchases', 'supplier_id')) {
            Schema::table('purchases', function (Blueprint $table) {
                $table->foreignId('supplier_id')->nullable()->after('numero_orden')->constrained('suppliers');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('purchases', 'supplier_id')) {
            Schema::table('purchases', function (Blueprint $table) {
                $table->dropConstrainedForeignId('supplier_id');
            });
        }

        if (!Schema::hasColumn('purchases', 'proveedor')) {
            Schema::table('purchases', function (Blueprint $table) {
                $table->string('proveedor')->after('numero_orden');
            });
        }
    }
};