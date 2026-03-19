<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@marketworld.com'],
            [
                'name' => 'Admin MarketWorld',
                'password' => Hash::make('admin123'),
                'api_token' => null,
            ]
        );
    }
}
