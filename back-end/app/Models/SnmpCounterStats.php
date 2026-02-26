<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SnmpCounterStats extends Model
{
    protected $fillable = [
        'user_id',
        'provider_id',
        'last_in_counter',
        'last_out_counter',
        'last_uptime_ticks',
        'last_polled_at',
    ];

    protected $casts = [
        'last_in_counter' => 'integer',
        'last_out_counter' => 'integer',
        'last_uptime_ticks' => 'integer',
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
