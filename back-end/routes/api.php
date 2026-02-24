<?php
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ConsumptionHistoryController;
use App\Http\Controllers\ProviderController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserProviderController;
use App\Http\Controllers\UserSummaryController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function() {
    Route::get('/home', function () {
        return response()->json([
            'success' => true,
            'message' => 'API is working 🚀',
            'timestamp' => now()
        ]);
    })->name('home.api');

    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/me/profile', [UserController::class, 'updateMyProfile']);
        Route::post('/me/password', [UserController::class, 'updateMyPassword']);
        Route::post('/me/update-my-connection', [UserController::class, 'updateMyConnection']);

        Route::apiResource('users', UserController::class);
        Route::get('/providers', [ProviderController::class, 'index']);

        Route::apiResource('user-providers', UserProviderController::class);
        Route::get('/users/{user}/active-providers', [UserProviderController::class, 'activeProviders']);
        
        Route::middleware('is.admin')->group(function () {
            Route::post('/users/create/user-providers', [UserController::class, 'storeUserProvider']);
            Route::get('/users/all/clients', [UserController::class, 'listClients']);
            Route::post('/users/{user}/toggle-active', [UserController::class, 'toggleActive']);
            Route::apiResource('providers', ProviderController::class)->except(['index']);
            Route::post('/users/{user}/update-password', [UserController::class, 'updatePassword']);
            Route::get('/admin/users/summary', [UserSummaryController::class, 'index']);
            Route::post('/admin/user-provider/monthly-limit', [UserProviderController::class, 'updateMonthlyLimit']);
        });


        Route::get('/consumption-history', [ConsumptionHistoryController::class, 'index']);
        Route::post('/consumption-history', [ConsumptionHistoryController::class, 'store']);
        Route::get('/consumption-history/monthly', [ConsumptionHistoryController::class, 'monthlyConsumption']);
        Route::get('/consumption-history/daily', [ConsumptionHistoryController::class, 'dailyConsumption']);
    });
});