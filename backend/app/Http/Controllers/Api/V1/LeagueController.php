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
