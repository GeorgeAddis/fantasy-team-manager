<?php

namespace App\Support;

use App\Models\GlobalSetting;
use App\Models\IrlGame;
use App\Models\League;
use App\Models\Player;
use App\Models\Team;
use App\Support\RankingFields;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class OptimalLineup
{
    /**
     * @return array<int, CarbonImmutable>
     */
    public static function kickoffsForCurrentWeek(): array
    {
        $week = (int) GlobalSetting::getValue('current_week', 0);
        if ($week < 1 || $week > 17) {
            return [];
        }

        $kickoffs = [];
        $games = IrlGame::query()
            ->where('season', NflScheduleSync::currentSeasonYear())
            ->where('week', $week)
            ->get(['away_irl_franchise_id', 'home_irl_franchise_id', 'kickoff_at']);

        foreach ($games as $game) {
            if ($game->kickoff_at === null) {
                continue;
            }
            $kickoff = $game->kickoff_at instanceof CarbonImmutable
                ? $game->kickoff_at
                : CarbonImmutable::parse($game->kickoff_at);
            $kickoffs[$game->away_irl_franchise_id] = $kickoff;
            $kickoffs[$game->home_irl_franchise_id] = $kickoff;
        }

        return $kickoffs;
    }

    /**
     * 1) Best valid lineup by week rank (legal slots).
     * 2) Then FLEX = latest kickoff in the extra RB/WR/TE group only.
     *
     * @param  Collection<int, Player>  $players
     * @param  array<int, CarbonImmutable>  $kickoffsByFranchiseId
     * @return array{positions: array<int, string>, starter_ids: list<int>}
     */
    public static function assign(Collection $players, ?League $league, array $kickoffsByFranchiseId = []): array
    {
        $cols = RankingFields::columns($league);
        $weekRankCol = $cols['week_rank'];
        $weekPosCol = $cols['week_position_rank'];
        $positionRankOnly = ['QB', 'K', 'DST'];

        $players = $players->keyBy('id');
        $currentWeek = (int) GlobalSetting::getValue('current_week', 0);

        $rankValue = function (object $player, string $col): int {
            $rank = $player->{$col} ?? 999;
            if (!is_numeric($rank) || (int) $rank <= 0 || (int) $rank >= 999) {
                return 10000;
            }

            return (int) $rank;
        };

        $sortKey = function (object $player, string $col) use ($rankValue, $kickoffsByFranchiseId, $currentWeek): int {
            $playing = self::isPlayingThisWeek($player, $kickoffsByFranchiseId, $currentWeek) ? 0 : 100000;

            return $playing + $rankValue($player, $col);
        };

        $pool = fn (string $pos) => $players
            ->filter(fn ($p) => in_array($pos, $p->positions ?? [], true))
            ->sortBy(fn ($p) => $sortKey($p, in_array($pos, $positionRankOnly, true) ? $weekPosCol : $weekRankCol))
            ->values();

        $used = [];

        $pickOne = function (Collection $candidates) use (&$used): ?int {
            foreach ($candidates as $p) {
                if (!isset($used[$p->id])) {
                    $used[$p->id] = true;

                    return $p->id;
                }
            }

            return null;
        };

        $pickMany = function (Collection $candidates, int $n) use (&$used): array {
            $picked = [];
            foreach ($candidates as $p) {
                if (!isset($used[$p->id])) {
                    $used[$p->id] = true;
                    $picked[] = $p->id;
                    if (count($picked) === $n) {
                        break;
                    }
                }
            }

            return $picked;
        };

        $optQB = $pickOne($pool('QB'));
        $optRBs = $pickMany($pool('RB'), 2);
        $optWRs = $pickMany($pool('WR'), 3);
        $optTE = $pickOne($pool('TE'));

        $flexPool = $players
            ->filter(fn ($p) => !isset($used[$p->id])
                && array_intersect(['RB', 'WR', 'TE'], $p->positions ?? []))
            ->sortBy(fn ($p) => $sortKey($p, $weekRankCol))
            ->values();
        $optRWT = $pickOne($flexPool);

        $optK = $pickOne($pool('K'));
        $optDST = $pickOne($pool('DST'));

        [$optRBs, $optWRs, $optTE, $optRWT] = self::placeLatestFlex(
            $optRBs,
            $optWRs,
            $optTE,
            $optRWT,
            $players,
            $kickoffsByFranchiseId
        );

        $positions = [];
        if ($optQB) {
            $positions[$optQB] = 'QB';
        }
        foreach ($optRBs as $i => $id) {
            $positions[$id] = 'RB'.($i + 1);
        }
        foreach ($optWRs as $i => $id) {
            $positions[$id] = 'WR'.($i + 1);
        }
        if ($optTE) {
            $positions[$optTE] = 'TE';
        }
        if ($optRWT) {
            $positions[$optRWT] = 'FLEX';
        }
        if ($optK) {
            $positions[$optK] = 'K';
        }
        if ($optDST) {
            $positions[$optDST] = 'DST';
        }

        return [
            'positions' => $positions,
            'starter_ids' => array_keys($positions),
        ];
    }

    /**
     * Roster-only lineup advice: rank-optimal starters, playing players before byes,
     * FLEX = latest kickoff among the surplus group. Used by Require Lineup Change
     * and Thursday step 1.
     *
     * @return array{changes: list<array<string, mixed>>, optimal_lineup: array{starters: list<array<string, mixed>>, bench: list<array<string, mixed>>}}
     */
    public static function lineupAdvice(Team $team, array $kickoffsByFranchiseId = []): array
    {
        $slots = $team->lineupSlots;
        $empty = ['changes' => [], 'optimal_lineup' => ['starters' => [], 'bench' => []]];
        if ($slots->isEmpty()) {
            return $empty;
        }

        $players = $slots
            ->filter(fn ($s) => $s->player !== null)
            ->map(fn ($s) => $s->player)
            ->unique('id');

        if ($players->isEmpty()) {
            return $empty;
        }

        $league = $team->league;
        $playerById = $players->keyBy('id');
        $nameOf = $players->pluck('name', 'id')->toArray();

        $currentStarterIds = [];
        $currentPosOf = [];
        $currentByPos = [];
        foreach ($slots as $slot) {
            if ($slot->player_id === null || $slot->lineup_position->value === 'BN') {
                continue;
            }
            $label = $slot->lineup_position->value === 'RWT' ? 'FLEX' : $slot->lineup_position->value;
            $currentStarterIds[$slot->player_id] = true;
            $currentPosOf[$slot->player_id] = $label;
            $currentByPos[$label] = $slot->player_id;
        }

        $assigned = self::assign($players, $league, $kickoffsByFranchiseId);
        $assigned = self::keepCurrentFlexIfSameSurplus($assigned, $currentPosOf, $playerById, $kickoffsByFranchiseId);
        $optimalPositionOf = $assigned['positions'];
        $optimalSet = array_flip($assigned['starter_ids']);

        $incoming = array_diff_key($optimalSet, $currentStarterIds);
        $outgoing = array_diff_key($currentStarterIds, $optimalSet);

        $changes = [];
        $outgoingRemaining = $outgoing;

        foreach ($incoming as $playerId => $_) {
            $targetPos = $optimalPositionOf[$playerId] ?? null;
            if (!$targetPos) {
                continue;
            }

            $replacedId = $currentByPos[$targetPos] ?? null;
            $replacedName = null;

            if ($replacedId !== null && isset($outgoingRemaining[$replacedId])) {
                $replacedName = $nameOf[$replacedId] ?? null;
                unset($outgoingRemaining[$replacedId]);
            } elseif ($replacedId !== null) {
                foreach ($outgoingRemaining as $outId => $_2) {
                    $replacedId = $outId;
                    $replacedName = $nameOf[$outId] ?? null;
                    unset($outgoingRemaining[$outId]);
                    break;
                }
            }

            $inPlayer = $playerById->get($playerId);
            $outPlayer = $replacedId !== null ? $playerById->get($replacedId) : null;
            $inRanks = $inPlayer ? RankingFields::valuesFor($inPlayer, $league) : [];
            $outRanks = $outPlayer ? RankingFields::valuesFor($outPlayer, $league) : [];

            $changes[] = [
                'kind' => 'swap',
                'from_position' => 'BN',
                'position' => $targetPos,
                'bench_player' => $nameOf[$playerId] ?? null,
                'current_player' => $replacedName,
                'player_name' => $nameOf[$playerId] ?? null,
                'player_week_rank' => $inRanks['week_rank'] ?? null,
                'player_week_position_rank' => $inRanks['week_position_rank'] ?? null,
                'current_week_rank' => $outRanks['week_rank'] ?? null,
                'current_week_position_rank' => $outRanks['week_position_rank'] ?? null,
            ];
        }

        $slotOrder = ['QB' => 0, 'RB1' => 1, 'RB2' => 2, 'WR1' => 3, 'WR2' => 4, 'WR3' => 5, 'TE' => 6, 'FLEX' => 7, 'K' => 8, 'DST' => 9];
        $moves = [];
        foreach ($optimalPositionOf as $playerId => $optPos) {
            if (!isset($currentPosOf[$playerId])) {
                continue;
            }
            $curPos = $currentPosOf[$playerId];
            if ($curPos === $optPos) {
                continue;
            }
            if ($curPos !== 'FLEX' && $optPos !== 'FLEX') {
                continue;
            }
            $mover = $playerById->get($playerId);
            $moverRanks = $mover ? RankingFields::valuesFor($mover, $league) : [];
            $moves[] = [
                'kind' => 'move',
                'from_position' => $curPos,
                'position' => $optPos,
                'bench_player' => $nameOf[$playerId] ?? null,
                'current_player' => $nameOf[$playerId] ?? null,
                'player_name' => $nameOf[$playerId] ?? null,
                'player_week_rank' => $moverRanks['week_rank'] ?? null,
                'player_week_position_rank' => $moverRanks['week_position_rank'] ?? null,
                'current_week_rank' => $moverRanks['week_rank'] ?? null,
                'current_week_position_rank' => $moverRanks['week_position_rank'] ?? null,
            ];
        }
        usort($moves, fn ($a, $b) => ($slotOrder[$a['position']] ?? 99) <=> ($slotOrder[$b['position']] ?? 99));

        return [
            'changes' => array_merge($changes, $moves),
            'optimal_lineup' => self::rosterPayload($players, $assigned, $league),
        ];
    }

    private static function isPlayingThisWeek(object $player, array $kickoffsByFranchiseId, int $currentWeek): bool
    {
        $bye = $player->irlFranchise?->bye_week ?? null;
        if ($currentWeek > 0 && $bye !== null && (int) $bye === $currentWeek) {
            return false;
        }

        $franchiseId = $player->irl_franchise_id ?? null;
        if ($kickoffsByFranchiseId !== [] && $franchiseId !== null && !isset($kickoffsByFranchiseId[$franchiseId])) {
            return false;
        }

        return true;
    }

    /**
     * After a legal rank lineup, put FLEX on the latest kickoff in the surplus
     * RB/WR/TE group only. Same kickoff keeps the rank FLEX. Never moves a WR
     * into an RB slot or the reverse.
     *
     * @param  list<int>  $optRBs
     * @param  list<int>  $optWRs
     * @param  Collection<int, Player>  $players
     * @param  array<int, CarbonImmutable>  $kickoffsByFranchiseId
     * @return array{0: list<int>, 1: list<int>, 2: ?int, 3: ?int}
     */
    private static function placeLatestFlex(
        array $optRBs,
        array $optWRs,
        ?int $optTE,
        ?int $optRWT,
        Collection $players,
        array $kickoffsByFranchiseId
    ): array {
        $skill = [
            'RB' => $optRBs,
            'WR' => $optWRs,
            'TE' => $optTE ? [$optTE] : [],
        ];

        if ($optRWT) {
            $flexPos = self::skillPosition($players->get($optRWT));
            if ($flexPos) {
                $skill[$flexPos][] = $optRWT;
            }
        }

        $required = ['RB' => 2, 'WR' => 3, 'TE' => 1];
        $surplusPos = null;
        foreach ($required as $pos => $need) {
            if (count($skill[$pos]) > $need) {
                $surplusPos = $pos;
                break;
            }
        }

        if ($surplusPos === null) {
            return [$optRBs, $optWRs, $optTE, $optRWT];
        }

        $flexId = self::latestKickoffId($skill[$surplusPos], $players, $kickoffsByFranchiseId);
        if ($flexId === null || $flexId === $optRWT) {
            return [$optRBs, $optWRs, $optTE, $optRWT];
        }

        $newKickoff = self::playerKickoff($players->get($flexId), $kickoffsByFranchiseId);
        $currentKickoff = self::playerKickoff($optRWT !== null ? $players->get($optRWT) : null, $kickoffsByFranchiseId);
        if ($newKickoff === null || ($currentKickoff !== null && !$newKickoff->greaterThan($currentKickoff))) {
            return [$optRBs, $optWRs, $optTE, $optRWT];
        }

        foreach ($optRBs as $i => $id) {
            if ($id === $flexId) {
                $optRBs[$i] = $optRWT;

                return [$optRBs, $optWRs, $optTE, $flexId];
            }
        }
        foreach ($optWRs as $i => $id) {
            if ($id === $flexId) {
                $optWRs[$i] = $optRWT;

                return [$optRBs, $optWRs, $optTE, $flexId];
            }
        }
        if ($optTE === $flexId) {
            return [$optRBs, $optWRs, $optRWT, $flexId];
        }

        return [$optRBs, $optWRs, $optTE, $optRWT];
    }

    private static function skillPosition(?Player $player): ?string
    {
        if (!$player) {
            return null;
        }
        foreach (['RB', 'WR', 'TE'] as $pos) {
            if (in_array($pos, $player->positions ?? [], true)) {
                return $pos;
            }
        }

        return null;
    }

    /**
     * Latest kickoff in the group. Ties keep the first id (rank-lineup order).
     *
     * @param  list<int>  $ids
     * @param  Collection<int, Player>  $players
     * @param  array<int, CarbonImmutable>  $kickoffsByFranchiseId
     */
    private static function latestKickoffId(
        array $ids,
        Collection $players,
        array $kickoffsByFranchiseId
    ): ?int {
        $bestId = null;
        $bestKickoff = null;

        foreach ($ids as $id) {
            $kickoff = self::playerKickoff($players->get($id), $kickoffsByFranchiseId);
            if ($bestId === null
                || ($kickoff !== null && ($bestKickoff === null || $kickoff->greaterThan($bestKickoff)))) {
                $bestId = $id;
                $bestKickoff = $kickoff;
            }
        }

        return $bestId;
    }

    /**
     * Same-time FLEX/WR (or RB) reshuffles only. Never keep a WR at FLEX when
     * the extra starter is an RB — that is what put RBs in WR slots.
     *
     * @param  array{positions: array<int, string>, starter_ids: list<int>}  $assigned
     * @param  array<int, string>  $currentPosOf
     * @param  Collection<int, Player>  $players
     * @param  array<int, CarbonImmutable>  $kickoffsByFranchiseId
     * @return array{positions: array<int, string>, starter_ids: list<int>}
     */
    private static function keepCurrentFlexIfSameSurplus(
        array $assigned,
        array $currentPosOf,
        Collection $players,
        array $kickoffsByFranchiseId
    ): array {
        $currentFlexId = null;
        foreach ($currentPosOf as $playerId => $pos) {
            if ($pos === 'FLEX') {
                $currentFlexId = $playerId;
                break;
            }
        }
        if ($currentFlexId === null || !isset($assigned['positions'][$currentFlexId])) {
            return $assigned;
        }
        if (($assigned['positions'][$currentFlexId] ?? null) === 'FLEX') {
            return $assigned;
        }

        $optFlexId = array_search('FLEX', $assigned['positions'], true);
        if ($optFlexId === false) {
            return $assigned;
        }

        $optFlexPos = self::skillPosition($players->get($optFlexId));
        $currentFlexPos = self::skillPosition($players->get($currentFlexId));
        if ($optFlexPos === null || $optFlexPos !== $currentFlexPos) {
            return $assigned;
        }

        $optKickoff = self::playerKickoff($players->get($optFlexId), $kickoffsByFranchiseId);
        $currentKickoff = self::playerKickoff($players->get($currentFlexId), $kickoffsByFranchiseId);
        if ($optKickoff !== null && ($currentKickoff === null || $optKickoff->greaterThan($currentKickoff))) {
            return $assigned;
        }

        $slotForCurrentFlex = $assigned['positions'][$currentFlexId];
        if (!self::canPlaySlot($players->get($optFlexId), $slotForCurrentFlex)) {
            return $assigned;
        }

        $assigned['positions'][$currentFlexId] = 'FLEX';
        $assigned['positions'][$optFlexId] = $slotForCurrentFlex;
        $assigned['starter_ids'] = array_keys($assigned['positions']);

        return $assigned;
    }

    private static function canPlaySlot(?Player $player, string $slot): bool
    {
        if (!$player) {
            return false;
        }

        $positions = $player->positions ?? [];
        if ($slot === 'FLEX' || $slot === 'RWT') {
            return (bool) array_intersect(['RB', 'WR', 'TE'], $positions);
        }

        $need = preg_replace('/\d+$/', '', $slot);

        return $need !== '' && in_array($need, $positions, true);
    }

    private static function playerKickoff(?Player $player, array $kickoffsByFranchiseId): ?CarbonImmutable
    {
        $franchiseId = $player?->irl_franchise_id;
        if ($franchiseId === null) {
            return null;
        }

        return $kickoffsByFranchiseId[$franchiseId] ?? null;
    }

    /**
     * @param  Collection<int, Player>  $players
     * @param  array{positions: array<int, string>, starter_ids: list<int>}  $assigned
     * @param  Collection<int, Player>|null  $benchEligible  Roster players allowed on the bench (excludes unused FAs).
     * @return array{starters: list<array<string, mixed>>, bench: list<array<string, mixed>>}
     */
    public static function rosterPayload(
        Collection $players,
        array $assigned,
        ?League $league,
        ?Collection $benchEligible = null
    ): array {
        $byId = $players->keyBy('id');
        $idByPos = array_flip($assigned['positions']);
        $starterIds = array_flip($assigned['starter_ids']);

        $mapPlayer = function (?Player $player) use ($league): ?array {
            if (!$player) {
                return null;
            }

            return array_merge([
                'id' => $player->id,
                'name' => $player->name,
                'positions' => $player->positions ?? [],
                'irl_franchise_abbr' => $player->irlFranchise?->abbreviated_name,
                'bye_week' => $player->irlFranchise?->bye_week,
                'do_not_roster' => $player->do_not_roster,
            ], RankingFields::valuesFor($player, $league));
        };

        $starters = [];
        foreach (['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'FLEX', 'K', 'DST'] as $pos) {
            $id = $idByPos[$pos] ?? null;
            $starters[] = [
                'lineup_position' => $pos === 'FLEX' ? 'RWT' : $pos,
                'player' => $mapPlayer($id !== null ? $byId->get($id) : null),
            ];
        }

        $benchSource = $benchEligible ?? $players;
        $weekRankCol = RankingFields::column('week_rank', $league);
        $bench = $benchSource
            ->filter(fn (Player $player) => !isset($starterIds[$player->id]))
            ->sortBy(fn (Player $player) => $player->{$weekRankCol} ?? 999)
            ->values()
            ->map(fn (Player $player) => [
                'lineup_position' => 'BN',
                'player' => $mapPlayer($player),
            ])
            ->all();

        return [
            'starters' => $starters,
            'bench' => $bench,
        ];
    }
}
