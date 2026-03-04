<?php

namespace App\Jobs;

use App\Models\ConsumptionHistory;
use App\Models\SnmpCounterStats;
use App\Models\User;
use App\Services\MikrotikService;
use App\Support\MikrotikRoutingScript;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use InvalidArgumentException;

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
    public function handle(MikrotikService $mikrotik): void
    {
        
        $start = 'Job exécuté à : ' . now()->toDateTimeString();
        
        // Option 1: afficher via commande shell (Process)
        
        $users = User::with(['userProviders','providers'])->where('role','!=','admin')->where('is_active',1)->get();
        
        $oid_up_time = env('SNMP_UP_TIME','.1.3.6.1.2.1.1.3.0');
        Log::info($start);
        
        // $result = $mikrotik->exec($cmd);

        // Log::info('Mikrotik result', [
        //     'output' => $result
        // ]);
        Log::info('------------------------------------');
        Log::info('------------------------------------');
        Log::info('------------------------------------');
        Log::info('------------------------------------');
        Log::info('------------------------------------');
        foreach ($users as $user) {

            $provider = $user->user_provider_for_snmp;

            $choiceNetworkName = $provider->provider->name;
            
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
                $oidName  = $this->snmpwalkLine($ip, $provider->oid_name);

                $uptime = $this->parseSnmpValue($uptimeLine);
                $outOct = $this->parseSnmpValue($outOctLine);
                $inOct  = $this->parseSnmpValue($inOctLine);
                $interfaceName  = $this->parseSnmpValue($oidName);

                $data = [
                    'user_id' => $provider->user_id,
                    'provider_id' => $provider->provider_id,
                    'device_ip' => $ip,
                    'oid_name' => $interfaceName['value'],
                    'uptime_ticks' => (int) $uptime['value'],     // 208900 (centièmes de seconde)
                    'in_octets' => (int) $inOct['value'],         // "4707"
                    'out_octets' => (int) $outOct['value'],       // "51311"
                ];

                $curUptime = (int) $uptime['value'];    // Timeticks (1/100 sec)
                $curIn  = (int) $inOct['value'];         // Counter64 -> BIGINT
                $curOut = (int) $outOct['value'];

                
                DB::transaction(function () use ($provider, $ip, $curUptime, $curIn, $curOut, $choiceNetworkName, $interfaceName){
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

                    // check month actual limit
                    $startMonth = now()->startOfMonth();
                    $endMonth   = now()->endOfMonth();
                    $total_bytes = ConsumptionHistory::where('user_id', $provider->user_id)
                        ->where('provider_id', $provider->provider_id)
                        ->whereBetween('date', [$startMonth, $endMonth])
                        ->sum('total_bytes'); 
                    $total_bytes = (int) $total_bytes ?? 0;
                        
                    Log::info('*****************************************');
                    Log::info('*****************************************');
                    Log::info('*****************START*******************');
                    Log::info('*****************************************');
                    Log::info('*****************************************');
                    $choiceNetworkName = strtolower($choiceNetworkName);
                    $parts = explode('.', $provider->router_ip);
                    array_pop($parts);

                    $plage_ip = implode('.', $parts).".";
                    $interface_name = $interfaceName['value'];
                    $stopInternet = MikrotikRoutingScript::build(interfaceName: $interface_name, plageIp: $plage_ip, switchTo: "stop");

                    $switchInternet = MikrotikRoutingScript::build(interfaceName: $interface_name, plageIp: $plage_ip, switchTo: $choiceNetworkName);


                    Log::info('stop Internet Cmd '. $stopInternet);
                    Log::info('switch Internet to ' .$choiceNetworkName. ' Cmd ' .$switchInternet );

                    Log::info('*****************************************');
                    Log::info('*****************************************');
                    Log::info('*******************END*******************');
                    Log::info('*****************************************');
                    Log::info('*****************************************');

                    Log::info("total_bytes ".$total_bytes." provider name : ".$choiceNetworkName);
                    if ($provider->internet_status && $total_bytes <= $provider->monthly_limit) {
                        Log::info("On continue internet_status = 1 et total_bytes <= monthly_limit ");

                    }
                    if (!$provider->internet_status && $total_bytes <= $provider->monthly_limit) {
                        Log::info("Connexion internet doit être réactivé internet_status = 0 et total_bytes <= monthly_limit ");
                        $provider->update([
                            'internet_status' => true
                        ]);
                    }
                    if (!$provider->internet_status && $total_bytes >= $provider->monthly_limit) {
                        Log::info("Connexion internet coupée : internet_status = 0 et total_bytes >= monthly_limit ". $this->convertBytes($total_bytes, 'GB'));
                        return;
                    }
                    if ($provider->internet_status && $total_bytes >= $provider->monthly_limit) {
                        Log::info("Connexion internet censé coupée : internet_status = 1 et total_bytes >= monthly_limit, internet_status updated". $this->convertBytes($total_bytes, 'GB'));
                        $provider->update([
                            'internet_status' => false
                        ]);
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
        // Exemples:
        // iso.3.6.1.2.1.1.3.0 = Timeticks: (430300) 1:11:43.00
        // iso.3.6.1.2.1.31.1.1.1.10.4 = Counter64: 96316
        // iso.3.6.1.2.1.2.2.1.2.4 = STRING: "LAN3"

        $out = [
            'oid'   => null,
            'type'  => null,
            'value' => null,   // int|string
            'raw'   => $line,
        ];

        $line = trim($line);

        // OID avant le "=" et partie droite
        if (!preg_match('/^(.*?)\s*=\s*(.*)$/', $line, $m)) {
            return $out;
        }

        $out['oid'] = trim($m[1]);
        $rhs = trim($m[2]);

        // 1) Timeticks
        if (preg_match('/^Timeticks:\s*\((\d+)\)\s*(.*)$/', $rhs, $t)) {
            $out['type']  = 'timeticks';
            $out['value'] = (int) $t[1];     // ex: 430300
            $out['human'] = trim($t[2]);     // ex: 1:11:43.00
            return $out;
        }

        // 2) STRING: "LAN3"  (ou STRING: LAN3)
        if (preg_match('/^STRING:\s*(?:"([^"]*)"|(.*))$/', $rhs, $s)) {
            $out['type']  = 'string';
            $out['value'] = isset($s[1]) && $s[1] !== '' ? $s[1] : trim($s[2] ?? '');
            return $out;
        }

        // 3) Counter64 / Counter32 / Gauge32 / Integer / etc.
        if (preg_match('/^([A-Za-z0-9]+):\s*(-?\d+)\s*$/', $rhs, $c)) {
            $out['type'] = strtolower($c[1]);
            // Si tu veux SAFE pour Counter64, garde en string:
            $out['value'] = $c[2]; // ex: "96316"
            return $out;
        }

        // 4) Fallback: renvoyer la partie droite brute (sans type reconnu)
        $out['type']  = 'raw';
        $out['value'] = $rhs;

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

    function convertBytes(float $bytes, string $unit = 'MB', int $precision = 2): float
    {
        $units = [
            'B'  => 0,
            'KB' => 1,
            'MB' => 2,
            'GB' => 3,
            'TB' => 4,
        ];

        $unit = strtoupper($unit);

        if (!array_key_exists($unit, $units)) {
            throw new InvalidArgumentException("Unité invalide. Utilise B, KB, MB, GB ou TB.");
        }

        return round($bytes / pow(1024, $units[$unit]), $precision);
    }
}
