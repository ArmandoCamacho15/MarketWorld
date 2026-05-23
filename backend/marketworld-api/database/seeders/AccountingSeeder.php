<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Account;
use App\Models\Invoice;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Models\Purchase;
use Illuminate\Support\Facades\DB;

class AccountingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $accounts = [
            ['codigo' => '1105', 'nombre' => 'Caja General', 'tipo' => 'Activo'],
            ['codigo' => '1110', 'nombre' => 'Bancos', 'tipo' => 'Activo'],
            ['codigo' => '1305', 'nombre' => 'Clientes', 'tipo' => 'Activo'],
            ['codigo' => '1435', 'nombre' => 'Mercancías no fabricadas por la empresa', 'tipo' => 'Activo'],
            ['codigo' => '2205', 'nombre' => 'Proveedores Nacionales', 'tipo' => 'Pasivo'],
            ['codigo' => '2408', 'nombre' => 'Impuesto sobre las ventas por pagar (IVA)', 'tipo' => 'Pasivo'],
            ['codigo' => '4135', 'nombre' => 'Comercio al por mayor y al por menor', 'tipo' => 'Ingreso'],
            ['codigo' => '6135', 'nombre' => 'Costo de Ventas', 'tipo' => 'Gasto'],
        ];

        foreach ($accounts as $account) {
            Account::updateOrCreate(['codigo' => $account['codigo']], $account);
        }

        $this->syncInvoices();
        $this->syncPurchases();
    }

    private function syncInvoices(): void
    {
        $cuentaCaja = Account::where('codigo', '1105')->first();
        $cuentaClientes = Account::where('codigo', '1305')->first();
        $cuentaVentas = Account::where('codigo', '4135')->first();
        $cuentaIVA = Account::where('codigo', '2408')->first();
        $cuentaCostoVentas = Account::where('codigo', '6135')->first();
        $cuentaInventario = Account::where('codigo', '1435')->first();

        Invoice::with(['items.product'])->orderBy('id')->chunkById(50, function ($invoices) use (
            $cuentaCaja,
            $cuentaClientes,
            $cuentaVentas,
            $cuentaIVA,
            $cuentaCostoVentas,
            $cuentaInventario
        ) {
            foreach ($invoices as $invoice) {
                $entry = JournalEntry::firstOrCreate(
                    [
                        'referencia_tipo' => 'Invoice',
                        'referencia_id' => $invoice->id,
                    ],
                    [
                        'fecha' => $invoice->fecha,
                        'glosa' => "Venta Factura #{$invoice->numero_factura}",
                        'user_id' => $invoice->user_id,
                    ]
                );

                $costoTotal = (float) $invoice->items->sum(function ($item) {
                    $product = $item->product;
                    $precioCompra = $product ? (float) ($product->precio_compra ?? 0) : 0;
                    return $precioCompra * (float) ($item->cantidad ?? 0);
                });

                JournalItem::where('journal_entry_id', $entry->id)->delete();

                $cuentaDebito = ($invoice->metodo_pago === 'Contado') ? $cuentaCaja : $cuentaClientes;

                if ($cuentaDebito) {
                    JournalItem::create([
                        'journal_entry_id' => $entry->id,
                        'account_id' => $cuentaDebito->id,
                        'debe' => $invoice->total,
                        'haber' => 0,
                    ]);
                }

                if ($cuentaVentas) {
                    JournalItem::create([
                        'journal_entry_id' => $entry->id,
                        'account_id' => $cuentaVentas->id,
                        'debe' => 0,
                        'haber' => $invoice->subtotal,
                    ]);
                }

                if ($cuentaIVA && (float) $invoice->impuestos > 0) {
                    JournalItem::create([
                        'journal_entry_id' => $entry->id,
                        'account_id' => $cuentaIVA->id,
                        'debe' => 0,
                        'haber' => $invoice->impuestos,
                    ]);
                }

                if ($costoTotal > 0) {
                    if ($cuentaCostoVentas) {
                        JournalItem::create([
                            'journal_entry_id' => $entry->id,
                            'account_id' => $cuentaCostoVentas->id,
                            'debe' => $costoTotal,
                            'haber' => 0,
                        ]);
                    }

                    if ($cuentaInventario) {
                        JournalItem::create([
                            'journal_entry_id' => $entry->id,
                            'account_id' => $cuentaInventario->id,
                            'debe' => 0,
                            'haber' => $costoTotal,
                        ]);
                    }
                }
            }
        });
    }

    private function syncPurchases(): void
    {
        $cuentaInventario = Account::where('codigo', '1435')->first();
        $cuentaCaja = Account::where('codigo', '1105')->first();
        $cuentaProveedores = Account::where('codigo', '2205')->first();

        Purchase::with(['items.product'])->orderBy('id')->chunkById(50, function ($purchases) use ($cuentaInventario, $cuentaCaja, $cuentaProveedores) {
            foreach ($purchases as $purchase) {
                $entry = JournalEntry::firstOrCreate(
                    [
                        'referencia_tipo' => 'Purchase',
                        'referencia_id' => $purchase->id,
                    ],
                    [
                        'fecha' => $purchase->fecha,
                        'glosa' => "Compra Orden #{$purchase->numero_orden}",
                        'user_id' => $purchase->user_id,
                    ]
                );

                JournalItem::where('journal_entry_id', $entry->id)->delete();

                if ($cuentaInventario) {
                    JournalItem::create([
                        'journal_entry_id' => $entry->id,
                        'account_id' => $cuentaInventario->id,
                        'debe' => $purchase->total,
                        'haber' => 0,
                    ]);
                }

                $cuentaCredito = ($purchase->estado === 'Recibida') ? $cuentaCaja : $cuentaProveedores;

                if ($cuentaCredito) {
                    JournalItem::create([
                        'journal_entry_id' => $entry->id,
                        'account_id' => $cuentaCredito->id,
                        'debe' => 0,
                        'haber' => $purchase->total,
                    ]);
                }
            }
        });
    }
}
