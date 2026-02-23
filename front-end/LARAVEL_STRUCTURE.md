# Structure Backend Laravel - Monitoring Internet

Ce document contient toutes les entités, migrations, models, controllers et routes nécessaires pour le backend Laravel.

## 1. Migrations

### 1.1 Create Users Table Migration

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('username')->unique();
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->string('password');
            $table->enum('role', ['admin', 'client'])->default('client');
            $table->boolean('is_active')->default(true);
            $table->string('profile_image')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
```

### 1.2 Create Providers Table Migration

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('providers', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('providers');
    }
};
```

### 1.3 Create User Providers Table Migration

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_providers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('provider_id')->constrained()->onDelete('cascade');
            $table->string('router_ip');
            $table->string('oid_byte_in');
            $table->string('oid_byte_out');
            $table->bigInteger('monthly_limit')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['user_id', 'provider_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_providers');
    }
};
```

### 1.4 Create Consumption History Table Migration

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consumption_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('provider_id')->constrained()->onDelete('cascade');
            $table->bigInteger('bytes_in')->default(0);
            $table->bigInteger('bytes_out')->default(0);
            $table->bigInteger('total_bytes')->default(0);
            $table->date('date');
            $table->timestamps();

            $table->index(['user_id', 'provider_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consumption_histories');
    }
};
```

## 2. Models

### 2.1 User Model

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'username',
        'email',
        'phone',
        'password',
        'role',
        'is_active',
        'profile_image',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function providers()
    {
        return $this->belongsToMany(Provider::class, 'user_providers')
                    ->withPivot('router_ip', 'oid_byte_in', 'oid_byte_out', 'monthly_limit', 'is_active')
                    ->withTimestamps();
    }

    public function userProviders()
    {
        return $this->hasMany(UserProvider::class);
    }

    public function consumptionHistories()
    {
        return $this->hasMany(ConsumptionHistory::class);
    }

    public function isAdmin()
    {
        return $this->role === 'admin';
    }

    public function isClient()
    {
        return $this->role === 'client';
    }
}
```

### 2.2 Provider Model

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Provider extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function users()
    {
        return $this->belongsToMany(User::class, 'user_providers')
                    ->withPivot('router_ip', 'oid_byte_in', 'oid_byte_out', 'monthly_limit', 'is_active')
                    ->withTimestamps();
    }

    public function userProviders()
    {
        return $this->hasMany(UserProvider::class);
    }

    public function consumptionHistories()
    {
        return $this->hasMany(ConsumptionHistory::class);
    }
}
```

### 2.3 UserProvider Model

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserProvider extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'provider_id',
        'router_ip',
        'oid_byte_in',
        'oid_byte_out',
        'monthly_limit',
        'is_active',
    ];

    protected $casts = [
        'monthly_limit' => 'integer',
        'is_active' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }
}
```

### 2.4 ConsumptionHistory Model

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConsumptionHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'provider_id',
        'bytes_in',
        'bytes_out',
        'total_bytes',
        'date',
    ];

    protected $casts = [
        'bytes_in' => 'integer',
        'bytes_out' => 'integer',
        'total_bytes' => 'integer',
        'date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function provider()
    {
        return $this->belongsTo(Provider::class);
    }
}
```

## 3. Controllers

### 3.1 AuthController

```php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email_or_username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email_or_username)
                    ->orWhere('username', $request->email_or_username)
                    ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email_or_username' => ['The provided credentials are incorrect.'],
            ]);
        }

        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email_or_username' => ['Your account has been deactivated.'],
            ]);
        }

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('auth_token')->plainTextToken,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
```

### 3.2 UserController

```php
<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        return response()->json($query->with('userProviders.provider')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'username' => 'required|string|unique:users',
            'email' => 'required|email|unique:users',
            'phone' => 'nullable|string',
            'password' => 'required|string|min:6',
            'role' => 'required|in:admin,client',
        ]);

        $validated['password'] = Hash::make($validated['password']);

        $user = User::create($validated);

        return response()->json($user, 201);
    }

    public function show(User $user)
    {
        return response()->json($user->load('userProviders.provider'));
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'username' => 'sometimes|string|unique:users,username,' . $user->id,
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'phone' => 'nullable|string',
            'profile_image' => 'nullable|string',
        ]);

        $user->update($validated);

        return response()->json($user);
    }

    public function toggleActive(User $user)
    {
        $user->update(['is_active' => !$user->is_active]);

        return response()->json($user);
    }

    public function updatePassword(Request $request, User $user)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password is incorrect'], 422);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        return response()->json(['message' => 'Password updated successfully']);
    }
}
```

### 3.3 ProviderController

```php
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
```

### 3.4 UserProviderController

```php
<?php

namespace App\Http\Controllers;

use App\Models\UserProvider;
use Illuminate\Http\Request;

class UserProviderController extends Controller
{
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
}
```

### 3.5 ConsumptionHistoryController

```php
<?php

namespace App\Http\Controllers;

use App\Models\ConsumptionHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConsumptionHistoryController extends Controller
{
    public function index(Request $request)
    {
        $query = ConsumptionHistory::with(['user', 'provider']);

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('provider_id')) {
            $query->where('provider_id', $request->provider_id);
        }

        if ($request->has('start_date')) {
            $query->where('date', '>=', $request->start_date);
        }

        if ($request->has('end_date')) {
            $query->where('date', '<=', $request->end_date);
        }

        return response()->json($query->orderBy('date', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'provider_id' => 'required|exists:providers,id',
            'bytes_in' => 'required|integer|min:0',
            'bytes_out' => 'required|integer|min:0',
            'date' => 'required|date',
        ]);

        $validated['total_bytes'] = $validated['bytes_in'] + $validated['bytes_out'];

        $consumption = ConsumptionHistory::create($validated);

        return response()->json($consumption->load(['user', 'provider']), 201);
    }

    public function monthlyConsumption(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'provider_id' => 'required|exists:providers,id',
            'month' => 'required|date_format:Y-m',
        ]);

        $consumption = ConsumptionHistory::where('user_id', $request->user_id)
            ->where('provider_id', $request->provider_id)
            ->whereYear('date', substr($request->month, 0, 4))
            ->whereMonth('date', substr($request->month, 5, 2))
            ->sum('total_bytes');

        return response()->json([
            'user_id' => $request->user_id,
            'provider_id' => $request->provider_id,
            'month' => $request->month,
            'total_consumption' => $consumption,
        ]);
    }

    public function dailyConsumption(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'provider_id' => 'required|exists:providers,id',
            'days' => 'integer|min:1|max:365',
        ]);

        $days = $request->input('days', 7);

        $consumption = ConsumptionHistory::where('user_id', $request->user_id)
            ->where('provider_id', $request->provider_id)
            ->where('date', '>=', now()->subDays($days))
            ->orderBy('date', 'asc')
            ->get();

        return response()->json($consumption);
    }
}
```

## 4. Routes (api.php)

```php
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ProviderController;
use App\Http\Controllers\UserProviderController;
use App\Http\Controllers\ConsumptionHistoryController;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::apiResource('users', UserController::class);
    Route::post('/users/{user}/toggle-active', [UserController::class, 'toggleActive']);
    Route::post('/users/{user}/update-password', [UserController::class, 'updatePassword']);

    Route::apiResource('providers', ProviderController::class);

    Route::apiResource('user-providers', UserProviderController::class);

    Route::get('/consumption-history', [ConsumptionHistoryController::class, 'index']);
    Route::post('/consumption-history', [ConsumptionHistoryController::class, 'store']);
    Route::get('/consumption-history/monthly', [ConsumptionHistoryController::class, 'monthlyConsumption']);
    Route::get('/consumption-history/daily', [ConsumptionHistoryController::class, 'dailyConsumption']);
});
```

## 5. Seeders

### Database Seeder

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Provider;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'username' => 'admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'is_active' => true,
        ]);

        User::create([
            'username' => 'client1',
            'email' => 'client1@example.com',
            'password' => Hash::make('password'),
            'role' => 'client',
            'is_active' => true,
        ]);

        Provider::create(['name' => 'YAS', 'is_active' => true]);
        Provider::create(['name' => 'Starlink', 'is_active' => true]);
    }
}
```

## 6. Middleware (optionnel)

### Admin Middleware

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        if (!$request->user() || !$request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return $next($request);
    }
}
```

## 7. Configuration

N'oubliez pas d'installer Laravel Sanctum pour l'authentification API:

```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

Dans `config/cors.php`, configurez CORS pour permettre les requêtes depuis votre frontend React:

```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:5173')],
'allowed_methods' => ['*'],
'allowed_headers' => ['*'],
'supports_credentials' => true,
```

## 8. Variables d'environnement (.env)

```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
SESSION_DRIVER=cookie
SANCTUM_STATEFUL_DOMAINS=localhost:5173
```

## Utilisation

1. Créez un nouveau projet Laravel
2. Copiez les migrations dans `database/migrations/`
3. Copiez les models dans `app/Models/`
4. Copiez les controllers dans `app/Http/Controllers/`
5. Ajoutez les routes dans `routes/api.php`
6. Créez le seeder dans `database/seeders/`
7. Exécutez les commandes:

```bash
php artisan migrate
php artisan db:seed
php artisan serve
```

Votre API sera disponible à `http://localhost:8000/api`
