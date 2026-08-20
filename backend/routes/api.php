<?php

use App\Http\Controllers\Api\V1\GlobalSettingController;
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
    Route::post('leagues/flag-waiver-claims', [LeagueController::class, 'flagWaiverClaims']);
    Route::post('leagues/flag-roster-moves', [LeagueController::class, 'flagRosterMoves']);
    Route::post('leagues/flag-roster-optimisation', [LeagueController::class, 'flagRosterOptimisation']);
    Route::post('leagues/flag-thursday-update', [LeagueController::class, 'flagThursdayUpdate']);
    Route::post('leagues/flag-pre-season-optimisation', [LeagueController::class, 'flagPreSeasonOptimisation']);
    Route::post('leagues/import-fantrax', [LeagueController::class, 'importFantrax']);
    Route::post('leagues/update-all-rosters', [LeagueController::class, 'updateAllRosters']);
    Route::get('leagues/{league}/waiver-board', [LeagueController::class, 'waiverBoard']);
    Route::post('leagues/{league}/update-rosters', [LeagueController::class, 'updateRosters']);
    Route::apiResource('leagues', LeagueController::class);
    Route::get('teams/lineup-analysis', [TeamController::class, 'lineupAnalysis']);
    Route::get('teams/roster-add-analysis', [TeamController::class, 'rosterAddAnalysis']);
    Route::get('teams/pre-season-optimise-analysis', [TeamController::class, 'preSeasonOptimiseAnalysis']);
    Route::get('teams/{team}/roster', [TeamController::class, 'roster']);
    Route::apiResource('teams', TeamController::class);
    Route::apiResource('irl-franchises', IrlFranchiseController::class);
    Route::get('players/do-not-roster', [PlayerController::class, 'doNotRosterList']);
    Route::post('players/do-not-roster', [PlayerController::class, 'doNotRosterAdd']);
    Route::delete('players/{player}/do-not-roster', [PlayerController::class, 'doNotRosterRemove']);
    Route::post('players/reset-do-not-roster', [PlayerController::class, 'doNotRosterReset']);
    Route::get('players/do-not-roster-teams', [PlayerController::class, 'doNotRosterTeams']);
    Route::post('players/import', [PlayerController::class, 'import']);
    Route::post('players/import-rankings', [PlayerController::class, 'importRankings']);
    Route::post('players/import-season-rankings', [PlayerController::class, 'importSeasonRankings']);
    Route::post('players/import-waiver-rankings', [PlayerController::class, 'importWaiverRankings']);
    Route::post('players/import-fantrax-ids', [PlayerController::class, 'importFantraxIds']);
    Route::get('players/search-my-teams', [PlayerController::class, 'searchMyTeams']);
    Route::get('players/stats', [PlayerController::class, 'stats']);
    Route::apiResource('players', PlayerController::class);
    Route::apiResource('lineup-slots', LineupSlotController::class);
    Route::get('settings', [GlobalSettingController::class, 'index']);
    Route::patch('settings', [GlobalSettingController::class, 'update']);
});
