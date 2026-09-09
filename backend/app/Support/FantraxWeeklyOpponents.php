<?php

namespace App\Support;

use App\Models\League;
use App\Models\Team;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class FantraxWeeklyOpponents
{
    /**
     * Local opponent team id for my team in each league this scoring period.
     *
     * @return array<int, int> league_id => opponent team_id
     */
    public static function opponentTeamIdByLeague(int $week): array
    {
        if ($week < 1 || $week > 17) {
            return [];
        }

        $leagues = League::query()
            ->where('bestball', false)
            ->whereNotNull('fantrax_id')
            ->whereHas('teams', fn ($q) => $q->where('my_team', true))
            ->get(['id', 'fantrax_id']);

        if ($leagues->isEmpty()) {
            return [];
        }

        $teams = Team::query()
            ->whereIn('league_id', $leagues->pluck('id'))
            ->whereNotNull('fantrax_id')
            ->get(['id', 'league_id', 'fantrax_id', 'my_team']);

        $teamsByLeague = $teams->groupBy('league_id');
        $schedules = self::matchupSchedules($leagues);

        $out = [];
        foreach ($leagues as $league) {
            $leagueTeams = $teamsByLeague[$league->id] ?? collect();
            $mine = $leagueTeams->firstWhere('my_team', true);
            $myFantraxId = $mine?->fantrax_id !== null ? (string) $mine->fantrax_id : '';
            if ($myFantraxId === '') {
                continue;
            }

            $opponentFantraxId = null;
            foreach ($schedules[$league->id][$week] ?? [] as [$awayId, $homeId]) {
                if ($awayId === $myFantraxId) {
                    $opponentFantraxId = $homeId;
                    break;
                }
                if ($homeId === $myFantraxId) {
                    $opponentFantraxId = $awayId;
                    break;
                }
            }
            if ($opponentFantraxId === null || $opponentFantraxId === '') {
                continue;
            }

            $opponent = $leagueTeams->first(
                fn (Team $team) => (string) $team->fantrax_id === $opponentFantraxId
            );
            if ($opponent) {
                $out[$league->id] = $opponent->id;
            }
        }

        return $out;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, League>  $leagues
     * @return array<int, array<int, list<array{0: string, 1: string}>>>
     */
    private static function matchupSchedules($leagues): array
    {
        $schedules = [];
        $missing = [];
        foreach ($leagues as $league) {
            $cached = Cache::get(self::cacheKey((string) $league->fantrax_id));
            if (is_array($cached)) {
                $schedules[$league->id] = $cached;
            } else {
                $missing[] = $league;
            }
        }

        foreach (array_chunk($missing, 8) as $chunk) {
            $secret = config('services.fantrax.user_secret_id');
            $responses = Http::pool(function (Pool $pool) use ($chunk, $secret) {
                foreach ($chunk as $league) {
                    $params = ['leagueId' => $league->fantrax_id];
                    if ($secret) {
                        $params['userSecretId'] = $secret;
                    }
                    $pool->as((string) $league->id)
                        ->timeout(45)
                        ->get('https://www.fantrax.com/fxea/general/getLeagueInfo', $params);
                }
            });

            foreach ($chunk as $league) {
                $response = $responses[(string) $league->id] ?? null;
                $parsed = is_object($response) && method_exists($response, 'successful') && $response->successful()
                    ? self::parseMatchups($response->json('matchups') ?? [])
                    : [];
                Cache::put(self::cacheKey((string) $league->fantrax_id), $parsed, now()->addHours(6));
                $schedules[$league->id] = $parsed;
            }
        }

        return $schedules;
    }

    /**
     * @return array<int, list<array{0: string, 1: string}>>
     */
    private static function parseMatchups(mixed $matchups): array
    {
        if (!is_array($matchups)) {
            return [];
        }

        $byPeriod = [];
        foreach ($matchups as $periodRow) {
            if (!is_array($periodRow)) {
                continue;
            }
            $period = (int) ($periodRow['period'] ?? 0);
            if ($period < 1) {
                continue;
            }
            $pairs = [];
            foreach ($periodRow['matchupList'] ?? [] as $matchup) {
                if (!is_array($matchup)) {
                    continue;
                }
                $away = (string) ($matchup['away']['id'] ?? '');
                $home = (string) ($matchup['home']['id'] ?? '');
                if ($away === '' || $home === '') {
                    continue;
                }
                $pairs[] = [$away, $home];
            }
            $byPeriod[$period] = $pairs;
        }

        return $byPeriod;
    }

    private static function cacheKey(string $fantraxLeagueId): string
    {
        return 'fantrax.matchups.'.$fantraxLeagueId;
    }
}
