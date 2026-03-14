<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('irl_franchises', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('abbreviated_name');
            $table->string('alternate_name')->nullable();
            $table->string('alternate_abbreviated_name')->nullable();
            $table->unsignedTinyInteger('bye_week')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('irl_franchises');
    }
};
