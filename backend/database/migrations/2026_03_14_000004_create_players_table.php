<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('players', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('irl_franchise_id')->nullable()->constrained('irl_franchises')->nullOnDelete();
            $table->unsignedInteger('week_rank')->default(0);
            $table->unsignedInteger('season_rank')->default(0);
            $table->string('position', 8); // QB, RB, WR, TE, K, DST
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('players');
    }
};
