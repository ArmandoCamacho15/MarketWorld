<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CompanySetting;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CompanySettingController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $settings = $this->getSettings();

        return response()->json([
            'success' => true,
            'message' => 'Datos de empresa cargados.',
            'data' => $this->formatSettings($settings),
            'errors' => null,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:120',
            'tax_id' => 'required|string|max:30',
            'address' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:30',
            'email' => 'required|email|max:120',
            'website' => 'nullable|url|max:190',
            'currency' => 'required|string|max:10',
            'logo' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
        ]);

        $settings = $this->getSettings();
        $before = $this->formatSettings($settings);

        $settings->fill([
            'company_name' => $validated['company_name'],
            'tax_id' => $validated['tax_id'],
            'address' => $validated['address'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'],
            'website' => $validated['website'] ?? null,
            'currency' => $validated['currency'],
        ]);

        if ($request->hasFile('logo')) {
            if ($settings->logo_path && Storage::disk('public')->exists($settings->logo_path)) {
                Storage::disk('public')->delete($settings->logo_path);
            }

            $settings->logo_path = $request->file('logo')->store('company-logos', 'public');
        }

        $settings->save();

        AuditLogger::record($request, 'company_settings_updated', 'Se actualizaron los datos de la empresa.', [
            'entity_type' => 'company_setting',
            'entity_id' => $settings->id,
            'metadata' => [
                'before' => $before,
                'after' => $this->formatSettings($settings),
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Datos de empresa guardados correctamente.',
            'data' => $this->formatSettings($settings),
            'errors' => null,
        ]);
    }

    private function getSettings(): CompanySetting
    {
        return CompanySetting::query()->firstOrCreate([], [
            'company_name' => 'MarketWorld SAS',
            'tax_id' => '900.123.456-1',
            'address' => 'Carrera 45 # 26-85, Bogotá',
            'phone' => '(601) 234 5678',
            'email' => 'info@marketworld.com',
            'website' => 'https://www.marketworld.com',
            'currency' => 'COP',
        ]);
    }

    private function formatSettings(CompanySetting $settings): array
    {
        return [
            'id' => $settings->id,
            'company_name' => $settings->company_name,
            'tax_id' => $settings->tax_id,
            'address' => $settings->address,
            'phone' => $settings->phone,
            'email' => $settings->email,
            'website' => $settings->website,
            'currency' => $settings->currency,
            'logo_url' => $settings->logo_path ? Storage::disk('public')->url($settings->logo_path) : null,
        ];
    }
}
