<?php

namespace App\Support;

use App\Models\IrlFranchise;
use App\Models\IrlGame;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class NflScheduleSync
{
    public const MIN_WEEK = 1;

    public const MAX_WEEK = 17;

    private const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';

    /** ESPN abbreviations that differ from our IRL franchise abbreviations. */
    private const ESPN_ABBR_ALIASES = [
        'WSH' => 'WAS',
        'JAC' => 'JAX',
        'GBP' => 'GB',
        'GNB' => 'GB',
        'SFO' => 'SF',
        'KAN' => 'KC',
        'NWE' => 'NE',
        'NOR' => 'NO',
        'TAM' => 'TB',
        'OAK' => 'LV',
        'LVR' => 'LV',
        'SD' => 'LAC',
        'STL' => 'LAR',
    ];

    public static function currentSeasonYear(?CarbonImmutable $now = null): int
    {
        $now ??= CarbonImmutable::now();

        return $now->month >= 3 ? $now->year : $now->year - 1;
    }

    /**
     * Replace weeks 1–17 for the season from ESPN's unofficial scoreboard API.
     *
     * @return array{season: int, weeks: int, imported: int, unmatched: list<array{week: int, name: string}>}
     */
    public static function sync(?int $season = null): array
    {
        $season ??= self::currentSeasonYear();
        $lookup = self::franchiseLookup();

        $responses = Http::pool(function (Pool $pool) use ($season) {
            foreach (range(self::MIN_WEEK, self::MAX_WEEK) as $week) {
                $pool->as((string) $week)
                    ->timeout(25)
                    ->get(self::ESPN_SCOREBOARD, [
                        'seasontype' => 2,
                        'week' => $week,
                        'dates' => $season,
                    ]);
            }
        });

        $rows = [];
        $unmatched = [];

        foreach (range(self::MIN_WEEK, self::MAX_WEEK) as $week) {
            $response = $responses[(string) $week] ?? null;
            if (!$response || !$response->successful()) {
                $status = $response?->status() ?? 'no response';
                throw new RuntimeException("Failed to fetch ESPN schedule for week {$week} (HTTP {$status}).");
            }

            $events = $response->json('events') ?? [];
            if (!is_array($events) || $events === []) {
                throw new RuntimeException("ESPN returned no games for week {$week}.");
            }

            foreach ($events as $event) {
                if (!is_array($event)) {
                    continue;
                }

                $parsed = self::parseEvent($event, $week, $season, $lookup);
                if (isset($parsed['unmatched'])) {
                    $unmatched[] = $parsed['unmatched'];
                    continue;
                }

                $rows[] = $parsed;
            }
        }

        if ($rows === []) {
            throw new RuntimeException('ESPN returned games, but none could be matched to IRL franchises.');
        }

        DB::transaction(function () use ($season, $rows) {
            IrlGame::query()->where('season', $season)->whereBetween('week', [self::MIN_WEEK, self::MAX_WEEK])->delete();

            $now = now();
            IrlGame::query()->insert(array_map(
                fn (array $row) => $row + ['created_at' => $now, 'updated_at' => $now],
                $rows
            ));
        });

        return [
            'season' => $season,
            'weeks' => self::MAX_WEEK,
            'imported' => count($rows),
            'unmatched' => $unmatched,
        ];
    }

    /**
     * @param  array<string, IrlFranchise>  $lookup
     * @return array<string, mixed>
     */
    private static function parseEvent(array $event, int $week, int $season, array $lookup): array
    {
        $competition = $event['competitions'][0] ?? null;
        $competitors = is_array($competition) ? ($competition['competitors'] ?? []) : [];
        $away = null;
        $home = null;

        foreach ($competitors as $competitor) {
            if (!is_array($competitor)) {
                continue;
            }
            $abbr = strtoupper(trim((string) ($competitor['team']['abbreviation'] ?? '')));
            $name = (string) ($competitor['team']['displayName'] ?? $abbr);
            $side = $competitor['homeAway'] ?? null;
            if ($side === 'away') {
                $away = ['abbr' => $abbr, 'name' => $name];
            }
            if ($side === 'home') {
                $home = ['abbr' => $abbr, 'name' => $name];
            }
        }

        if (!$away || !$home) {
            return [
                'unmatched' => [
                    'week' => $week,
                    'name' => (string) ($event['name'] ?? $event['shortName'] ?? 'Unknown game'),
                ],
            ];
        }

        $awayFranchise = self::findFranchise($away['abbr'], $lookup);
        $homeFranchise = self::findFranchise($home['abbr'], $lookup);
        if (!$awayFranchise || !$homeFranchise) {
            $missing = [];
            if (!$awayFranchise) {
                $missing[] = $away['name'].' ('.$away['abbr'].')';
            }
            if (!$homeFranchise) {
                $missing[] = $home['name'].' ('.$home['abbr'].')';
            }

            return [
                'unmatched' => [
                    'week' => $week,
                    'name' => implode(' / ', $missing),
                ],
            ];
        }

        $rawDate = $competition['date'] ?? $event['date'] ?? null;
        if (!is_string($rawDate) || $rawDate === '') {
            return [
                'unmatched' => [
                    'week' => $week,
                    'name' => (string) ($event['name'] ?? 'Missing kickoff time'),
                ],
            ];
        }

        $kickoff = CarbonImmutable::parse($rawDate)->utc();
        $espnId = isset($event['id']) ? (string) $event['id'] : null;

        return [
            'season' => $season,
            'week' => $week,
            'kickoff_at' => $kickoff->toIso8601String(),
            'away_irl_franchise_id' => $awayFranchise->id,
            'home_irl_franchise_id' => $homeFranchise->id,
            'espn_event_id' => $espnId !== '' ? $espnId : null,
        ];
    }

    /**
     * @return array<string, IrlFranchise>
     */
    private static function franchiseLookup(): array
    {
        $lookup = [];
        foreach (IrlFranchise::query()->get() as $franchise) {
            foreach ([$franchise->abbreviated_name, $franchise->alternate_abbreviated_name] as $abbr) {
                $key = strtoupper(trim((string) $abbr));
                if ($key !== '') {
                    $lookup[$key] = $franchise;
                }
            }
        }

        return $lookup;
    }

    /**
     * @param  array<string, IrlFranchise>  $lookup
     */
    private static function findFranchise(string $espnAbbr, array $lookup): ?IrlFranchise
    {
        $abbr = strtoupper(trim($espnAbbr));
        $mapped = self::ESPN_ABBR_ALIASES[$abbr] ?? $abbr;

        return $lookup[$mapped] ?? $lookup[$abbr] ?? null;
    }
}
