<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('defense_week_ranks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('irl_franchise_id')->constrained('irl_franchises')->cascadeOnDelete();
            $table->unsignedTinyInteger('week');
            $table->unsignedSmallInteger('rank');
            $table->timestamps();

            $table->unique(['week', 'irl_franchise_id']);
            $table->index(['week', 'rank']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('defense_week_ranks');
    }
};
