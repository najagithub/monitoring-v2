<?php

namespace Database\Seeders;

use App\Models\ConsumptionHistory;
use App\Models\Provider;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class ConsumptionHistorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::whereNot('id', 1)->pluck('id');
        $providers = Provider::query()->pluck('id');

        // Si tu veux, tu peux créer des users/providers ici si c'est vide
        if ($users->isEmpty() || $providers->isEmpty()) {
            $this->command?->warn('⚠️ Aucun user ou provider trouvé. Seed annulé (crée des users/providers avant).');
            return;
        }

        $daysBack = 100;            // 30 derniers jours
        $maxPairsToSeed = 50;      // sécurité: on seed max 50 couples user/provider (sinon ça peut devenir énorme)
        $pairsSeeded = 0;

        foreach ($users as $userId) {
            foreach ($providers as $providerId) {

                // Limite pour éviter des millions de lignes si beaucoup d'utilisateurs/providers
                $pairsSeeded++;
                if ($pairsSeeded > $maxPairsToSeed) {
                    break 2;
                }

                for ($i = 0; $i < $daysBack; $i++) {
                    $date = Carbon::today()->subDays($i);

                    // Exemple: entre 10MB et 5GB par jour
                    $bytesIn  = random_int(10 * 1024 * 1024, 5 * 1024 * 1024 * 1024);
                    $bytesOut = random_int(5  * 1024 * 1024, 2 * 1024 * 1024 * 1024);
                    $total    = $bytesIn + $bytesOut;

                    ConsumptionHistory::create([
                        'user_id'     => $userId,
                        'provider_id' => $providerId,
                        'bytes_in'    => $bytesIn,
                        'bytes_out'   => $bytesOut,
                        'total_bytes' => $total,
                        'date'        => $date->toDateString(),
                    ]);
                }
            }
        }

        $this->command?->info("✅ ConsumptionHistorySeeder terminé (pairs seeded: {$pairsSeeded}).");
    }
}
