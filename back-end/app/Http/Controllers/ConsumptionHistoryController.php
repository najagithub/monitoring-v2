<?php

namespace App\Http\Controllers;

use App\Models\ConsumptionHistory;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class ConsumptionHistoryController extends Controller
{
    use ApiResponse;
    public function index(Request $request)
    {
        $query = ConsumptionHistory::query();
        
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

        return $this->success($query->orderBy('date', 'desc')->get());
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

        return $this->success([
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

        return $this->success($consumption);
    }
}
