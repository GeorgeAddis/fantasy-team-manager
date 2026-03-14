<?php

use App\Http\Controllers\Api\V1\IrlFranchiseController;
use App\Http\Controllers\Api\V1\LeagueController;
use App\Http\Controllers\Api\V1\LineupSlotController;
use App\Http\Controllers\Api\V1\PlayerController;
use App\Http\Controllers\Api\V1\TeamController;
use Illuminate\Support\Facades\Route;

/*
| DRF-style JSON API — prefix: /api/v1
| Standard: index/create store, show, update, destroy
*/
Route::prefix('v1')->group(function () {
    Route::apiResource('leagues', LeagueController::class);
    Route::apiResource('teams', TeamController::class);
    Route::apiResource('irl-franchises', IrlFranchiseController::class);
    Route::apiResource('players', PlayerController::class);
    Route::apiResource('lineup-slots', LineupSlotController::class);
});
