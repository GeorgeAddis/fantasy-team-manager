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
            $table->jsonb('positions')->default('[]')->after('position');
        });

        DB::statement("UPDATE players SET positions = jsonb_build_array(position) WHERE position IS NOT NULL AND position != ''");

        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('position');
        });
    }

    public function down(): void
    {
        Schema::table('players', function (Blueprint $table) {
            $table->string('position', 8)->nullable()->after('season_rank');
        });

        DB::statement("UPDATE players SET position = positions->>0 WHERE jsonb_array_length(positions) > 0");

        Schema::table('players', function (Blueprint $table) {
            $table->dropColumn('positions');
        });
    }
};
