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
