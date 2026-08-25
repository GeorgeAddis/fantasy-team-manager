<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LeagueImportFantraxRequest;
use App\Http\Requests\Api\V1\LeagueStoreRequest;
use App\Http\Requests\Api\V1\LeagueUpdateRequest;
use App\Http\Resources\LeagueResource;
use App\Models\League;
use App\Models\LineupSlot;
use App\Models\Player;
use App\Models\Team;
use App\Support\RankingFields;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

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
     * NFL leagues from Fantrax getLeagues that are not yet in our database.
     */
    public function fantraxAvailable(): JsonResponse
    {
        $userSecretId = config('services.fantrax.user_secret_id');
        if (!$userSecretId) {
            return response()->json([
                'message' => 'FANTRAX_USER_SECRET_ID is not set in the backend .env file.',
            ], 422);
        }

        $response = Http::timeout(30)->get('https://www.fantrax.com/fxea/general/getLeagues', [
            'userSecretId' => $userSecretId,
        ]);

        if (!$response->successful()) {
            return response()->json([
                'message' => 'Failed to fetch leagues from Fantrax (HTTP ' . $response->status() . ').',
            ], 502);
        }

        $importedIds = League::query()
            ->whereNotNull('fantrax_id')
            ->pluck('fantrax_id')
            ->map(fn ($id) => (string) $id)
            ->all();
        $importedSet = array_flip($importedIds);

        $available = collect($response->json('leagues') ?? [])
            ->filter(function ($entry) use ($importedSet) {
                if (!is_array($entry)) {
                    return false;
                }
                $sport = strtoupper(trim((string) ($entry['sport'] ?? '')));
                $leagueId = (string) ($entry['leagueId'] ?? '');
                if ($sport !== 'NFL' || $leagueId === '') {
                    return false;
                }

                return !isset($importedSet[$leagueId]);
            })
            ->map(fn ($entry) => [
                'league_name' => (string) ($entry['leagueName'] ?? ''),
                'league_id' => (string) ($entry['leagueId'] ?? ''),
                'team_name' => (string) ($entry['teamName'] ?? ''),
            ])
            ->sortBy('league_name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

        return response()->json(['data' => $available]);
    }

    /**
     * Create a league and its teams from Fantrax getLeagueInfo + getLeagues.
     * Marks the user's owned team via FANTRAX_USER_SECRET_ID.
     */
    public function importFantrax(LeagueImportFantraxRequest $request): LeagueResource|JsonResponse
    {
        $fantraxLeagueId = $request->validated('fantrax_id');
        $leagueName = $request->validated('name');
        $ppr = $request->boolean('ppr', true);
        $bestball = $request->boolean('bestball', false);
        $userSecretId = config('services.fantrax.user_secret_id');

        if (!$userSecretId) {
            return response()->json([
                'message' => 'FANTRAX_USER_SECRET_ID is not set in the backend .env file.',
            ], 422);
        }

        if (League::query()->where('fantrax_id', $fantraxLeagueId)->exists()) {
            return response()->json([
                'message' => 'A league with this Fantrax ID already exists.',
            ], 422);
        }

        $infoResponse = Http::timeout(30)->get('https://www.fantrax.com/fxea/general/getLeagueInfo', [
            'leagueId' => $fantraxLeagueId,
        ]);

        if (!$infoResponse->successful()) {
            return response()->json([
                'message' => 'Failed to fetch league info from Fantrax (HTTP ' . $infoResponse->status() . ').',
            ], 502);
        }

        $teamInfo = $infoResponse->json('teamInfo') ?? [];
        if (!is_array($teamInfo) || $teamInfo === []) {
            return response()->json([
                'message' => 'Fantrax returned no teams for this league ID. Check that the ID is correct.',
            ], 422);
        }

        $leaguesResponse = Http::timeout(30)->get('https://www.fantrax.com/fxea/general/getLeagues', [
            'userSecretId' => $userSecretId,
        ]);

        if (!$leaguesResponse->successful()) {
            return response()->json([
                'message' => 'Failed to fetch your leagues from Fantrax (HTTP ' . $leaguesResponse->status() . ').',
            ], 502);
        }

        $myTeamId = null;
        foreach ($leaguesResponse->json('leagues') ?? [] as $entry) {
            if (($entry['leagueId'] ?? null) === $fantraxLeagueId) {
                $myTeamId = $entry['teamId'] ?? null;
                break;
            }
        }

        $league = DB::transaction(function () use ($leagueName, $fantraxLeagueId, $ppr, $bestball, $teamInfo, $myTeamId) {
            $league = League::query()->create([
                'name' => $leagueName,
                'fantrax_id' => $fantraxLeagueId,
                'ppr' => $ppr,
                'bestball' => $bestball,
            ]);

            foreach ($teamInfo as $teamId => $team) {
                $name = is_array($team) ? ($team['name'] ?? null) : null;
                $id = is_array($team) ? ($team['id'] ?? (string) $teamId) : (string) $teamId;
                if (!$name) {
                    continue;
                }

                Team::query()->create([
                    'name' => $name,
                    'fantrax_id' => $id,
                    'league_id' => $league->id,
                    'my_team' => $myTeamId !== null && $id === $myTeamId,
                ]);
            }

            return $league;
        });

        return new LeagueResource($league->load('teams'));
    }

    /**
     * Set requires_waiver_claim = true on all non-bestball leagues.
     */
    public function flagWaiverClaims(): JsonResponse
    {
        $count = League::query()->where('bestball', false)->update(['requires_waiver_claim' => true]);

        return response()->json(['leagues_flagged' => $count]);
    }

    /**
     * Set requires_roster_moves = true on all non-bestball leagues.
     */
    public function flagRosterMoves(): JsonResponse
    {
        $count = League::query()->where('bestball', false)->update(['requires_roster_moves' => true]);

        return response()->json(['leagues_flagged' => $count]);
    }

    /**
     * Set requires_roster_optimised = true on all non-bestball leagues.
     */
    public function flagRosterOptimisation(): JsonResponse
    {
        $count = League::query()->where('bestball', false)->update(['requires_roster_optimised' => true]);

        return response()->json(['leagues_flagged' => $count]);
    }

    /**
     * Set requires_thursday_update = true on all non-bestball leagues.
     */
    public function flagThursdayUpdate(): JsonResponse
    {
        $count = League::query()->where('bestball', false)->update(['requires_thursday_update' => true]);

        return response()->json(['leagues_flagged' => $count]);
    }

    /**
     * Set requires_pre_season_optimised = true on all non-bestball leagues.
     */
    public function flagPreSeasonOptimisation(): JsonResponse
    {
        $count = League::query()->where('bestball', false)->update(['requires_pre_season_optimised' => true]);

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

        $cols = RankingFields::columns($league);

        $myPlayers = $mySlots
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

        // Available players: not rostered in this league, have any ranking for this scoring format
        $available = Player::with('irlFranchise')
            ->whereNotIn('id', $rosteredIds)
            ->where(function ($q) use ($cols) {
                $q->whereNotNull($cols['season_rank'])
                  ->orWhereNotNull($cols['season_position_rank'])
                  ->orWhereNotNull($cols['week_rank'])
                  ->orWhereNotNull($cols['week_position_rank'])
                  ->orWhereNotNull($cols['waiver_rank'])
                  ->orWhereNotNull($cols['waiver_rank_overall']);
            })
            ->get()
            ->map(fn ($p) => array_merge([
                'id'                    => $p->id,
                'name'                  => $p->name,
                'positions'             => $p->positions ?? [],
                'irl_franchise_abbr'    => $p->irlFranchise?->abbreviated_name,
                'bye_week'              => $p->irlFranchise?->bye_week,
            ], RankingFields::valuesFor($p, $league)));

        return response()->json([
            'my_players' => $myPlayers,
            'available'  => $available,
        ]);
    }

    /**
     * Sync all lineup slots for a league from Fantrax getTeamRosters.
     */
    public function updateRosters(League $league): JsonResponse
    {
        $result = $this->syncLeagueRostersFromFantrax($league);

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], $result['status'] ?? 422);
        }

        return response()->json($result);
    }

    /**
     * Sync rosters for leagues that have a "my team" and a Fantrax league ID.
     * Pass bestball=true to update only bestball leagues; otherwise only standard leagues.
     */
    public function updateAllRosters(Request $request): JsonResponse
    {
        $bestball = $request->boolean('bestball', false);

        $leagues = League::query()
            ->whereNotNull('fantrax_id')
            ->where('bestball', $bestball)
            ->whereHas('teams', fn ($q) => $q->where('my_team', true))
            ->with('teams')
            ->orderBy('id')
            ->get();

        $leagueResults = [];
        $totals = [
            'leagues_updated' => 0,
            'leagues_failed' => 0,
            'teams_matched' => 0,
            'slots_created' => 0,
            'bestball' => $bestball,
        ];

        foreach ($leagues as $league) {
            $result = $this->syncLeagueRostersFromFantrax($league);
            $entry = [
                'league_id' => $league->id,
                'league_name' => $league->name,
            ] + $result;

            if (isset($result['error'])) {
                $totals['leagues_failed']++;
            } else {
                $totals['leagues_updated']++;
                $totals['teams_matched'] += $result['teams_matched'] ?? 0;
                $totals['slots_created'] += $result['slots_created'] ?? 0;
            }

            $leagueResults[] = $entry;
        }

        return response()->json([
            ...$totals,
            'leagues' => $leagueResults,
        ]);
    }

    /**
     * Fetch Fantrax rosters for a league and replace all lineup slots.
     *
     * @return array<string, mixed>
     */
    private function syncLeagueRostersFromFantrax(League $league): array
    {
        if (!$league->fantrax_id) {
            return [
                'error' => 'League has no Fantrax ID. Import or set one in Setup first.',
                'status' => 422,
            ];
        }

        $response = Http::timeout(60)->get('https://www.fantrax.com/fxea/general/getTeamRosters', [
            'leagueId' => $league->fantrax_id,
        ]);

        if (!$response->successful()) {
            return [
                'error' => 'Failed to fetch rosters from Fantrax (HTTP ' . $response->status() . ').',
                'status' => 502,
            ];
        }

        $rosters = $response->json('rosters') ?? [];
        if (!is_array($rosters) || $rosters === []) {
            return [
                'error' => 'Fantrax returned no roster data for this league.',
                'status' => 422,
            ];
        }

        $league->loadMissing('teams');

        $teamByFantraxId = [];
        $teamByName = [];
        foreach ($league->teams as $team) {
            if ($team->fantrax_id) {
                $teamByFantraxId[$team->fantrax_id] = $team;
            }
            $teamByName[strtolower($team->name)] = $team;
        }

        $playerByFantraxId = $this->buildPlayerFantraxIdLookup();

        $results = [
            'teams_matched' => 0,
            'teams_not_found' => [],
            'slots_created' => 0,
            'players_not_found' => [],
            'period' => $response->json('period'),
        ];
        $newSlots = [];
        $teamIds = $league->teams->pluck('id')->toArray();

        foreach ($rosters as $fantraxTeamId => $roster) {
            if (!is_array($roster)) {
                continue;
            }

            $teamName = (string) ($roster['teamName'] ?? '');
            $team = $teamByFantraxId[(string) $fantraxTeamId]
                ?? ($teamName !== '' ? ($teamByName[strtolower($teamName)] ?? null) : null);

            if (!$team) {
                $results['teams_not_found'][] = $teamName !== '' ? $teamName : (string) $fantraxTeamId;
                continue;
            }

            $results['teams_matched']++;

            $teamSlots = $this->assignSlotsFromFantraxRoster(
                $team,
                $roster['rosterItems'] ?? [],
                $playerByFantraxId,
                $results,
            );
            foreach ($teamSlots as $slot) {
                $newSlots[] = $slot;
                $results['slots_created']++;
            }
        }

        DB::transaction(function () use ($teamIds, $newSlots, $league) {
            LineupSlot::whereIn('team_id', $teamIds)->delete();

            foreach (array_chunk($newSlots, 500) as $chunk) {
                LineupSlot::insert($chunk);
            }

            $league->update(['teams_updated_at' => now()]);
        });

        return $results;
    }

    /**
     * Map Fantrax ACTIVE/RESERVE roster items onto our lineup slots.
     * ACTIVE players fill position starters; one leftover RB/WR/TE (or Fantrax RWT) → RWT;
     * RESERVE (and any leftover ACTIVE) → BN.
     *
     * @param  array<int, mixed>  $rosterItems
     * @param  array<string, \App\Models\Player>  $playerByFantraxId
     * @param  array<string, mixed>  $results
     * @return list<array<string, mixed>>
     */
    private function assignSlotsFromFantraxRoster(
        Team $team,
        array $rosterItems,
        array $playerByFantraxId,
        array &$results,
    ): array {
        $starterSlots = [
            'QB'  => ['QB'],
            'RB'  => ['RB1', 'RB2'],
            'WR'  => ['WR1', 'WR2', 'WR3'],
            'TE'  => ['TE'],
            'K'   => ['K'],
            'DST' => ['DST'],
        ];

        $activeByPos = [];
        $benchFantraxIds = [];

        foreach ($rosterItems as $item) {
            if (!is_array($item)) {
                continue;
            }

            $fantraxPlayerId = (string) ($item['id'] ?? '');
            $pos = $this->mapFantraxRosterPosition((string) ($item['position'] ?? ''));
            if ($fantraxPlayerId === '' || $pos === null) {
                continue;
            }

            $status = strtoupper(trim((string) ($item['status'] ?? '')));
            if ($status === 'ACTIVE') {
                $activeByPos[$pos][] = $fantraxPlayerId;
            } else {
                // RESERVE (or any non-ACTIVE) → bench
                $benchFantraxIds[] = $fantraxPlayerId;
            }
        }

        $assignments = []; // lineup_position => fantrax player id
        $used = [];

        foreach ($starterSlots as $pos => $slots) {
            $pool = $activeByPos[$pos] ?? [];
            foreach ($slots as $i => $slot) {
                if (!isset($pool[$i])) {
                    break;
                }
                $assignments[$slot] = $pool[$i];
                $used[$pool[$i]] = true;
            }
        }

        // Flex: Fantrax-labeled RWT first, then leftover ACTIVE RB/WR/TE
        $flexCandidates = [];
        foreach ($activeByPos['RWT'] ?? [] as $fid) {
            if (!isset($used[$fid])) {
                $flexCandidates[] = $fid;
            }
        }
        foreach (['RB', 'WR', 'TE'] as $pos) {
            $slots = $starterSlots[$pos];
            $pool = $activeByPos[$pos] ?? [];
            for ($i = count($slots); $i < count($pool); $i++) {
                if (!isset($used[$pool[$i]])) {
                    $flexCandidates[] = $pool[$i];
                }
            }
        }

        if ($flexCandidates !== []) {
            $assignments['RWT'] = $flexCandidates[0];
            $used[$flexCandidates[0]] = true;
            for ($i = 1, $n = count($flexCandidates); $i < $n; $i++) {
                $benchFantraxIds[] = $flexCandidates[$i];
            }
        }

        // Any remaining ACTIVE (e.g. 2nd QB) → bench
        foreach ($activeByPos as $pool) {
            foreach ($pool as $fid) {
                if (!isset($used[$fid])) {
                    $benchFantraxIds[] = $fid;
                }
            }
        }

        $now = now();
        $rows = [];

        $append = function (string $fantraxPlayerId, string $lineupPosition) use (
            &$rows,
            &$results,
            $team,
            $playerByFantraxId,
            $now,
        ): void {
            $player = $playerByFantraxId[$fantraxPlayerId] ?? null;
            $playerId = $player?->id;

            if ($playerId === null) {
                $results['players_not_found'][] = [
                    'team' => $team->name,
                    'section' => $lineupPosition,
                    'name' => $fantraxPlayerId,
                ];
            }

            $rows[] = [
                'team_id' => $team->id,
                'player_id' => $playerId,
                'lineup_position' => $lineupPosition,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        };

        foreach ($assignments as $lineupPosition => $fantraxPlayerId) {
            $append($fantraxPlayerId, $lineupPosition);
        }
        foreach ($benchFantraxIds as $fantraxPlayerId) {
            $append($fantraxPlayerId, 'BN');
        }

        return $rows;
    }

    /**
     * @return array<string, \App\Models\Player>
     */
    private function buildPlayerFantraxIdLookup(): array
    {
        $lookup = [];
        foreach (Player::query()->whereNotNull('fantrax_id')->get(['id', 'name', 'fantrax_id', 'positions']) as $player) {
            $fid = (string) $player->fantrax_id;
            $lookup[$fid] = $player;
            // Fantrax DST ids often store as "20080#1090" while rosters return "20080"
            if (str_contains($fid, '#')) {
                $short = explode('#', $fid, 2)[0];
                if ($short !== '' && !isset($lookup[$short])) {
                    $lookup[$short] = $player;
                }
            }
        }

        return $lookup;
    }

    private function mapFantraxRosterPosition(string $pos): ?string
    {
        static $map = [
            'QB'   => 'QB',
            'RB'   => 'RB',
            'WR'   => 'WR',
            'TE'   => 'TE',
            'RWT'  => 'RWT',
            'FLEX' => 'RWT',
            'K'    => 'K',
            'DST'  => 'DST',
            'DEF'  => 'DST',
            'D/ST' => 'DST',
        ];

        return $map[strtoupper(trim($pos))] ?? null;
    }
}
