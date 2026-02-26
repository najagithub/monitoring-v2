<?php

namespace App\Jobs;

use App\Models\ConsumptionHistory;
use App\Models\SnmpCounterStats;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;

class SnmpWalkJob implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        
        $start = 'Job exécuté à : ' . now()->toDateTimeString();
        
        // Option 1: afficher via commande shell (Process)
        
        $users = User::with('userProviders')->where('role','!=','admin')->where('is_active',1)->get();
        
        $oid_up_time = env('SNMP_UP_TIME','.1.3.6.1.2.1.1.3.0');
        Log::info($start);

        foreach ($users as $user) {

            $provider = $user->user_provider_for_snmp;

            // if ($provider) {

            if (!$provider) {
                continue;
            }

            $ip = $provider->router_ip;

            $lockKey = "snmp_poll:{$provider->user_id}:{$provider->provider_id}";
            $lock = Cache::lock($lockKey, 30);

            if (!$lock->get()) {
                Log::warning("Skip (lock) user={$provider->user_id} provider={$provider->provider_id}");
                continue;
            }

            try {
                $uptimeLine = $this->snmpwalkLine($ip, $oid_up_time);
                $outOctLine = $this->snmpwalkLine($ip, $provider->oid_byte_out);
                $inOctLine  = $this->snmpwalkLine($ip, $provider->oid_byte_in);

                $uptime = $this->parseSnmpValue($uptimeLine); // ['value' => 208900]
                $outOct = $this->parseSnmpValue($outOctLine); // ['value' => "51311"]
                $inOct  = $this->parseSnmpValue($inOctLine);  // ['value' => "4707"]

                $data = [
                    'user_id' => $provider->user_id,
                    'provider_id' => $provider->provider_id,
                    'device_ip' => $ip,
                    'uptime_ticks' => (int) $uptime['value'],     // 208900 (centièmes de seconde)
                    'in_octets' => (int) $inOct['value'],         // "4707"
                    'out_octets' => (int) $outOct['value'],       // "51311"
                ];

                $curUptime = (int) $uptime['value'];    // Timeticks (1/100 sec)
                $curIn  = (int) $inOct['value'];         // Counter64 -> BIGINT
                $curOut = (int) $outOct['value'];

                DB::transaction(function () use ($provider, $ip, $curUptime, $curIn, $curOut){
                    $stats = SnmpCounterStats::where('user_id', $provider->user_id)
                                ->where('provider_id', $provider->provider_id)
                                ->lockForUpdate()
                                ->first();

                    if (!$stats) {
                        SnmpCounterStats::create([
                            'user_id' => $provider->user_id,
                            'provider_id' => $provider->provider_id,
                            'last_uptime_ticks' => $curUptime,
                            'last_in_counter' => $curIn,
                            'last_out_counter' => $curOut,
                            'last_polled_at' => now(),
                        ]);
                        Log::info("Init state user={$provider->user_id} provider={$provider->provider_id}");
                        return;
                    }

                    $minSeconds = 60;
                    if (
                        $stats->last_polled_at && 
                        Carbon::parse($stats->last_polled_at)->diffInSeconds(now()) < $minSeconds
                    ) {
                        $stats->update([
                            'last_uptime_ticks' => $curUptime,
                            'last_in_counter' => $curIn,
                            'last_out_counter' => $curOut,
                            'last_polled_at' => now(),
                        ]);

                        Log::warning("Skip (too frequent) user={$provider->user_id} provider={$provider->provider_id}");
                        return;
                    }

                    $deltaIn  = $curIn  - (int)$stats->last_in_counter;
                    $deltaOut = $curOut - (int)$stats->last_out_counter;

                    if ($curUptime < (int) $stats->last_uptime_ticks) {
                        $deltaIn = $curIn;
                        $deltaOut = $curOut;
                        Log::warning("Reboot detected user={$provider->user_id} provider={$provider->provider_id}");
                    } else {
                        // 7) Delta négatif sans reboot => éviter données fausses
                        if ($deltaIn < 0) {
                            Log::warning("Negative deltaIn (no reboot) => set 0 user={$provider->user_id} provider={$provider->provider_id}");
                            $deltaIn = 0;
                        }
                        if ($deltaOut < 0) {
                            Log::warning("Negative deltaOut (no reboot) => set 0 user={$provider->user_id} provider={$provider->provider_id}");
                            $deltaOut = 0;
                        }
                    }

                    $deltaTotal = $deltaIn + $deltaOut;

                    $history = ConsumptionHistory::firstOrCreate([
                        'user_id' => $provider->user_id,
                        'provider_id' => $provider->provider_id,
                        'date' => now()->toDateString(),
                    ], [
                        'bytes_in' => 0,
                        'bytes_out' => 0,
                        'total_bytes' => 0,
                    ]);

                    // Toujours caster en int et sécuriser
                    $deltaIn = max(0, (int)$deltaIn);
                    $deltaOut = max(0, (int)$deltaOut);
                    $deltaTotal = $deltaIn + $deltaOut;

                    $history->increment('bytes_in', $deltaIn);
                    $history->increment('bytes_out', $deltaOut);
                    $history->increment('total_bytes', $deltaTotal);

                    // 9) Update state (toujours à la fin)
                    $stats->update([
                        'last_uptime_ticks' => $curUptime,
                        'last_in_counter' => $curIn,
                        'last_out_counter' => $curOut,
                        'last_polled_at' => now(),
                    ]);
                    Log::info("Daily+State updated user={$provider->user_id} provider={$provider->provider_id} dIn={$deltaIn} dOut={$deltaOut}");

                });

                Log::info('Data saved ip ' . json_encode( $data));
            } catch (\Throwable $e) {
                Log::error("SNMP poll error user={$provider->user_id} provider={$provider->provider_id} ip={$ip}: ".$e->getMessage());
            } finally {
                optional($lock)->release();
            }
        }
        $end = 'Job terminé à : ' . now()->toDateTimeString();
        Log::info($end);
    }

    public function parseSnmpValue(string $line): array
    {
        // Exemple line:
        // "iso.3.6.1.2.1.1.3.0 = Timeticks: (208900) 0:34:49.00"
        // "iso.3.6.1.2.1.31.1.1.1.10.9 = Counter64: 51311"

        $out = [
            'oid' => null,
            'type' => null,
            'value' => null,     // int|string selon le type
            'raw' => $line,
        ];

        // OID avant le "="
        if (preg_match('/^(.*?)\s*=\s*(.*)$/', trim($line), $m)) {
            $out['oid'] = trim($m[1]);
            $rhs = trim($m[2]);

            // Timeticks
            if (preg_match('/^Timeticks:\s*\((\d+)\)\s*(.*)$/', $rhs, $t)) {
                $out['type'] = 'timeticks';
                $out['value'] = (int)$t[1];        // ici: 208900 (en centièmes de seconde)
                $out['human'] = trim($t[2]);       // "0:34:49.00"
                return $out;
            }

            // Counter64 / Counter32 / Gauge32 etc.
            if (preg_match('/^([A-Za-z0-9]+):\s*([0-9]+)\s*$/', $rhs, $c)) {
                $out['type'] = strtolower($c[1]);  // "counter64"
                // attention: Counter64 peut dépasser int sur certains systèmes -> garde en string si tu veux safe
                $out['value'] = $c[2];             // "51311"
                return $out;
            }

            // Fallback: prendre tout à droite
            $out['type'] = 'raw';
            $out['value'] = (int) ($rhs ?? 0);
        }

        return $out;
    }

    public function snmpwalkLine(string $ip, string $oid, string $community = 'public'): string
    {
        // -On pour éviter la résolution de MIB et garder un output stable
        $cmd = ['snmpwalk', '-v2c', '-c', $community, '-On', $ip, $oid];

        $result = Process::run($cmd);
        if (!$result->successful()) {
            throw new \RuntimeException("SNMP error: ".$result->errorOutput());
        }

        // snmpwalk peut retourner plusieurs lignes; ici ton OID .0 retourne 1 ligne
        return trim($result->output());
    }
}
