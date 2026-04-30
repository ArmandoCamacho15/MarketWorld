<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('purchase_items')) {
            Schema::create('purchase_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('purchase_id')->constrained()->onDelete('cascade');
                $table->foreignId('product_id')->constrained();
                $table->integer('cantidad');
                $table->decimal('precio_unitario', 15, 2)->nullable();
                $table->decimal('subtotal', 15, 2)->nullable();
                $table->timestamps();
            });
            return;
        }

        if (!Schema::hasColumn('purchase_items', 'precio_unitario')) {
            Schema::table('purchase_items', function (Blueprint $table) {
                $table->decimal('precio_unitario', 15, 2)->nullable()->after('cantidad');
            });
        }

        if (!Schema::hasColumn('purchase_items', 'subtotal')) {
            Schema::table('purchase_items', function (Blueprint $table) {
                $table->decimal('subtotal', 15, 2)->nullable()->after('precio_unitario');
            });
        }

        if (Schema::hasColumn('purchase_items', 'costo_unitario') && Schema::hasColumn('purchase_items', 'precio_unitario')) {
            DB::table('purchase_items')
                ->whereNull('precio_unitario')
                ->update(['precio_unitario' => DB::raw('costo_unitario')]);
        }
    }

    public function down(): void
    {
        if (!Schema::hasTable('purchase_items')) {
            return;
        }

        if (Schema::hasColumn('purchase_items', 'precio_unitario')) {
            Schema::table('purchase_items', function (Blueprint $table) {
                $table->dropColumn('precio_unitario');
            });
        }

        if (!Schema::hasColumn('purchase_items', 'costo_unitario')) {
            Schema::table('purchase_items', function (Blueprint $table) {
                $table->decimal('costo_unitario', 15, 2)->nullable()->after('cantidad');
            });
        }
    }
};