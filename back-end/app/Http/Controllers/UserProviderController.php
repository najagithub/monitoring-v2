<?php

namespace App\Http\Controllers;

use App\Models\Provider;
use App\Models\UserProvider;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

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
}
