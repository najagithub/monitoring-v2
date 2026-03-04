<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserProvider;
use App\Services\MikrotikService;
use App\Support\MikrotikRoutingScript;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    use ApiResponse;
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        return $this->success($query->with('userProviders.provider')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'username' => 'required|string|unique:users',
            'email' => 'required|email|unique:users',
            'phone' => 'nullable|string',
            'password' => 'required|string|min:6',
            'role' => 'required|in:admin,client',
        ]);

        $validated['password'] = Hash::make($validated['password']);

        $user = User::create($validated);

        return $this->success($user, 'User Created' ,201);
    }

    public function show(User $user)
    {
        return $this->success($user->load('userProviders.provider'));
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string',
            'username' => 'sometimes|string|unique:users,username,' . $user->id,
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'phone' => 'nullable|string',
            'profile_image' => 'nullable|string',
        ]);

        $user->update($validated);

        return $this->success($user);
    }

    public function updateMyProfile(Request $request)
    {
        $user = $request->user(); // user connecté (Sanctum / Passport / session)

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'username' => 'sometimes|string|max:255|unique:users,username,' . $user->id,
            'email' => 'sometimes|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:50',

            // upload image
            'profile_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        // Upload image (stockage + suppression ancienne)
        if ($request->hasFile('profile_image')) {
            if ($user->profile_image && Storage::disk('public')->exists($user->profile_image)) {
                Storage::disk('public')->delete($user->profile_image);
            }

            $path = $request->file('profile_image')->store('profiles', 'public');
            $validated['profile_image'] = $path; // on stocke le chemin en DB
        }

        $user->update($validated);

        // optionnel: retourner aussi l'URL publique
        $data = $user->fresh();
        $data->profile_image_url = $data->profile_image ? asset('storage/' . $data->profile_image) : null;

        return $this->success($data, 'Profile updated successfully');
    }

    public function updateMyPassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return $this->error('Current password is incorrect', 422);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        return $this->success($user->fresh(), 'Password updated successfully');
    }

    public function toggleActive(User $user)
    {
        $user->update(['is_active' => !$user->is_active]);

        return $this->success($user);
    }


    public function updatePassword(Request $request, User $user)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return $this->error('Current password is incorrect', 422);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        return $this->success($user,'Password updated successfully');
    }    

    public function storeUserProvider(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', Rule::in(['admin', 'client'])],

            'router_ip' => ['required', 'ip'],

            'user_providers' => ['required', 'array', 'min:1'],

            'user_providers.*.provider_id' => ['required', 'integer', 'exists:providers,id', 'distinct'],
            'user_providers.*.oid_byte_in' => ['required', 'string', 'max:255'],
            'user_providers.*.oid_byte_out' => ['required', 'string', 'max:255'],
            'user_providers.*.monthly_limit' => ['required', 'numeric', 'min:0'],
        ]);

        $user = DB::transaction(function () use ($validated) {

            $user = User::create([
                'name' => $validated['name'],
                'username' => $validated['username'],
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'],
                'password' => $validated['password'], // cast hashed dans le model => OK
                'role' => $validated['role'],
                'is_active' => true, // default
            ]);

            foreach ($validated['user_providers'] as $up) {
                // 1 Mega (MiB) = 1024*1024 octets
                $monthlyLimitBytes = (int) round(((float) $up['monthly_limit']) * 1024 * 1024);

                UserProvider::create([
                    'user_id' => $user->id,
                    'provider_id' => (int) $up['provider_id'],
                    'router_ip' => $validated['router_ip'],
                    'oid_byte_in' => $up['oid_byte_in'],
                    'oid_byte_out' => $up['oid_byte_out'],
                    'monthly_limit' => $monthlyLimitBytes,
                    'is_active' => true, // default
                ]);
            }

            return $user->load(['userProviders']);
        });

        return $this->success($user, 'User Created', 201);

        
    }

    public function listClients()
    {
        $clients = User::where('role', 'client')
                        ->select('id', 'name', 'email', 'created_at')
                        ->orderBy('created_at', 'desc')
                        ->get();

        return $this->success($clients);
    }

    public function updateMyConnection(Request $request, MikrotikService $mikrotik)
    {
        $user = $request->user();

        $validated = $request->validate([
            'network_choice' => ['required', 'integer', 'exists:providers,id', 'distinct'],
        ]);
        $user->update($validated);
        
        $provider = $user->user_provider_for_snmp;
        $choiceNetworkName = $provider->provider->name;

        Log::info('Provider to change '.json_encode($provider));
        Log::info('choiceNetworkName '.($choiceNetworkName));

        $parts = explode('.', $provider->router_ip);
        array_pop($parts);

        $plage_ip = implode('.', $parts).".";
        $interface_name = 'LAN'.$user->id+1;
        $switchInternet = MikrotikRoutingScript::build(interfaceName: $interface_name, plageIp: $plage_ip, switchTo: $choiceNetworkName);

        $result = $mikrotik->exec($switchInternet);

        Log::info('Mikrotik switch Internet to ' .$choiceNetworkName, [
            'output' => $result
        ]);
        Log::info('switch Internet Cmd '. $switchInternet);

        


        return $this->success($user->fresh(), 'Connection updated successfully');
    }
    

}
