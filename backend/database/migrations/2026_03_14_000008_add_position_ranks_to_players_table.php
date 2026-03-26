<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->unsignedInteger('week_position_rank')->nullable()->after('week_rank');
            $table->unsignedInteger('season_position_rank')->nullable()->after('season_rank');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn(['week_position_rank', 'season_position_rank']);
        });
    }
};

