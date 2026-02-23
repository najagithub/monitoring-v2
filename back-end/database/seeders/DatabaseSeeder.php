<?php

namespace Database\Seeders;

use App\Models\Provider;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::create([
            'name' => 'admin',
            'username' => 'admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        User::create([
            'name' => 'client1',
            'username' => 'client1',
            'email' => 'client1@example.com',
            'password' => Hash::make('password'),
            'role' => 'client',
            'is_active' => true,
        ]);
        User::create([
            'name' => 'client2',
            'username' => 'client2',
            'email' => 'client2@example.com',
            'password' => Hash::make('password'),
            'role' => 'client',
            'is_active' => true,
        ]);

        Provider::create(['name' => 'YAS', 'is_active' => true]);
        Provider::create(['name' => 'Starlink', 'is_active' => true]);
        Provider::create(['name' => 'Orange', 'is_active' => true]);

        $this->call(UserProviderSeeder::class);
        $this->call(ConsumptionHistorySeeder::class);
    }
}
