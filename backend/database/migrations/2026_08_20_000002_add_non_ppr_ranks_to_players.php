<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->integer('week_rank_non_ppr')->nullable()->after('week_position_rank');
            $table->integer('week_position_rank_non_ppr')->nullable()->after('week_rank_non_ppr');
            $table->integer('season_rank_non_ppr')->nullable()->after('season_position_rank');
            $table->integer('season_position_rank_non_ppr')->nullable()->after('season_rank_non_ppr');
            $table->integer('waiver_rank_non_ppr')->nullable()->after('waiver_rank_overall');
            $table->integer('waiver_rank_overall_non_ppr')->nullable()->after('waiver_rank_non_ppr');
        });

        // Match existing week/season unranked sentinel for new columns.
        DB::table('players')->update([
            'week_rank_non_ppr' => 999,
            'week_position_rank_non_ppr' => 999,
            'season_rank_non_ppr' => 999,
            'season_position_rank_non_ppr' => 999,
        ]);
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn([
                'week_rank_non_ppr',
                'week_position_rank_non_ppr',
                'season_rank_non_ppr',
                'season_position_rank_non_ppr',
                'waiver_rank_non_ppr',
                'waiver_rank_overall_non_ppr',
            ]);
        });
    }
};
