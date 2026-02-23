<?php

namespace App\Http\Controllers;

use App\Models\Provider;
use App\Models\UserProvider;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserProviderController extends Controller
{
    use ApiResponse;
    public function index(Request $request)
    {
        $query = UserProvider::with(['user', 'provider']);

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('provider_id')) {
            $query->where('provider_id', $request->provider_id);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'provider_id' => 'required|exists:providers,id',
            'router_ip' => 'required|ip',
            'oid_byte_in' => 'required|string',
            'oid_byte_out' => 'required|string',
            'monthly_limit' => 'required|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $userProvider = UserProvider::create($validated);

        return response()->json($userProvider->load(['user', 'provider']), 201);
    }

    public function show(UserProvider $userProvider)
    {
        return response()->json($userProvider->load(['user', 'provider']));
    }

    public function update(Request $request, UserProvider $userProvider)
    {
        $validated = $request->validate([
            'router_ip' => 'sometimes|ip',
            'oid_byte_in' => 'sometimes|string',
            'oid_byte_out' => 'sometimes|string',
            'monthly_limit' => 'sometimes|integer|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $userProvider->update($validated);

        return response()->json($userProvider->load(['user', 'provider']));
    }

    public function destroy(UserProvider $userProvider)
    {
        $userProvider->delete();

        return response()->json(['message' => 'User provider configuration deleted']);
    }

    public function activeProviders($userId)
    {
        $providers = Provider::query()
            ->whereHas('userProviders', function ($query) use ($userId) {
                $query->where('user_id', $userId)
                      ->where('is_active', true);
            })
            ->with(['userProviders' => function ($query) use ($userId) {
                $query->where('user_id', $userId)
                    ->where('is_active', true);
            }])
            ->get();

        return $this->success($providers);
    }

    public function updateMonthlyLimit(Request $request)
    {
        $request->validate([
            'id_user'        => 'required|integer|exists:users,id',
            'provider_id'    => 'required|integer|exists:providers,id',
            'monthly_limit'  => 'nullable|numeric|min:0',
            'oid_in'         => 'nullable|string|max:255',
            'oid_out'        => 'nullable|string|max:255',
            'router_ip'        => 'nullable|string|max:255|ip',
        ]);

        try {
            DB::beginTransaction();

            $userProvider = UserProvider::where('user_id', $request->id_user)
                ->where('provider_id', $request->provider_id)
                ->first();

            if (!$userProvider) {
                return response()->json([
                    'message' => 'Configuration user/provider introuvable.'
                ], 404);
            }

            /*
            |--------------------------------------------------------------------------
            | Mise à jour dynamique (seulement les champs envoyés)
            |--------------------------------------------------------------------------
            */

            // Monthly limit (convert MB → Bytes)
            if ($request->has('monthly_limit')) {
                $userProvider->monthly_limit = 
                    $request->monthly_limit * 1024 * 1024;
            }

            // OID IN
            if ($request->has('oid_in')) {
                $userProvider->oid_in = $request->oid_in;
            }

            // OID OUT
            if ($request->has('oid_out')) {
                $userProvider->oid_out = $request->oid_out;
            }

            if ($request->has('router_ip')) {
                $userProvider->router_ip = $request->router_ip;
            }

            $userProvider->save();

            DB::commit();

            return $this->success(
                $userProvider,
                'Configuration mise à jour avec succès.'
            );

        } catch (\Throwable $e) {
            DB::rollBack();

            return $this->error(
                'Erreur lors de la mise à jour.',
                $e->getMessage(),
                500
            );
        }
    }
}
