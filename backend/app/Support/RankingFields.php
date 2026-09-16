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

    public static function scoringIndependentPositions(): array
    {
        return ['K', 'DST'];
    }

    public static function isScoringIndependent(array $positions = [], ?string $type = null): bool
    {
        if ($type !== null && in_array($type, self::scoringIndependentPositions(), true)) {
            return true;
        }

        return (bool) array_intersect($positions, self::scoringIndependentPositions());
    }

    /**
     * K / DST ranks are the same in PPR and non-PPR. Copy written rank
     * columns onto the matching column in the other scoring set.
     */
    public static function mirrorScoringIndependent(array $fields): array
    {
        $pairs = [
            'week_position_rank' => 'week_position_rank_non_ppr',
            'week_position_rank_non_ppr' => 'week_position_rank',
            'season_position_rank' => 'season_position_rank_non_ppr',
            'season_position_rank_non_ppr' => 'season_position_rank',
            'waiver_rank' => 'waiver_rank_non_ppr',
            'waiver_rank_non_ppr' => 'waiver_rank',
        ];

        $out = $fields;
        foreach ($fields as $col => $value) {
            $other = $pairs[$col] ?? null;
            if ($other !== null && !array_key_exists($other, $out)) {
                $out[$other] = $value;
            }
        }

        return $out;
    }

    /**
     * Write the same rank values onto the matching PPR and non-PPR columns.
     */
    public static function applyToBothScoringFormats(array $fields): array
    {
        $pairs = [
            'week_rank' => 'week_rank_non_ppr',
            'week_rank_non_ppr' => 'week_rank',
            'week_position_rank' => 'week_position_rank_non_ppr',
            'week_position_rank_non_ppr' => 'week_position_rank',
            'season_rank' => 'season_rank_non_ppr',
            'season_rank_non_ppr' => 'season_rank',
            'season_position_rank' => 'season_position_rank_non_ppr',
            'season_position_rank_non_ppr' => 'season_position_rank',
            'waiver_rank' => 'waiver_rank_non_ppr',
            'waiver_rank_non_ppr' => 'waiver_rank',
            'waiver_rank_overall' => 'waiver_rank_overall_non_ppr',
            'waiver_rank_overall_non_ppr' => 'waiver_rank_overall',
        ];

        $out = $fields;
        foreach ($fields as $col => $value) {
            $other = $pairs[$col] ?? null;
            if ($other !== null) {
                $out[$other] = $value;
            }
        }

        return $out;
    }
}
