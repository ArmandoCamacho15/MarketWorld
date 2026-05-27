<?php

namespace App\Services;

use App\Models\Product;
use App\Models\InventoryMovement;
use App\Models\CompanySetting;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class InventoryService
{
    /**
     * Calcula el Costo Promedio Ponderado usando bcmath.
     *
     * @param float $stockActual
     * @param float $costoActual
     * @param float $cantidadEntrante
     * @param float $precioUnitarioNuevo
     * @param int $decimals
     * @return float
     */
    public function calcularCostoPromedioPonderado(float $stockActual, float $costoActual, float $cantidadEntrante, float $precioUnitarioNuevo, int $decimals = 4): float
    {
        if ($cantidadEntrante < 0) {
            throw new InvalidArgumentException("La cantidad entrante no puede ser negativa.");
        }

        if ($stockActual <= 0) {
            return round($precioUnitarioNuevo, $decimals);
        }

        $stockTotal = bcadd((string)$stockActual, (string)$cantidadEntrante, 6);
        
        if (bccomp($stockTotal, '0', 6) == 0) {
            throw new InvalidArgumentException("El stock total no puede ser cero.");
        }

        $valorActual = bcmul((string)$stockActual, (string)$costoActual, 6);
        $valorEntrante = bcmul((string)$cantidadEntrante, (string)$precioUnitarioNuevo, 6);
        $valorTotal = bcadd($valorActual, $valorEntrante, 6);

        $nuevoCosto = bcdiv($valorTotal, $stockTotal, $decimals + 2); // Calculamos con 2 decimales extra para redondeo simétrico

        return round((float)$nuevoCosto, $decimals);
    }

    /**
     * Obtiene el número de decimales configurado para el CPP.
     *
     * @return int
     */
    protected function getCppDecimals(): int
    {
        try {
            $setting = CompanySetting::query()->latest('id')->first();
            $decimals = (int) ($setting->cpp_decimals ?? 4);

            return max(0, min($decimals, 6));
        } catch (\Throwable $e) {
            return 4;
        }
    }

    /**
     * Registra una entrada por compra y actualiza el costo promedio.
     */
    public function entradaPorCompra(Product $product, int $cantidad, float $precioUnitarioNuevo, ?int $userId, string $referenciaTipo, int $referenciaId): Product
    {
        if ($cantidad <= 0) {
            throw new InvalidArgumentException("La cantidad debe ser mayor a cero.");
        }

        return DB::transaction(function () use ($product, $cantidad, $precioUnitarioNuevo, $userId, $referenciaTipo, $referenciaId) {
            // Lock row
            $product = Product::lockForUpdate()->find($product->id);
            $stockAnterior = $product->stock;
            $costoAnterior = $product->precio_compra;

            $decimals = $this->getCppDecimals();
            $nuevoCosto = $this->calcularCostoPromedioPonderado($stockAnterior, $costoAnterior, $cantidad, $precioUnitarioNuevo, $decimals);
            $stockNuevo = $stockAnterior + $cantidad;

            $product->stock = $stockNuevo;
            $product->precio_compra = $nuevoCosto;
            $product->save();

            InventoryMovement::create([
                'product_id'      => $product->id,
                'user_id'         => $userId,
                'tipo'            => 'Entrada',
                'cantidad'        => $cantidad,
                'stock_anterior'  => $stockAnterior,
                'stock_nuevo'     => $stockNuevo,
                'motivo'          => 'Entrada por compra',
                'referencia_tipo' => $referenciaTipo,
                'referencia_id'   => $referenciaId,
            ]);

            return $product;
        });
    }

    /**
     * Registra una salida por venta.
     */
    public function salidaPorVenta(Product $product, int $cantidad, ?int $userId, string $referenciaTipo, int $referenciaId, ?string $motivo = null): Product
    {
        if ($cantidad <= 0) {
            throw new InvalidArgumentException("La cantidad debe ser mayor a cero.");
        }

        return DB::transaction(function () use ($product, $cantidad, $userId, $referenciaTipo, $referenciaId, $motivo) {
            $product = Product::lockForUpdate()->find($product->id);
            $stockAnterior = $product->stock;
            $stockNuevo = $stockAnterior - $cantidad;

            if ($stockNuevo < 0) {
                throw new InvalidArgumentException("Stock insuficiente para realizar la salida.");
            }

            $product->stock = $stockNuevo;
            $product->save();

            InventoryMovement::create([
                'product_id'      => $product->id,
                'user_id'         => $userId,
                'tipo'            => 'Salida',
                'cantidad'        => $cantidad,
                'stock_anterior'  => $stockAnterior,
                'stock_nuevo'     => $stockNuevo,
                'motivo'          => $motivo ?? 'Salida por venta',
                'referencia_tipo' => $referenciaTipo,
                'referencia_id'   => $referenciaId,
            ]);

            return $product;
        });
    }

    /**
     * Realiza un ajuste manual del stock.
     */
    public function ajusteManual(Product $product, int $cantidad, string $tipo, ?int $userId, ?string $motivo = null): Product
    {
        if ($cantidad <= 0) {
            throw new InvalidArgumentException("La cantidad debe ser mayor a cero.");
        }

        $tipo = ucfirst(strtolower($tipo));
        if (!in_array($tipo, ['Entrada', 'Salida', 'Ajuste'])) {
            throw new InvalidArgumentException("Tipo de movimiento no válido.");
        }

        return DB::transaction(function () use ($product, $cantidad, $tipo, $userId, $motivo) {
            $product = Product::lockForUpdate()->find($product->id);
            $stockAnterior = $product->stock;

            if ($tipo === 'Entrada') {
                $stockNuevo = $stockAnterior + $cantidad;
            } elseif ($tipo === 'Salida') {
                $stockNuevo = $stockAnterior - $cantidad;
            } else { // Ajuste directo (fija el stock a la cantidad)
                $stockNuevo = $cantidad;
                if ($stockNuevo > $stockAnterior) {
                    $tipoReal = 'Entrada';
                    $cantidadMovimiento = $stockNuevo - $stockAnterior;
                } else {
                    $tipoReal = 'Salida';
                    $cantidadMovimiento = $stockAnterior - $stockNuevo;
                }
                $cantidad = abs($stockNuevo - $stockAnterior);
                // Si stock no cambia, no registrar
                if ($cantidad == 0) {
                    return $product;
                }
                $tipo = 'Ajuste';
            }

            if ($stockNuevo < 0) {
                throw new InvalidArgumentException("El stock no puede ser negativo.");
            }

            $product->stock = $stockNuevo;
            $product->save();

            InventoryMovement::create([
                'product_id'      => $product->id,
                'user_id'         => $userId,
                'tipo'            => $tipo,
                'cantidad'        => $cantidad, // cantidad absoluta de cambio o la nueva
                'stock_anterior'  => $stockAnterior,
                'stock_nuevo'     => $stockNuevo,
                'motivo'          => $motivo ?? 'Ajuste manual',
                'referencia_tipo' => 'Ajuste Manual',
            ]);

            return $product;
        });
    }
}
