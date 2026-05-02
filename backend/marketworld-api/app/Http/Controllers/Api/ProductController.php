<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    // GET /api/v1/products
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->get('per_page', 15), 1), 100);
        $query = Product::query();

        $categoryFilter = null;

        if ($request->filled('categoria_id')) {
            $category = Category::find($request->categoria_id);
            $categoryFilter = $category ? $category->nombre : '__invalid__';
        }

        if ($request->filled('categoria')) {
            $categoryFilter = $request->categoria;
        }

        if ($categoryFilter !== null) {
            $query->where('categoria', trim($categoryFilter));
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('stock_bajo')) {
            $query->whereColumn('stock', '<=', 'stock_minimo');
        }

        $products = $query
            ->orderBy('nombre')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Productos listados correctamente',
            'data'    => $products->items(),
            'meta'    => [
                'total'        => $products->total(),
                'per_page'     => $products->perPage(),
                'current_page' => $products->currentPage(),
                'last_page'    => $products->lastPage(),
            ],
            'total'   => $products->total(),
            'errors'  => null,
        ]);
    }

    // GET /api/v1/products/{id}
    public function show(int $id): JsonResponse
    {
        $product = Product::find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Producto no encontrado',
                'data'    => null,
                'errors'  => null,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Producto encontrado',
            'data'    => $product,
            'errors'  => null,
        ]);
    }

    // POST /api/v1/products
    public function store(Request $request): JsonResponse
    {
        // Normalizar los nombres de los campos que vienen del frontend
        if ($request->has('codigo') && !$request->has('sku')) {
            $request->merge(['sku' => $request->codigo]);
        }
        if ($request->has('precio') && !$request->has('precio_venta')) {
            $request->merge(['precio_venta' => $request->precio]);
        }
        // No permitir que el costo sea actualizado directamente desde el formulario de producto.
        // El `precio_compra` debe actualizarse solo via órdenes de compra o ajustes administrativos.
        if ($request->has('stockActual') && !$request->has('stock')) {
            $request->merge(['stock' => $request->stockActual]);
        }
        if ($request->has('stockMinimo') && !$request->has('stock_minimo')) {
            $request->merge(['stock_minimo' => $request->stockMinimo]);
        }

        $validated = $request->validate([
            'sku'           => 'required|string|max:50|unique:products,sku',
            'nombre'        => 'required|string|max:200',
            'descripcion'   => 'nullable|string',
            'categoria'     => 'nullable|string|max:100',
            'precio_compra' => 'nullable|numeric|min:0',
            'precio_venta'  => 'required|numeric|min:0',
            'stock'         => 'required|integer|min:0',
            'stock_minimo'  => 'nullable|integer|min:0',
            'iva'           => 'nullable|numeric|min:0',
            'unidad'        => 'nullable|string|max:50',
            'proveedor'     => 'nullable|string|max:150',
            'estado'        => ['nullable', Rule::in(['Activo', 'Inactivo'])],
        ]);

        $product = Product::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Producto creado correctamente',
            'data'    => $product,
            'errors'  => null,
        ], 201);
    }

    // PUT /api/v1/products/{id}
    public function update(Request $request, int $id): JsonResponse
    {
        $product = Product::find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Producto no encontrado',
                'data'    => null,
                'errors'  => null,
            ], 404);
        }

        // Normalizar los nombres de los campos que vienen del frontend
        if ($request->has('codigo') && !$request->has('sku')) {
            $request->merge(['sku' => $request->codigo]);
        }
        if ($request->has('precio') && !$request->has('precio_venta')) {
            $request->merge(['precio_venta' => $request->precio]);
        }
        if ($request->has('costo') && !$request->has('precio_compra')) {
            $request->merge(['precio_compra' => $request->costo]);
        }
        if ($request->has('stockActual') && !$request->has('stock')) {
            $request->merge(['stock' => $request->stockActual]);
        }
        if ($request->has('stockMinimo') && !$request->has('stock_minimo')) {
            $request->merge(['stock_minimo' => $request->stockMinimo]);
        }

        $validated = $request->validate([
            'sku'           => ['sometimes', 'required', 'string', 'max:50', Rule::unique('products', 'sku')->ignore($id)],
            'nombre'        => 'sometimes|required|string|max:200',
            'descripcion'   => 'nullable|string',
            'categoria'     => 'nullable|string|max:100',
            'precio_compra' => 'nullable|numeric|min:0',
            'precio_venta'  => 'sometimes|required|numeric|min:0',
            'stock'         => 'nullable|integer|min:0',
            'stock_minimo'  => 'nullable|integer|min:0',
            'iva'           => 'nullable|numeric|min:0',
            'unidad'        => 'nullable|string|max:50',
            'proveedor'     => 'nullable|string|max:150',
            'estado'        => ['nullable', Rule::in(['Activo', 'Inactivo'])],
        ]);

        $product->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Producto actualizado correctamente',
            'data'    => $product->fresh(),
            'errors'  => null,
        ]);
    }

    // DELETE /api/v1/products/{id}
    public function destroy(int $id): JsonResponse
    {
        $product = Product::find($id);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Producto no encontrado',
                'data'    => null,
                'errors'  => null,
            ], 404);
        }

        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Producto eliminado correctamente',
            'data'    => null,
            'errors'  => null,
        ]);
    }

    // GET /api/v1/products/stock-bajo
    public function stockBajo(): JsonResponse
    {
        $products = Product::whereColumn('stock', '<=', 'stock_minimo')
            ->where('estado', 'Activo')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Productos con stock bajo listados',
            'data'    => $products,
            'total'   => $products->count(),
            'errors'  => null,
        ]);
    }

    // GET /api/v1/products/valuation
    // Devuelve la valorización por producto basada en precio_compra * stock
    public function valuation(): JsonResponse
    {
        $products = Product::select('id', 'sku', 'nombre', 'precio_compra', 'stock')
            ->where('estado', 'Activo')
            ->get()
            ->map(function ($p) {
                $pc = (float) ($p->precio_compra ?? 0);
                $stock = (int) ($p->stock ?? 0);
                return [
                    'id' => $p->id,
                    'sku' => $p->sku,
                    'nombre' => $p->nombre,
                    'precio_compra' => $pc,
                    'stock' => $stock,
                    'valuation' => round($pc * $stock, 2),
                ];
            });

        return response()->json([
            'success' => true,
            'message' => 'Valorización de productos calculada',
            'data'    => $products,
            'total'   => $products->count(),
            'errors'  => null,
        ]);
    }
}
