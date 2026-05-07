<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LeagueStoreRequest;
use App\Http\Requests\Api\V1\LeagueUpdateRequest;
use App\Http\Resources\LeagueResource;
use App\Models\IrlFranchise;
use App\Models\League;
use App\Models\LineupSlot;
use App\Models\Player;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class LeagueController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return LeagueResource::collection(
            League::query()->with('teams')->orderBy('id')->paginate(50)
        );
    }

    public function store(LeagueStoreRequest $request): LeagueResource
    {
        $league = League::query()->create($request->validated());

        return new LeagueResource($league->load('teams'));
    }

    public function show(League $league): LeagueResource
    {
        return new LeagueResource($league->load('teams'));
    }

    public function update(LeagueUpdateRequest $request, League $league): LeagueResource
    {
        $league->update($request->validated());

        return new LeagueResource($league->fresh()->load('teams'));
    }

    public function destroy(League $league): Response
    {
        $league->delete();

        return response()->noContent();
    }

    /**
     * Set requires_waiver_claim = true on all leagues.
     */
    public function flagWaiverClaims(): JsonResponse
    {
        $count = League::query()->update(['requires_waiver_claim' => true]);

        return response()->json(['leagues_flagged' => $count]);
    }

    /**
     * Set requires_roster_moves = true on all leagues.
     */
    public function flagRosterMoves(): JsonResponse
    {
        $count = League::query()->update(['requires_roster_moves' => true]);

        return response()->json(['leagues_flagged' => $count]);
    }

    /**
     * Set requires_roster_optimised = true on all leagues.
     */
    public function flagRosterOptimisation(): JsonResponse
    {
        $count = League::query()->update(['requires_roster_optimised' => true]);

        return response()->json(['leagues_flagged' => $count]);
    }

    /**
     * Set requires_thursday_update = true on all leagues.
     */
    public function flagThursdayUpdate(): JsonResponse
    {
        $count = League::query()->update(['requires_thursday_update' => true]);

        return response()->json(['leagues_flagged' => $count]);
    }

    /**
     * Return available (unrostered) players and the requesting team's players
     * for waiver claim comparison.
     */
    public function waiverBoard(League $league, Request $request): JsonResponse
    {
        $teamId = $request->integer('team_id');

        $league->load('teams');
        $leagueTeamIds = $league->teams->pluck('id')->toArray();

        // All player IDs rostered in this league
        $rosteredIds = LineupSlot::whereIn('team_id', $leagueTeamIds)
            ->whereNotNull('player_id')
            ->pluck('player_id')
            ->unique()
            ->toArray();

        // My team's slots
        $mySlots = LineupSlot::where('team_id', $teamId)
            ->with('player.irlFranchise')
            ->get();

        $myPlayerIds = $mySlots->pluck('player_id')->filter()->unique()->toArray();

        $myPlayers = $mySlots
            ->filter(fn ($s) => $s->player !== null)
            ->map(fn ($s) => [
                'id'                    => $s->player->id,
                'name'                  => $s->player->name,
                'positions'             => $s->player->positions ?? [],
                'season_rank'           => $s->player->season_rank,
                'season_position_rank'  => $s->player->season_position_rank,
                'week_rank'             => $s->player->week_rank,
                'week_position_rank'    => $s->player->week_position_rank,
                'waiver_rank'           => $s->player->waiver_rank,
                'waiver_rank_overall'   => $s->player->waiver_rank_overall,
                'irl_franchise_abbr'    => $s->player->irlFranchise?->abbreviated_name,
                'bye_week'              => $s->player->irlFranchise?->bye_week,
                'lineup_position'       => $s->lineup_position->value,
            ])
            ->unique('id')
            ->values();

        // Available players: not rostered in this league, have any ranking
        $available = Player::with('irlFranchise')
            ->whereNotIn('id', $rosteredIds)
            ->where(function ($q) {
                $q->whereNotNull('season_rank')
                  ->orWhereNotNull('season_position_rank')
                  ->orWhereNotNull('week_rank')
                  ->orWhereNotNull('week_position_rank')
                  ->orWhereNotNull('waiver_rank')
                  ->orWhereNotNull('waiver_rank_overall');
            })
            ->get()
            ->map(fn ($p) => [
                'id'                    => $p->id,
                'name'                  => $p->name,
                'positions'             => $p->positions ?? [],
                'season_rank'           => $p->season_rank,
                'season_position_rank'  => $p->season_position_rank,
                'week_rank'             => $p->week_rank,
                'week_position_rank'    => $p->week_position_rank,
                'waiver_rank'           => $p->waiver_rank,
                'waiver_rank_overall'   => $p->waiver_rank_overall,
                'irl_franchise_abbr'    => $p->irlFranchise?->abbreviated_name,
                'bye_week'              => $p->irlFranchise?->bye_week,
            ]);

        return response()->json([
            'my_players' => $myPlayers,
            'available'  => $available,
        ]);
    }

    /**
     * Parse pasted roster text and fill lineup slots for every team in the league.
     * Fully replaces existing lineup data.
     */
    public function updateRosters(Request $request, League $league): JsonResponse
    {
        $request->validate(['data' => ['required', 'string', 'min:10']]);

        $lines = array_values(array_filter(
            array_map('trim', explode("\n", $request->input('data'))),
            fn ($l) => $l !== ''
        ));

        $positionKeywords = ['QB', 'RB', 'WR', 'TE', 'RWT', 'K', 'DST'];

        // Detect team block boundaries: a non-keyword line followed by "QB"
        $teamStarts = [];
        for ($i = 0, $len = count($lines); $i < $len - 1; $i++) {
            if (!in_array(strtoupper($lines[$i]), $positionKeywords, true)
                && strtoupper($lines[$i + 1]) === 'QB') {
                $teamStarts[] = $i;
            }
        }

        if (empty($teamStarts)) {
            return response()->json(['message' => 'Could not detect any team blocks. Expected format: TeamName, then QB, players, RB, players, etc.'], 422);
        }

        // Parse each team block into { name, sections: { QB: [...], RB: [...], ... } }
        $teamBlocks = [];
        for ($t = 0; $t < count($teamStarts); $t++) {
            $start = $teamStarts[$t];
            $end = $t + 1 < count($teamStarts) ? $teamStarts[$t + 1] : count($lines);

            $teamName = $lines[$start];
            $sections = [];
            $currentPos = null;

            for ($j = $start + 1; $j < $end; $j++) {
                $upper = strtoupper($lines[$j]);
                if (in_array($upper, $positionKeywords, true)) {
                    $currentPos = $upper;
                    if (!isset($sections[$currentPos])) {
                        $sections[$currentPos] = [];
                    }
                } elseif ($currentPos !== null) {
                    $sections[$currentPos][] = $lines[$j];
                }
            }

            $teamBlocks[] = ['name' => $teamName, 'sections' => $sections];
        }

        // Map league teams by name (case-insensitive)
        $league->load('teams');
        $teamLookup = [];
        foreach ($league->teams as $team) {
            $teamLookup[strtolower($team->name)] = $team;
        }

        // Build player lookup: lowercase name → Player model
        $allPlayers = Player::with('irlFranchise')->get();
        $playerByName = [];
        foreach ($allPlayers as $p) {
            $playerByName[strtolower($p->name)] = $p;
        }

        // Build DST franchise name lookup → player id
        $dstPlayers = $allPlayers->filter(fn ($p) => in_array('DST', $p->positions ?? [], true));
        $franchises = IrlFranchise::all();
        $dstLookup = [];
        foreach ($dstPlayers as $dp) {
            if ($dp->irl_franchise_id) {
                $f = $franchises->firstWhere('id', $dp->irl_franchise_id);
                if ($f) {
                    foreach (['name', 'abbreviated_name', 'alternate_name', 'alternate_abbreviated_name'] as $field) {
                        if ($f->$field) {
                            $dstLookup[strtolower($f->$field)] = $dp->id;
                        }
                    }
                }
            }
        }

        // Slot mapping: position section → ordered starter slots, then BN for the rest
        $slotMap = [
            'QB'  => ['QB'],
            'RB'  => ['RB1', 'RB2'],
            'WR'  => ['WR1', 'WR2', 'WR3'],
            'TE'  => ['TE'],
            'RWT' => ['RWT'],
            'K'   => ['K'],
            'DST' => ['DST'],
        ];

        $results = ['teams_matched' => 0, 'teams_not_found' => [], 'slots_created' => 0, 'players_not_found' => []];
        $newSlots = [];
        $teamIds = $league->teams->pluck('id')->toArray();

        foreach ($teamBlocks as $block) {
            $team = $teamLookup[strtolower($block['name'])] ?? null;
            if (!$team) {
                $results['teams_not_found'][] = $block['name'];
                continue;
            }
            $results['teams_matched']++;

            foreach ($block['sections'] as $posKey => $playerNames) {
                $starters = $slotMap[$posKey] ?? [];

                foreach ($playerNames as $idx => $rawName) {
                    // Resolve player id
                    $playerId = null;
                    if ($posKey === 'DST') {
                        $playerId = $dstLookup[strtolower($rawName)] ?? null;
                        if ($playerId === null) {
                            $playerId = ($playerByName[strtolower($rawName)] ?? null)?->id;
                        }
                    } else {
                        $playerId = ($playerByName[strtolower($rawName)] ?? null)?->id;
                    }

                    if ($playerId === null) {
                        $results['players_not_found'][] = ['team' => $block['name'], 'section' => $posKey, 'name' => $rawName];
                    }

                    $slotPosition = $idx < count($starters) ? $starters[$idx] : 'BN';

                    $newSlots[] = [
                        'team_id' => $team->id,
                        'player_id' => $playerId,
                        'lineup_position' => $slotPosition,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                    $results['slots_created']++;
                }
            }
        }

        DB::transaction(function () use ($teamIds, $newSlots, $league) {
            LineupSlot::whereIn('team_id', $teamIds)->delete();

            foreach (array_chunk($newSlots, 500) as $chunk) {
                LineupSlot::insert($chunk);
            }

            $league->update(['teams_updated_at' => now()]);
        });

        return response()->json($results);
    }
}
