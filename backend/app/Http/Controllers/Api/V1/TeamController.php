<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\TeamStoreRequest;
use App\Http\Requests\Api\V1\TeamUpdateRequest;
use App\Http\Resources\TeamResource;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
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
     */
    public function roster(Team $team): JsonResponse
    {
        $team->load(['lineupSlots.player.irlFranchise']);

        $positionOrder = ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'WR3', 'TE', 'RWT', 'K', 'DST', 'BN'];

        $slots = $team->lineupSlots
            ->sortBy(fn ($s) => array_search($s->lineup_position->value, $positionOrder, true))
            ->values()
            ->map(fn ($s) => [
                'lineup_position' => $s->lineup_position->value,
                'player' => $s->player ? [
                    'id'                 => $s->player->id,
                    'name'               => $s->player->name,
                    'positions'          => $s->player->positions ?? [],
                    'week_rank'          => $s->player->week_rank,
                    'week_position_rank' => $s->player->week_position_rank,
                    'irl_franchise_abbr' => $s->player->irlFranchise?->abbreviated_name,
                ] : null,
            ]);

        return response()->json(['data' => $slots]);
    }

    /**
     * Return all teams with a `requires_lineup_change` flag for each,
     * based on whether the current starting lineup is optimal for this week.
     */
    public function lineupAnalysis(): JsonResponse
    {
        $teams = Team::query()
            ->with(['league', 'lineupSlots.player'])
            ->orderBy('league_id')
            ->orderBy('name')
            ->get();

        $data = $teams->map(function (Team $team) {
            $changes = $this->computeSuggestedChanges($team);
            return [
                'id'                     => $team->id,
                'name'                   => $team->name,
                'league_id'              => $team->league_id,
                'league_name'            => $team->league?->name,
                'my_team'                => $team->my_team,
                'requires_lineup_change' => count($changes) > 0,
                'suggested_changes'      => $changes,
            ];
        });

        return response()->json(['data' => $data]);
    }

    /**
     * Compute the suggested lineup changes for a team.
     *
     * Only reports changes where a bench player should replace a current starter.
     * Internal reshuffles between starters (e.g. swapping WR3 ↔ FLEX) are ignored.
     */
    private function computeSuggestedChanges(Team $team): array
    {
        $slots = $team->lineupSlots;
        if ($slots->isEmpty()) {
            return [];
        }

        $players = $slots
            ->filter(fn ($s) => $s->player !== null)
            ->map(fn ($s) => $s->player)
            ->unique('id');

        if ($players->isEmpty()) {
            return [];
        }

        $nameOf = $players->pluck('name', 'id')->toArray();

        // Pool of players eligible for a given position, sorted best→worst by week_rank.
        $pool = fn (string $pos) => $players
            ->filter(fn ($p) => in_array($pos, $p->positions ?? [], true))
            ->sortBy('week_rank')
            ->values();

        // Greedily pick the best unused player(s) for each slot type.
        $used = [];

        $pickOne = function ($candidates) use (&$used): ?int {
            foreach ($candidates as $p) {
                if (!isset($used[$p->id])) {
                    $used[$p->id] = true;
                    return $p->id;
                }
            }
            return null;
        };

        $pickMany = function ($candidates, int $n) use (&$used): array {
            $picked = [];
            foreach ($candidates as $p) {
                if (!isset($used[$p->id])) {
                    $used[$p->id] = true;
                    $picked[] = $p->id;
                    if (count($picked) === $n) break;
                }
            }
            return $picked;
        };

        $optQB  = $pickOne($pool('QB'));
        $optRBs = $pickMany($pool('RB'), 2);
        $optWRs = $pickMany($pool('WR'), 3);
        $optTE  = $pickOne($pool('TE'));

        $flexPool = $players
            ->filter(fn ($p) => !isset($used[$p->id])
                && array_intersect(['RB', 'WR', 'TE'], $p->positions ?? []))
            ->sortBy('week_rank')
            ->values();
        $optRWT = $pickOne($flexPool);

        $optK   = $pickOne($pool('K'));
        $optDST = $pickOne($pool('DST'));

        // Collect all optimal starter IDs.
        $optimalIds = array_filter(array_merge(
            [$optQB], $optRBs, $optWRs, [$optTE, $optRWT, $optK, $optDST]
        ), fn ($id) => $id !== null);
        $optimalSet = array_flip($optimalIds);

        // Collect all current starter IDs.
        $currentStarterIds = [];
        foreach ($slots as $slot) {
            if ($slot->player_id !== null && $slot->lineup_position->value !== 'BN') {
                $currentStarterIds[$slot->player_id] = true;
            }
        }

        // Players coming IN from bench (in optimal but not currently starting).
        $incoming = array_diff_key($optimalSet, $currentStarterIds);
        // Players going OUT to bench (currently starting but not in optimal).
        $outgoing = array_diff_key($currentStarterIds, $optimalSet);

        if (empty($incoming)) {
            return [];
        }

        // Build optimal position map: player_id → position label.
        $optimalPositionOf = [];
        if ($optQB)  $optimalPositionOf[$optQB]  = 'QB';
        foreach ($optRBs as $i => $id) $optimalPositionOf[$id] = 'RB' . ($i + 1);
        foreach ($optWRs as $i => $id) $optimalPositionOf[$id] = 'WR' . ($i + 1);
        if ($optTE)  $optimalPositionOf[$optTE]  = 'TE';
        if ($optRWT) $optimalPositionOf[$optRWT] = 'FLEX';
        if ($optK)   $optimalPositionOf[$optK]   = 'K';
        if ($optDST) $optimalPositionOf[$optDST] = 'DST';

        // Build current position map: position label → player_id.
        $currentByPos = [];
        foreach ($slots as $slot) {
            $pos = $slot->lineup_position->value;
            if ($slot->player_id !== null && $pos !== 'BN') {
                $label = $pos === 'RWT' ? 'FLEX' : $pos;
                $currentByPos[$label] = $slot->player_id;
            }
        }

        // For each incoming bench player, find who they replace.
        // Match by the position the bench player should fill in the optimal lineup.
        $changes = [];
        $outgoingRemaining = $outgoing;

        foreach ($incoming as $playerId => $_) {
            $targetPos = $optimalPositionOf[$playerId] ?? null;
            if (!$targetPos) continue;

            // Find the current holder of this position who is being benched.
            $replacedId = $currentByPos[$targetPos] ?? null;
            $replacedName = null;

            if ($replacedId !== null && isset($outgoingRemaining[$replacedId])) {
                $replacedName = $nameOf[$replacedId] ?? null;
                unset($outgoingRemaining[$replacedId]);
            } elseif ($replacedId !== null) {
                // Current holder is staying (reshuffled elsewhere) — find any outgoing
                // player at a compatible position instead.
                foreach ($outgoingRemaining as $outId => $_2) {
                    $replacedName = $nameOf[$outId] ?? null;
                    unset($outgoingRemaining[$outId]);
                    break;
                }
            }

            $changes[] = [
                'position'         => $targetPos,
                'bench_player'     => $nameOf[$playerId] ?? null,
                'current_player'   => $replacedName,
            ];
        }

        return $changes;
    }
}
