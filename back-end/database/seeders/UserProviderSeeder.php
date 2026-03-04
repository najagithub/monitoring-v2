<?php

namespace Database\Seeders;

use App\Models\Provider;
use App\Models\User;
use App\Models\UserProvider;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class UserProviderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::whereNot('id',1)->select('id')->get();
        $providers = Provider::query()->select('id')->get();

        if ($users->isEmpty() || $providers->isEmpty()) {
            // Rien à seed si on n'a pas de users/providers
            return;
        }
        $i =3;
        $oid = 13;
        foreach ($users as $user) {
            foreach ($providers as $provider) {
                UserProvider::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'provider_id' => $provider->id,
                    ],
                    [
                        // Valeurs par défaut (à adapter à ton contexte)
                        'router_ip'      => '10.10.'.$i.'.1',

                        // Exemple OID SNMP (ifHCInOctets / ifHCOutOctets pour l’interface index 6)
                        'oid_name'    => '.1.3.6.1.2.1.2.2.1.2.'.$oid,
                        'oid_byte_in'    => '.1.3.6.1.2.1.31.1.1.1.6.'.$oid,
                        'oid_byte_out'   => '.1.3.6.1.2.1.31.1.1.1.10.'.$oid,

                        // Limite mensuelle en bytes (rand: 100 à 175 GB)
                        'monthly_limit'  => random_int(100, 175) * 1024 * 1024 * 1024,

                        'is_active'      => true,
                    ]
                );
            }
            $i++;
            $oid++;
        }


    }
}
