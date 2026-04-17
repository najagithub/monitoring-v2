<?php

namespace App\Http\Controllers;

use App\Models\ConsumptionHistory;
use App\Models\User;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\Request;

class UserSummaryController extends Controller
{
    use ApiResponse;
    public function index(Request $request)
    {
        $validated = $request->validate([
            'provider_id' => ['required', 'integer', 'exists:providers,id'],
        ]);

        $providerId = (int) $validated['provider_id'];

        $start = Carbon::now()->startOfMonth()->toDateString();
        $end   = Carbon::now()->endOfMonth()->toDateString();

        // 1) Users + provider lié (pivot via userProviders)
        $users = User::query()
            ->where('role', 'client')
            ->with([
                'userProviders' => function ($q) use ($providerId) {
                    $q->where('provider_id', $providerId)
                      ->with('provider:id,name,is_active');
                }
            ])
            ->get(['id', 'name', 'username', 'email', 'is_active', 'profile_image']);

        // 2) Consommation totale du mois (groupée) pour éviter N+1
        $consumptionByUserId = ConsumptionHistory::query()
            ->selectRaw('user_id, COALESCE(SUM(total_bytes),0) as total')
            ->where('provider_id', $providerId)
            ->whereBetween('date', [$start, $end])
            ->groupBy('user_id')
            ->pluck('total', 'user_id'); // [user_id => total_bytes]

        // 3) Mapper sortie
        $data = $users->map(function (User $u) use ($consumptionByUserId) {

            $up = $u->userProviders->first(); // car filtré par provider_id
            $provider = $up?->provider;

            $totalBytes = (int) ($consumptionByUserId[$u->id] ?? 0);

            $limitBytes = (int) ($up?->monthly_limit ?? 0); // stocké en bytes
            $limitMb = $limitBytes > 0 ? (int) round($limitBytes / (1024 * 1024)) : 0;

            return [
                'id' => $u->id,
                'profile_image_url' => $u->profile_image_url,
                'profile_image' => $u->profile_image,
                'name' => $u->name,
                'email' => $u->email,
                'username' => $u->username,

                'total_consumption_month' => $totalBytes,
                'total_consumption_month_mb' => round($totalBytes / (1024 * 1024), 2),

                'monthly_limit_mb' => $limitMb,

                'is_active' => (bool) $u->is_active,

                // 'provider' => $provider ? [
                //     'id' => $provider->id,
                //     'name' => $provider->name,
                //     'is_active' => (bool) $provider->is_active,
                // ] : null,

                'user_provider' => $up ? [
                    'router_ip' => $up->router_ip,
                    'oid_byte_in' => $up->oid_byte_in,
                    'oid_byte_out' => $up->oid_byte_out,
                    'is_active' => (bool) $up->is_active,
                    'internet_status' => (bool) $up->internet_status,
                ] : null,
            ];
        });

        return response()->json([
            'provider_id' => $providerId,
            'month' => Carbon::now()->format('Y-m'),
            'data' => $data,
        ]);
    }
}
