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
        'oid_name',
        'oid_byte_in',
        'oid_byte_out',
        'monthly_limit',
        'is_active',
        'internet_status',
    ];

    protected $casts = [
        'monthly_limit' => 'integer',
        'is_active' => 'boolean',
        'internet_status' => 'boolean',
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
