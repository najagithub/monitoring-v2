<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('snmp_counter_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('provider_id')->constrained()->onDelete('cascade');  
            $table->unsignedBigInteger('last_in_counter');
            $table->unsignedBigInteger('last_out_counter');
            $table->unsignedBigInteger('last_uptime_ticks'); 
            $table->timestamp('last_polled_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'provider_id']);
        });


    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('snmp_counter_stats');
    }
};
