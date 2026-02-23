<?php

namespace App\Http\Controllers;

use App\Models\Provider;
use Illuminate\Http\Request;

class ProviderController extends Controller
{
    public function index()
    {
        return response()->json(Provider::all());
    }

    public function store(Request $request)
    {
        $providersCount = Provider::count();

        if ($providersCount >= 4) {
            return response()->json([
                'message' => 'Maximum of 4 providers reached'
            ], 422);
        }

        $validated = $request->validate([
            'name' => 'required|string|unique:providers',
            'is_active' => 'boolean',
        ]);

        $provider = Provider::create($validated);

        return response()->json($provider, 201);
    }

    public function show(Provider $provider)
    {
        return response()->json($provider);
    }

    public function update(Request $request, Provider $provider)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|unique:providers,name,' . $provider->id,
            'is_active' => 'sometimes|boolean',
        ]);

        $provider->update($validated);

        return response()->json($provider);
    }

    public function destroy(Provider $provider)
    {
        $provider->delete();

        return response()->json(['message' => 'Provider deleted successfully']);
    }
}
