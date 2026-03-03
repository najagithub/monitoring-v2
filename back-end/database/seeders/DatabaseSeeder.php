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

        for ($i = 3; $i <= 7; $i++) {
            User::create([
                'name' => 'client' . $i,
                'username' => 'client' . $i,
                'email' => 'client' . $i . '@netpulse.com',
                'password' => Hash::make('password'),
                'role' => 'client',
                'is_active' => true,
                'network_choice' => rand(1,3)
            ]);
        }

        Provider::create(['name' => 'Yas', 'is_active' => true]);
        Provider::create(['name' => 'Starlink', 'is_active' => true]);

        $this->call(UserProviderSeeder::class);
        // $this->call(ConsumptionHistorySeeder::class);
    }
}
