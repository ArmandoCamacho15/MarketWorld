<?php

// Bootstrap Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

use App\Models\User;
use App\Models\Supplier;
use App\Models\Product;
use App\Models\Customer;
use App\Models\Purchase;
use App\Models\Invoice;
use App\Models\JournalEntry;

use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\InvoiceController;

$out = "";

// Seed accounting chart
$out .= "Running AccountingSeeder...\n";
$kernel->call('db:seed', ['--class' => 'AccountingSeeder']);
$out .= "AccountingSeeder finished.\n";

// Ensure there is a user to act as actor
$user = User::first();
if (! $user) {
    $user = User::create(["name" => "E2E Admin", "email" => "e2e-admin@example.com", "password" => bcrypt('password'),]);
    $out .= "Created user id={$user->id}\n";
} else {
    $out .= "Using user id={$user->id}\n";
}

// Ensure supplier
$supplier = Supplier::where('estado', 'Activo')->first();
if (! $supplier) {
    $supplier = Supplier::create(['nombre' => 'Proveedor E2E', 'estado' => 'Activo']);
    $out .= "Created supplier id={$supplier->id}\n";
} else {
    $out .= "Using supplier id={$supplier->id}\n";
}

// Ensure product
$product = Product::first();
if (! $product) {
    $product = Product::create([
        'nombre' => 'Producto E2E',
        'precio_compra' => 10.00,
        'precio_venta' => 20.00,
        'stock' => 100,
    ]);
    $out .= "Created product id={$product->id}\n";
} else {
    // ensure stock and prices
    $product->precio_compra = $product->precio_compra ?: 10.00;
    $product->precio_venta = $product->precio_venta ?: 20.00;
    if ($product->stock < 10) $product->stock = 100;
    $product->save();
    $out .= "Using product id={$product->id}\n";
}

// Ensure customer
$customer = Customer::where('estado', 'Activo')->first();
if (! $customer) {
    $customer = Customer::create(['nombre' => 'Cliente E2E', 'documento' => 'C-E2E', 'email' => 'cliente-e2e@example.com', 'estado' => 'Activo']);
    $out .= "Created customer id={$customer->id}\n";
} else {
    $out .= "Using customer id={$customer->id}\n";
}

// Helper to set user resolver on request
function makeRequest(array $data, $user)
{
    $req = Request::create('/', 'POST', $data);
    $req->setUserResolver(function () use ($user) { return $user; });
    return $req;
}

// 1) Create a purchase (received)
$out .= "Creating Purchase...\n";
$purchaseData = [
    'numero_orden' => 'E2E-P-' . time(),
    'supplier_id' => $supplier->id,
    'fecha' => now()->toDateString(),
    'items' => [
        ['product_id' => $product->id, 'cantidad' => 5, 'precio_unitario' => 12.00],
    ],
    'estado' => 'Recibida',
];

$purchaseReq = makeRequest($purchaseData, $user);
$purchaseController = new PurchaseController();
$resp = $purchaseController->store($purchaseReq);
// Response is JsonResponse; extract data
$respData = json_decode($resp->getContent(), true);
if (!empty($respData['success'])) {
    $purchaseId = $respData['data']['id'] ?? null;
    $out .= "Purchase created id={$purchaseId}\n";
} else {
    $out .= "Purchase creation failed: " . ($respData['message'] ?? json_encode($respData)) . "\n";
}

// 2) Create an invoice (sale)
$out .= "Creating Invoice...\n";
$invoiceData = [
    'numero_factura' => 'E2E-I-' . time(),
    'customer_id' => $customer->id,
    'fecha' => now()->toDateString(),
    'metodo_pago' => 'Contado',
    'items' => [
        ['product_id' => $product->id, 'cantidad' => 2],
    ],
];

$invoiceReq = makeRequest($invoiceData, $user);
$invoiceController = new InvoiceController();
$iResp = $invoiceController->store($invoiceReq);
$iRespData = json_decode($iResp->getContent(), true);
if (!empty($iRespData['success'])) {
    $invoiceId = $iRespData['data']['id'] ?? null;
    $out .= "Invoice created id={$invoiceId}\n";
} else {
    $out .= "Invoice creation failed: " . ($iRespData['message'] ?? json_encode($iRespData)) . "\n";
}

// 3) Anular la factura (if created)
if (!empty($invoiceId)) {
    $out .= "Annulling Invoice id={$invoiceId}...\n";
    $annulReq = Request::create('/', 'PUT', ['estado' => 'Anulada', 'motivo_anulacion' => 'Prueba E2E de anulación']);
    $annulReq->setUserResolver(function () use ($user) { return $user; });
    $invoice = Invoice::find($invoiceId);
    $uResp = $invoiceController->update($annulReq, $invoice);
    $uData = json_decode($uResp->getContent(), true);
    if (!empty($uData['success'])) {
        $out .= "Invoice annulled id={$invoiceId}\n";
    } else {
        $out .= "Invoice annul failed: " . ($uData['message'] ?? json_encode($uData)) . "\n";
    }
}

// 4) Dump journal entries and items for the created refs
$out .= "Dumping journal entries...\n";
$entries = JournalEntry::with('items.account')->whereIn('referencia_tipo', ['Purchase', 'Invoice', 'PurchasePayment'])->orderBy('created_at', 'desc')->get();
$out .= "-- journal_entries --\n" . print_r($entries->toArray(), true) . "\n";

$file = __DIR__ . '/../docs/evidence_accounting_flow.txt';
file_put_contents($file, $out);
echo "EVIDENCE_SAVED: {$file}\n";
