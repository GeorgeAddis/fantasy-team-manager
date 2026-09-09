<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\TeamStoreRequest;
use App\Http\Requests\Api\V1\TeamUpdateRequest;
use App\Http\Resources\TeamResource;
use App\Models\LeaguePlayerStatus;
use App\Models\LineupSlot;
use App\Models\Player;
use App\Models\Team;
use App\Support\FantraxLeagueStatusSync;
use App\Support\OptimalLineup;
use App\Support\RankingFields;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class TeamController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return TeamResource::collection(Team::query()->with('league')->orderBy('id')->paginate(50));
    }

    public function store(TeamStoreRequest $request): TeamResource
    {
        $team = Team::query()->create($request->validated());

        return new TeamResource($team);
    }

    public function show(Team $team): TeamResource
    {
        return new TeamResource($team->load('league'));
    }

    public function update(TeamUpdateRequest $request, Team $team): TeamResource
    {
        $team->update($request->validated());

        return new TeamResource($team->fresh()->load('league'));
    }

    public function destroy(Team $team): Response
    {
        $team->delete();

        return response()->noContent();
    }

    /**
     * Return the roster for a single team, grouped by position.
     * Always includes every starter slot (player may be null when empty).
     */
    public function roster(Team $team): JsonResponse
    {
        $team->load(['league', 'lineupSlots.player.irlFranchise']);

        $starterOrder = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'RWT', 'K', 'DST'];
        $byPos = $team->lineupSlots->groupBy(fn ($s) => $s->lineup_position->value);

        $mapSlot = function ($slot) use ($team) {
            return [
                'lineup_position' => $slot->lineup_position->value,
                'player' => $slot->player ? array_merge([
                    'id'                    => $slot->player->id,
                    'name'                  => $slot->player->name,
                    'positions'             => $slot->player->positions ?? [],
                    'irl_franchise_abbr'    => $slot->player->irlFranchise?->abbreviated_name,
                    'bye_week'              => $slot->player->irlFranchise?->bye_week,
                    'do_not_roster'         => $slot->player->do_not_roster,
                ], RankingFields::valuesFor($slot->player, $team->league)) : null,
            ];
        };

        $slots = [];
        foreach ($starterOrder as $pos) {
            $existing = ($byPos[$pos] ?? collect())->first();
            if ($existing) {
                $slots[] = $mapSlot($existing);
            } else {
                $slots[] = [
                    'lineup_position' => $pos,
                    'player' => null,
                ];
            }
        }

        $bench = ($byPos['BN'] ?? collect())
            ->map(fn ($slot) => $mapSlot($slot))
            ->sort(function (array $a, array $b) {
                $posOrder = ['QB' => 0, 'RB' => 1, 'WR' => 2, 'TE' => 3, 'K' => 4, 'DST' => 5];
                $posA = $this->benchSortPosition($a['player']['positions'] ?? []);
                $posB = $this->benchSortPosition($b['player']['positions'] ?? []);
                $posCmp = ($posOrder[$posA] ?? 99) <=> ($posOrder[$posB] ?? 99);
                if ($posCmp !== 0) {
                    return $posCmp;
                }

                $rankA = $this->benchWeekRank($a['player'] ?? [], $posA);
                $rankB = $this->benchWeekRank($b['player'] ?? [], $posB);
                $rankCmp = $rankA <=> $rankB;
                if ($rankCmp !== 0) {
                    return $rankCmp;
                }

                return strcasecmp((string) ($a['player']['name'] ?? ''), (string) ($b['player']['name'] ?? ''));
            })
            ->values();

        foreach ($bench as $slot) {
            $slots[] = $slot;
        }

        return response()->json(['data' => $slots]);
    }

    /**
     * First matching fantasy position for bench sort order.
     */
    private function benchSortPosition(array $positions): string
    {
        foreach (['QB', 'RB', 'WR', 'TE', 'K', 'DST'] as $pos) {
            if (in_array($pos, $positions, true)) {
                return $pos;
            }
        }

        return (string) ($positions[0] ?? '');
    }

    /**
     * Week rank for bench sort: 1 is best. QB/K/DST use position rank.
     */
    private function benchWeekRank(array $player, string $pos): int
    {
        $usePosRank = in_array($pos, ['QB', 'K', 'DST'], true);
        $raw = $usePosRank
            ? ($player['week_position_rank'] ?? null)
            : ($player['week_rank'] ?? $player['week_position_rank'] ?? null);

        $rank = is_numeric($raw) ? (int) $raw : 999;

        return ($rank > 0 && $rank < 999) ? $rank : 999;
    }

    /**
     * Return all teams with a `requires_lineup_change` flag for each,
     * based on whether the current starting lineup is optimal for this week.
     */
    public function lineupAnalysis(): JsonResponse
    {
        $teams = Team::query()
            ->with(['league', 'lineupSlots.player.irlFranchise'])
            ->whereHas('league', fn ($q) => $q->where('bestball', false))
            ->orderBy('league_id')
            ->orderBy('name')
            ->get();

        $kickoffs = OptimalLineup::kickoffsForCurrentWeek();

        $data = $teams->map(function (Team $team) use ($kickoffs) {
            $advice = OptimalLineup::lineupAdvice($team, $kickoffs);
            return [
                'id'                     => $team->id,
                'name'                   => $team->name,
                'league_id'              => $team->league_id,
                'league_name'            => $team->league?->name,
                'my_team'                => $team->my_team,
                'requires_lineup_change' => count($advice['changes']) > 0,
                'suggested_changes'      => $advice['changes'],
                'optimal_lineup'         => $advice['optimal_lineup'],
            ];
        });

        return response()->json(['data' => $data]);
    }

    /**
     * For each "my team", compute optimal lineup including league free agents.
     * Flag teams where a free agent would start.
     */
    public function rosterAddAnalysis(Request $request): JsonResponse
    {
        $actualFaOnly = strtoupper((string) $request->query('availability', '')) === 'FA';

        $myTeams = Team::query()
            ->where('my_team', true)
            ->whereHas('league', fn ($q) => $q->where('bestball', false))
            ->with(['league.teams', 'lineupSlots.player.irlFranchise'])
            ->orderBy('league_id')
            ->orderBy('name')
            ->get();

        if ($actualFaOnly) {
            $leaguesWithStatus = LeaguePlayerStatus::query()
                ->whereIn('league_id', $myTeams->pluck('league_id')->filter()->unique())
                ->distinct()
                ->pluck('league_id')
                ->flip();
            foreach ($myTeams->pluck('league')->unique('id') as $league) {
                if ($league?->fantrax_id && !isset($leaguesWithStatus[$league->id])) {
                    FantraxLeagueStatusSync::sync($league);
                }
            }
        }

        $kickoffs = OptimalLineup::kickoffsForCurrentWeek();
        $freeAgentsByLeague = [];

        $data = $myTeams->map(function (Team $team) use ($actualFaOnly, $kickoffs, &$freeAgentsByLeague) {
            $league = $team->league;
            if (!$league) {
                return null;
            }

            if (!isset($freeAgentsByLeague[$league->id])) {
                $leagueTeamIds = $league->teams->pluck('id')->toArray();
                $rosteredIds = LineupSlot::whereIn('team_id', $leagueTeamIds)
                    ->whereNotNull('player_id')
                    ->pluck('player_id')
                    ->unique()
                    ->toArray();

                $cols = RankingFields::columns($league);
                $freeAgentQuery = Player::with('irlFranchise')
                    ->whereNotIn('id', $rosteredIds);
                $this->constrainToRankedWeek($freeAgentQuery, $cols);

                if ($actualFaOnly) {
                    $freeAgentQuery->whereIn('id', LeaguePlayerStatus::query()
                        ->where('league_id', $league->id)
                        ->where('status', 'FA')
                        ->select('player_id'));
                }

                $freeAgentsByLeague[$league->id] = $freeAgentQuery->get();
            }

            $freeAgents = $freeAgentsByLeague[$league->id];

            // My roster players
            $myPlayers = $team->lineupSlots
                ->filter(fn ($s) => $s->player !== null)
                ->map(fn ($s) => $s->player)
                ->unique('id');

            // Combine roster + free agents
            $allPlayers = $myPlayers->concat($freeAgents)->unique('id');
            $freeAgentIds = $freeAgents->pluck('id')->flip()->toArray();

            // Same OptimalLineup::assign as lineupAdvice, with FA pool included.
            $advice = $this->computeRosterAddSuggestions(
                $team, $allPlayers, $freeAgentIds, $league, $kickoffs
            );
            $suggestedAdds = $advice['suggested_adds'];
            if ($actualFaOnly) {
                $suggestedAdds = array_values(array_filter(
                    $suggestedAdds,
                    fn ($add) => ($add['source'] ?? '') === 'FA'
                ));
            }

            return [
                'id'                    => $team->id,
                'name'                  => $team->name,
                'league_id'             => $league->id,
                'league_name'           => $league->name,
                'my_team'               => true,
                'requires_roster_moves'   => count($suggestedAdds) > 0,
                'suggested_adds'        => $suggestedAdds,
                'optimal_lineup'        => $advice['optimal_lineup'],
            ];
        })->filter()->values();

        return response()->json(['data' => $data]);
    }

    /**
     * For each "my team", return season-rank data for the roster and league free agents.
     * The frontend applies position filtering and computes which teams have FAs
     * outranking rostered players.
     */
    public function preSeasonOptimiseAnalysis(): JsonResponse
    {
        $myTeams = Team::query()
            ->where('my_team', true)
            ->whereHas('league', fn ($q) => $q->where('bestball', false))
            ->with(['league.teams', 'lineupSlots.player.irlFranchise'])
            ->orderBy('league_id')
            ->orderBy('name')
            ->get();

        $data = $myTeams->map(function (Team $team) {
            $league = $team->league;
            if (!$league) {
                return null;
            }

            $leagueTeamIds = $league->teams->pluck('id')->toArray();

            $rosteredIds = LineupSlot::whereIn('team_id', $leagueTeamIds)
                ->whereNotNull('player_id')
                ->pluck('player_id')
                ->unique()
                ->toArray();

            $cols = RankingFields::columns($league);
            $statuses = LeaguePlayerStatus::query()
                ->where('league_id', $league->id)
                ->pluck('status', 'player_id');

            $freeAgents = Player::with('irlFranchise')
                ->whereNotIn('id', $rosteredIds)
                ->where(function ($q) use ($cols) {
                    $this->constrainToRankedSeason($q, $cols);
                })
                ->get()
                ->map(function ($p) use ($league, $statuses) {
                    $status = $statuses[$p->id] ?? 'FA';

                    return array_merge([
                        'id'                    => $p->id,
                        'name'                  => $p->name,
                        'positions'             => $p->positions ?? [],
                        'irl_franchise_abbr'    => $p->irlFranchise?->abbreviated_name,
                        'bye_week'              => $p->irlFranchise?->bye_week,
                        'status'                => $status === 'WW' ? 'WW' : 'FA',
                    ], RankingFields::valuesFor($p, $league));
                })
                ->values();

            $myPlayers = $team->lineupSlots
                ->filter(fn ($s) => $s->player !== null)
                ->map(fn ($s) => array_merge([
                    'id'                    => $s->player->id,
                    'name'                  => $s->player->name,
                    'positions'             => $s->player->positions ?? [],
                    'irl_franchise_abbr'    => $s->player->irlFranchise?->abbreviated_name,
                    'bye_week'              => $s->player->irlFranchise?->bye_week,
                    'lineup_position'       => $s->lineup_position->value,
                ], RankingFields::valuesFor($s->player, $league)))
                ->unique('id')
                ->values();

            return [
                'id'           => $team->id,
                'name'         => $team->name,
                'league_id'    => $league->id,
                'league_name'  => $league->name,
                'my_team'      => true,
                'my_players'   => $myPlayers,
                'free_agents'  => $freeAgents,
            ];
        })->filter()->values();

        return response()->json(['data' => $data]);
    }

    /**
     * Same OptimalLineup::assign as lineupAdvice,
     * but the player pool includes league free agents alongside roster players.
     * Reports which players are incoming (FA or BN) and who they replace.
     */
    private function computeRosterAddSuggestions(Team $team, $allPlayers, array $freeAgentIds, $league = null, array $kickoffs = []): array
    {
        $slots = $team->lineupSlots;
        if ($slots->isEmpty() || $allPlayers->isEmpty()) {
            return ['suggested_adds' => [], 'optimal_lineup' => ['starters' => [], 'bench' => []]];
        }

        $league = $league ?? $team->league;
        $cols = RankingFields::columns($league);
        $weekPosCol = $cols['week_position_rank'];

        $playerLookup = $allPlayers->keyBy('id');
        $assigned = OptimalLineup::assign($allPlayers, $league, $kickoffs);
        $optimalPositionOf = $assigned['positions'];
        $optimalSet = array_flip($assigned['starter_ids']);

        // Collect all current starter IDs.
        $currentStarterIds = [];
        foreach ($slots as $slot) {
            if ($slot->player_id !== null && $slot->lineup_position->value !== 'BN') {
                $currentStarterIds[$slot->player_id] = true;
            }
        }

        // Players coming IN (in optimal but not currently starting).
        $incoming = array_diff_key($optimalSet, $currentStarterIds);
        // Players going OUT (currently starting but not in optimal).
        $outgoing = array_diff_key($currentStarterIds, $optimalSet);

        $rostered = $team->lineupSlots
            ->filter(fn ($s) => $s->player !== null)
            ->map(fn ($s) => $s->player)
            ->unique('id');
        $optimalLineup = OptimalLineup::rosterPayload($allPlayers, $assigned, $league, $rostered);

        if (empty($incoming)) {
            return [
                'suggested_adds' => [],
                'optimal_lineup' => $optimalLineup,
            ];
        }

        // Build current position map: position label → player_id.
        $currentByPos = [];
        foreach ($slots as $slot) {
            $pos = $slot->lineup_position->value;
            if ($slot->player_id !== null && $pos !== 'BN') {
                $label = $pos === 'RWT' ? 'FLEX' : $pos;
                $currentByPos[$label] = $slot->player_id;
            }
        }

        // For each incoming player, find who they replace.
        $suggestions = [];
        $outgoingRemaining = $outgoing;

        foreach ($incoming as $playerId => $_) {
            $targetPos = $optimalPositionOf[$playerId] ?? null;
            if (!$targetPos) continue;

            // Determine source: FA or BN
            $source = isset($freeAgentIds[$playerId]) ? 'FA' : 'BN';

            // Find the current holder of this position who is being replaced.
            $replacedId = $currentByPos[$targetPos] ?? null;
            $replacedName = null;
            $replacedRank = null;
            $replacedWeekRank = null;

            if ($replacedId !== null && isset($outgoingRemaining[$replacedId])) {
                $replacedPlayer = $playerLookup[$replacedId] ?? null;
                $replacedName = $replacedPlayer?->name;
                $replacedRanks = $replacedPlayer ? RankingFields::valuesFor($replacedPlayer, $league) : [];
                $replacedRank = $replacedRanks['week_position_rank'] ?? $replacedPlayer?->{$weekPosCol};
                $replacedWeekRank = $replacedRanks['week_rank'] ?? null;
                unset($outgoingRemaining[$replacedId]);
            } elseif ($replacedId !== null) {
                // Current holder is staying (reshuffled elsewhere) — find any outgoing player.
                foreach ($outgoingRemaining as $outId => $_2) {
                    $outPlayer = $playerLookup[$outId] ?? null;
                    $replacedName = $outPlayer?->name;
                    $outRanks = $outPlayer ? RankingFields::valuesFor($outPlayer, $league) : [];
                    $replacedRank = $outRanks['week_position_rank'] ?? $outPlayer?->{$weekPosCol};
                    $replacedWeekRank = $outRanks['week_rank'] ?? null;
                    unset($outgoingRemaining[$outId]);
                    break;
                }
            }

            $inPlayer = $playerLookup[$playerId] ?? null;
            $inRanks = $inPlayer ? RankingFields::valuesFor($inPlayer, $league) : [];

            $suggestions[] = [
                'position'                    => $targetPos,
                'player_name'                 => $inPlayer?->name,
                'player_week_rank'            => $inRanks['week_rank'] ?? null,
                'player_week_position_rank'   => $inRanks['week_position_rank'] ?? $inPlayer?->{$weekPosCol},
                'current_player'              => $replacedName,
                'current_week_rank'           => $replacedWeekRank,
                'current_week_position_rank'  => $replacedRank,
                'source'                      => $source,
            ];
        }

        return [
            'suggested_adds' => $suggestions,
            'optimal_lineup' => $optimalLineup,
        ];
    }

    /**
     * Available top-150 season-ranked players on each of my non-bestball teams.
     * FA and WW both count as available; status is included when known.
     */
    public function freeAgentAlerts(): JsonResponse
    {
        $myTeams = Team::query()
            ->where('my_team', true)
            ->whereHas('league', fn ($q) => $q->where('bestball', false))
            ->with(['league.teams'])
            ->get()
            ->sortByDesc(fn (Team $team) => $team->league_id)
            ->values();

        $data = $myTeams->map(function (Team $team) {
            $league = $team->league;
            if (!$league) {
                return null;
            }

            $leagueTeamIds = $league->teams->pluck('id')->toArray();
            $rosteredIds = LineupSlot::whereIn('team_id', $leagueTeamIds)
                ->whereNotNull('player_id')
                ->pluck('player_id')
                ->unique()
                ->toArray();

            $cols = RankingFields::columns($league);
            $seasonCol = $cols['season_rank'];
            $statuses = LeaguePlayerStatus::query()
                ->where('league_id', $league->id)
                ->pluck('status', 'player_id');

            $players = Player::with('irlFranchise')
                ->whereNotIn('id', $rosteredIds)
                ->where($seasonCol, '>=', 1)
                ->where($seasonCol, '<=', 150)
                ->orderBy($seasonCol)
                ->orderBy('name')
                ->get()
                ->map(function (Player $p) use ($league, $statuses) {
                    $status = $statuses[$p->id] ?? 'FA';

                    return array_merge([
                        'id' => $p->id,
                        'name' => $p->name,
                        'positions' => $p->positions ?? [],
                        'irl_franchise_abbr' => $p->irlFranchise?->abbreviated_name,
                        'bye_week' => $p->irlFranchise?->bye_week,
                        'status' => $status === 'WW' ? 'WW' : 'FA',
                    ], RankingFields::valuesFor($p, $league));
                })
                ->values();

            if ($players->isEmpty()) {
                return null;
            }

            return [
                'team_id' => $team->id,
                'team_name' => $team->name,
                'league_id' => $league->id,
                'league_name' => $league->name,
                'players' => $players,
            ];
        })->filter()->values();

        return response()->json(['data' => $data]);
    }

    /**
     * Keep players with a real season or season-position rank (exclude 999 / empty).
     */
    private function constrainToRankedSeason($query, array $cols): void
    {
        $query->where(function ($q) use ($cols) {
            $q->where(function ($inner) use ($cols) {
                $inner->where($cols['season_rank'], '>', 0)
                    ->where($cols['season_rank'], '<', 999);
            })->orWhere(function ($inner) use ($cols) {
                $inner->where($cols['season_position_rank'], '>', 0)
                    ->where($cols['season_position_rank'], '<', 999);
            });
        });
    }

    /**
     * Keep players with a real week or week-position rank (exclude 999 / empty).
     */
    private function constrainToRankedWeek($query, array $cols): void
    {
        $query->where(function ($q) use ($cols) {
            $q->where(function ($inner) use ($cols) {
                $inner->where($cols['week_rank'], '>', 0)
                    ->where($cols['week_rank'], '<', 999);
            })->orWhere(function ($inner) use ($cols) {
                $inner->where($cols['week_position_rank'], '>', 0)
                    ->where($cols['week_position_rank'], '<', 999);
            });
        });
    }
}
