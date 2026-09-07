<?php

namespace App\Support;

use App\Models\League;
use App\Models\LeaguePlayerStatus;
use App\Models\Player;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class FantraxLeagueStatusSync
{
    /**
     * Replace stored Fantrax player statuses (FA / WW / T) for a league.
     */
    public static function sync(League $league): int
    {
        if (!$league->fantrax_id) {
            return 0;
        }

        $response = Http::timeout(60)->get('https://www.fantrax.com/fxea/general/getLeagueInfo', [
            'leagueId' => $league->fantrax_id,
        ]);

        if (!$response->successful()) {
            return 0;
        }

        $playerInfo = $response->json('playerInfo') ?? [];
        if (!is_array($playerInfo) || $playerInfo === []) {
            return 0;
        }

        $byFantraxId = Player::query()
            ->whereNotNull('fantrax_id')
            ->pluck('id', 'fantrax_id');

        $now = now();
        $rows = [];
        foreach ($playerInfo as $fantraxId => $info) {
            $playerId = $byFantraxId[(string) $fantraxId] ?? null;
            if ($playerId === null) {
                continue;
            }
            $status = strtoupper(trim((string) (is_array($info) ? ($info['status'] ?? '') : '')));
            if (!in_array($status, ['FA', 'WW', 'T'], true)) {
                continue;
            }
            $rows[] = [
                'league_id' => $league->id,
                'player_id' => $playerId,
                'status' => $status,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::transaction(function () use ($league, $rows) {
            LeaguePlayerStatus::query()->where('league_id', $league->id)->delete();
            foreach (array_chunk($rows, 500) as $chunk) {
                LeaguePlayerStatus::query()->insert($chunk);
            }
        });

        return count($rows);
    }
}
