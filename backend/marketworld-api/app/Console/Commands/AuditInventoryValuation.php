<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AuditInventoryValuation extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'inventory:audit {--threshold_pct=2} {--threshold_abs=1000}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Audita la valorización del inventario por producto y lista discrepancias entre costo y precio de venta';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $pct = (float) $this->option('threshold_pct');
        $abs = (float) $this->option('threshold_abs');

        $this->info("Auditando valorización del inventario (umbral: {$pct}% / ".number_format($abs,2).")");

        $products = DB::table('products')->select('id','sku','nombre','precio_compra','precio_venta','stock')->get();

        $rows = [];
        $totalByCost = 0.0;
        $totalByPrice = 0.0;

        foreach ($products as $p) {
            $pc = (float) ($p->precio_compra ?? 0);
            $pv = (float) ($p->precio_venta ?? 0);
            $stock = (float) ($p->stock ?? 0);

            $valByCost = $pc * $stock;
            $valByPrice = $pv * $stock;

            $totalByCost += $valByCost;
            $totalByPrice += $valByPrice;

            $diff = abs($valByCost - $valByPrice);
            $pctDiff = $valByPrice > 0 ? ($diff / $valByPrice) * 100.0 : ($diff > 0 ? 100.0 : 0.0);

            $rows[] = [
                'id' => $p->id,
                'sku' => $p->sku,
                'nombre' => $p->nombre,
                'stock' => (int)$stock,
                'precio_compra' => $pc,
                'precio_venta' => $pv,
                'val_by_cost' => $valByCost,
                'val_by_price' => $valByPrice,
                'diff' => $diff,
                'pct' => $pctDiff,
            ];
        }

        // Filtrar discrepancias
        $suspects = array_filter($rows, function($r) use ($pct, $abs) {
            return ($r['pct'] > $pct) || ($r['diff'] > $abs);
        });

        // Mostrar resumen
        $this->info('Productos analizados: '.count($rows));
        $this->info('Total valorización (por costo): $'.number_format($totalByCost,2,',','.'));
        $this->info('Total valorización (por precio): $'.number_format($totalByPrice,2,',','.'));
        $this->info('Discrepancias encontradas: '.count($suspects));

        if (count($suspects) === 0) {
            $this->info('No se encontraron discrepancias significativas.');
            return 0;
        }

        // Imprimir tabla de discrepancias
        $table = [];
        foreach ($suspects as $s) {
            $table[] = [
                $s['id'],
                $s['sku'],
                $s['nombre'],
                number_format($s['stock'],0,',','.'),
                '$'.number_format($s['precio_compra'],2,',','.'),
                '$'.number_format($s['precio_venta'],2,',','.'),
                '$'.number_format($s['val_by_cost'],2,',','.'),
                '$'.number_format($s['val_by_price'],2,',','.'),
                '$'.number_format($s['diff'],2,',','.'),
                number_format($s['pct'],2,',','.').'%'
            ];
        }

        $this->table(['ID','SKU','Nombre','Stock','PrecioCompra','PrecioVenta','ValByCost','ValByPrice','Diff','Pct'], $table);

        return 0;
    }
}
