<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('irl_games', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('season');
            $table->unsignedTinyInteger('week');
            $table->timestampTz('kickoff_at');
            $table->foreignId('away_irl_franchise_id')->constrained('irl_franchises')->cascadeOnDelete();
            $table->foreignId('home_irl_franchise_id')->constrained('irl_franchises')->cascadeOnDelete();
            $table->string('espn_event_id')->nullable();
            $table->timestamps();

            $table->unique('espn_event_id');
            $table->unique(
                ['season', 'week', 'away_irl_franchise_id', 'home_irl_franchise_id'],
                'irl_games_matchup_unique'
            );
            $table->index(['season', 'week', 'kickoff_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('irl_games');
    }
};
