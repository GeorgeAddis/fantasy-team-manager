<?php

namespace App\Support;

use App\Models\League;

/**
 * Resolve which player ranking columns to use for a league's scoring format.
 * Existing columns (season_rank, week_rank, …) are the PPR set.
 */
class RankingFields
{
    public const CANONICAL = [
        'week_rank',
        'week_position_rank',
        'season_rank',
        'season_position_rank',
        'waiver_rank',
        'waiver_rank_overall',
    ];

    /**
     * @return array<string, string> canonical field => actual DB column
     */
    public static function columns(?League $league = null, ?bool $ppr = null): array
    {
        $isPpr = $ppr ?? ($league?->ppr ?? true);

        if ($isPpr) {
            return array_combine(self::CANONICAL, self::CANONICAL);
        }

        return [
            'week_rank' => 'week_rank_non_ppr',
            'week_position_rank' => 'week_position_rank_non_ppr',
            'season_rank' => 'season_rank_non_ppr',
            'season_position_rank' => 'season_position_rank_non_ppr',
            'waiver_rank' => 'waiver_rank_non_ppr',
            'waiver_rank_overall' => 'waiver_rank_overall_non_ppr',
        ];
    }

    public static function column(string $canonical, ?League $league = null, ?bool $ppr = null): string
    {
        return self::columns($league, $ppr)[$canonical] ?? $canonical;
    }

    /**
     * Map a player model's ranking attributes onto canonical keys for API responses.
     *
     * @return array<string, mixed>
     */
    public static function valuesFor(object $player, ?League $league = null, ?bool $ppr = null): array
    {
        $cols = self::columns($league, $ppr);
        $out = [];
        foreach ($cols as $canonical => $dbCol) {
            $out[$canonical] = $player->{$dbCol} ?? null;
        }

        return $out;
    }
}
