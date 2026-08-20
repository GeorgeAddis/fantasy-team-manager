<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PlayerPosition;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PlayerStoreRequest;
use App\Http\Requests\Api\V1\PlayerUpdateRequest;
use App\Http\Resources\PlayerResource;
use App\Models\IrlFranchise;
use App\Models\Player;
use App\Support\RankingFields;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class PlayerController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Player::query()->with('irlFranchise');
        $search = $request->string('search')->trim()->value();
        $perPage = max(1, min((int) $request->integer('per_page', 100), 5000));
        $includeFreeAgents = $request->boolean('include_free_agents');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhereRaw("positions::text ilike ?", ["%{$search}%"])
                  ->orWhereHas('irlFranchise', function ($fq) use ($search) {
                      $fq->where('name', 'ilike', "%{$search}%")
                         ->orWhere('abbreviated_name', 'ilike', "%{$search}%")
                         ->orWhere('alternate_name', 'ilike', "%{$search}%")
                         ->orWhere('alternate_abbreviated_name', 'ilike', "%{$search}%");
                  });
            });
        } elseif (!$includeFreeAgents) {
            $query->whereNotNull('irl_franchise_id');
        }

        return PlayerResource::collection($query->orderBy('name')->paginate($perPage));
    }

    public function store(PlayerStoreRequest $request): PlayerResource
    {
        $player = Player::query()->create($request->validated());

        return new PlayerResource($player->load('irlFranchise'));
    }

    public function show(Player $player): PlayerResource
    {
        return new PlayerResource($player->load('irlFranchise'));
    }

    public function update(PlayerUpdateRequest $request, Player $player): PlayerResource
    {
        $player->update($request->validated());

        return new PlayerResource($player->fresh()->load('irlFranchise'));
    }

    public function destroy(Player $player): Response
    {
        $player->delete();

        return response()->noContent();
    }

    /**
     * Search across all "my teams" for players matching a name or IRL franchise.
     * Returns which of my teams roster the matched players and their lineup positions.
     */
    public function searchMyTeams(Request $request): JsonResponse
    {
        $search = $request->string('search')->trim()->value();
        $type = $request->input('type', 'player'); // 'player' or 'franchise'

        if (!$search) {
            return response()->json(['results' => []]);
        }

        // Get all "my team" IDs
        $myTeams = \App\Models\Team::where('my_team', true)
            ->with('league')
            ->get();

        $myTeamIds = $myTeams->pluck('id')->toArray();

        if (empty($myTeamIds)) {
            return response()->json(['results' => []]);
        }

        // Find matching player IDs
        if ($type === 'franchise') {
            $franchiseIds = IrlFranchise::where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('abbreviated_name', 'ilike', "%{$search}%")
                  ->orWhere('alternate_name', 'ilike', "%{$search}%")
                  ->orWhere('alternate_abbreviated_name', 'ilike', "%{$search}%");
            })->pluck('id')->toArray();

            if (empty($franchiseIds)) {
                return response()->json(['results' => [], 'status' => 'not_found']);
            }

            $playerIds = Player::whereIn('irl_franchise_id', $franchiseIds)->pluck('id')->toArray();
        } else {
            $players = Player::where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('alternate_name', 'ilike', "%{$search}%");
            })->get(['id', 'name']);

            if ($players->isEmpty()) {
                return response()->json(['results' => [], 'status' => 'not_found']);
            }

            $playerIds = $players->pluck('id')->toArray();
        }

        if (empty($playerIds)) {
            return response()->json(['results' => [], 'status' => 'not_found']);
        }

        // Find lineup slots on my teams for these players
        $slots = \App\Models\LineupSlot::whereIn('team_id', $myTeamIds)
            ->whereIn('player_id', $playerIds)
            ->with(['player.irlFranchise', 'team.league'])
            ->get();

        $teamLookup = $myTeams->keyBy('id');

        $results = $slots->map(function ($slot) use ($teamLookup) {
            $team = $teamLookup[$slot->team_id] ?? $slot->team;
            $ranks = RankingFields::valuesFor($slot->player, $team->league ?? null);
            return [
                'player_name'          => $slot->player->name,
                'player_id'            => $slot->player->id,
                'positions'            => $slot->player->positions ?? [],
                'irl_franchise_abbr'   => $slot->player->irlFranchise?->abbreviated_name,
                'lineup_position'      => $slot->lineup_position->value,
                'team_name'            => $team->name ?? '',
                'league_name'          => $team->league->name ?? '',
                'league_id'            => $team->league->id ?? null,
                'season_rank'          => $ranks['season_rank'],
                'season_position_rank' => $ranks['season_position_rank'],
            ];
        })->sortBy('player_name')->values();

        $status = $results->isEmpty() ? 'not_on_teams' : 'found';

        // For player search, include matched player names for the message
        $matchedNames = [];
        if ($type === 'player' && $status === 'not_on_teams') {
            $matchedNames = $players->pluck('name')->toArray();
        }

        // Find leagues where matched players are available (not rostered)
        $availableLeagues = [];
        if ($type === 'player' && !empty($playerIds)) {
            // Get all leagues (via my teams)
            $leagueIds = $myTeams->pluck('league_id')->unique()->toArray();
            $allLeagues = \App\Models\League::whereIn('id', $leagueIds)->with('teams')->get();

            // League IDs where the player IS rostered (on any team, not just mine)
            $rosteredLeagueIds = $results->pluck('league_id')->unique()->toArray();

            // For each league not already showing the player on my team,
            // check if the player is rostered on ANY team in that league
            foreach ($allLeagues as $league) {
                if (in_array($league->id, $rosteredLeagueIds, true)) {
                    continue;
                }

                $leagueTeamIds = $league->teams->pluck('id')->toArray();
                $isRostered = \App\Models\LineupSlot::whereIn('team_id', $leagueTeamIds)
                    ->whereIn('player_id', $playerIds)
                    ->exists();

                if (!$isRostered) {
                    $availableLeagues[] = [
                        'league_id'   => $league->id,
                        'league_name' => $league->name,
                    ];
                }
            }
        }

        return response()->json([
            'results' => $results,
            'available_leagues' => $availableLeagues,
            'status' => $status,
            'matched_names' => $matchedNames,
        ]);
    }

    public function stats(): JsonResponse
    {
        $total = Player::query()->count();
        $lastImport = Player::query()->max('created_at');

        return response()->json([
            'total' => $total,
            'last_import' => $lastImport,
        ]);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ]);

        $clearExisting = $request->boolean('clear_existing');
        $skipExisting = $request->boolean('skip_existing');

        if ($clearExisting && $skipExisting) {
            return response()->json([
                'message' => 'Cannot use "clear existing" and "skip existing" at the same time.',
            ], 422);
        }

        $handle = fopen($request->file('file')->getRealPath(), 'r');
        if (!$handle) {
            return response()->json(['message' => 'Unable to read the file.'], 422);
        }

        $parsed = $this->parseCsvRows($handle);
        fclose($handle);

        if ($parsed === null) {
            return response()->json(['message' => 'CSV file is empty.'], 422);
        }
        if (isset($parsed['error'])) {
            return response()->json(['message' => $parsed['error']], 422);
        }

        ['rows' => $rows, 'skipped' => $skipped, 'failedRows' => $failedRows] = $parsed;

        if (empty($rows)) {
            return response()->json(['message' => 'No valid player rows found in CSV.'], 422);
        }

        $cleared = 0;
        if ($clearExisting) {
            $cleared = Player::query()->count();
            Player::query()->delete();
        } elseif ($skipExisting) {
            [$rows, $dupSkipped, $dupFailedRows] = $this->filterDuplicatePlayers($rows, $failedRows);
            $skipped += $dupSkipped;
            $failedRows = array_slice(array_merge($failedRows, $dupFailedRows), 0, 200);
        }

        foreach (array_chunk($rows, 500) as $chunk) {
            Player::query()->insert($chunk);
        }

        $fantraxSync = $this->syncFantraxIdsFromApi();

        return response()->json([
            'imported' => count($rows),
            'skipped' => $skipped,
            'cleared' => $cleared,
            'failed_rows' => $failedRows,
            'fantrax_ids_updated' => $fantraxSync['updated'],
            'fantrax_unmatched_count' => $fantraxSync['unmatched_count'],
            'fantrax_error' => $fantraxSync['error'],
        ]);
    }

    private function parseCsvRows($handle): ?array
    {
        $header = fgetcsv($handle);
        if (!$header) {
            return null;
        }

        $header = array_map(fn ($h) => strtolower(trim($h)), $header);
        $playerCol = array_search('player', $header);
        $teamCol   = array_search('team', $header);
        $posCol    = array_search('position', $header);

        if ($playerCol === false || $teamCol === false || $posCol === false) {
            return ['error' => 'CSV must have "Player", "Team", and "Position" column headers in the first row.'];
        }

        $franchises = IrlFranchise::all();
        $abbrLookup = $this->buildFranchiseAbbrLookup($franchises);
        $nameLookup = $this->buildFranchiseNameLookup($franchises);
        $validPositions = array_map(fn ($p) => $p->value, PlayerPosition::cases());

        $rows = [];
        $skipped = 0;
        $failedRows = [];
        $now = now();
        $rowNumber = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;
            $name   = trim($row[$playerCol] ?? '');
            $teamRaw = strtoupper(trim($row[$teamCol] ?? ''));
            $posRaw  = strtoupper(trim($row[$posCol] ?? ''));

            $positions = array_unique(array_filter(
                array_map('trim', preg_split('/[\/,]/', $posRaw)),
                fn ($p) => in_array($p, $validPositions, true)
            ));

            if ($name === '' || empty($positions)) {
                $skipped++;
                if (count($failedRows) < 200) {
                    $failedRows[] = [
                        'row'      => $rowNumber,
                        'name'     => $name,
                        'team'     => $teamRaw,
                        'position' => $posRaw,
                        'reason'   => $name === '' ? 'missing_name' : 'invalid_position',
                    ];
                }
                continue;
            }

            $teamParts = explode('/', $teamRaw);
            $teamAbbr  = trim(end($teamParts));
            $franchiseId = $abbrLookup[$teamAbbr] ?? null;

            if ($franchiseId === null && in_array('DST', $positions, true)) {
                $franchiseId = $nameLookup[$this->normalizeForMatch($name)] ?? null;
            }

            $rows[] = [
                'name'                => $name,
                'irl_franchise_id'    => $franchiseId,
                'positions'           => json_encode(array_values($positions)),
                'week_rank'           => 999,
                'week_position_rank'  => 999,
                'week_rank_non_ppr'   => 999,
                'week_position_rank_non_ppr' => 999,
                'season_rank'         => 999,
                'season_position_rank' => 999,
                'season_rank_non_ppr' => 999,
                'season_position_rank_non_ppr' => 999,
                'created_at'          => $now,
                'updated_at'          => $now,
            ];
        }

        return compact('rows', 'skipped', 'failedRows');
    }

    /**
     * Remove rows whose player name already exists in the database.
     * Matches using the same normalised-name logic as ranking imports,
     * including each player's alternate_name.
     *
     * @return array{0: array, 1: int, 2: array}  [filtered rows, skipped count, failed-row entries]
     */
    private function filterDuplicatePlayers(array $rows, array $existingFailedRows): array
    {
        $existingCount = count($existingFailedRows);
        $lookup = $this->buildExistingPlayerNameLookup();

        $filtered   = [];
        $skipped    = 0;
        $failedRows = [];

        foreach ($rows as $row) {
            if (isset($lookup[$this->normalizePlayerName($row['name'])])) {
                $skipped++;
                if (($existingCount + count($failedRows)) < 200) {
                    $failedRows[] = [
                        'row'      => null,
                        'name'     => $row['name'],
                        'team'     => '',
                        'position' => implode('/', json_decode($row['positions'], true)),
                        'reason'   => 'duplicate',
                    ];
                }
            } else {
                $filtered[] = $row;
            }
        }

        return [$filtered, $skipped, $failedRows];
    }

    private function buildFranchiseAbbrLookup($franchises): array
    {
        $lookup = [];
        foreach ($franchises as $f) {
            $lookup[strtoupper($f->abbreviated_name)] = $f->id;
            if ($f->alternate_abbreviated_name) {
                $lookup[strtoupper($f->alternate_abbreviated_name)] = $f->id;
            }
        }
        return $lookup;
    }

    private function buildFranchiseNameLookup($franchises): array
    {
        $lookup = [];
        foreach ($franchises as $f) {
            $lookup[$this->normalizeForMatch($f->name)]           = $f->id;
            $lookup[$this->normalizeForMatch($f->abbreviated_name)] = $f->id;
            if ($f->alternate_name) {
                $lookup[$this->normalizeForMatch($f->alternate_name)] = $f->id;
            }
            if ($f->alternate_abbreviated_name) {
                $lookup[$this->normalizeForMatch($f->alternate_abbreviated_name)] = $f->id;
            }
        }
        return $lookup;
    }

    private function buildExistingPlayerNameLookup(): array
    {
        $lookup = [];
        foreach (Player::query()->select(['name', 'alternate_name'])->get() as $p) {
            $lookup[$this->normalizePlayerName($p->name)] = true;
            if ($p->alternate_name) {
                $lookup[$this->normalizePlayerName($p->alternate_name)] = true;
            }
        }
        return $lookup;
    }

    /**
     * Import ranking data from pasted tab-separated text.
     * Types: QB, DST, K → sets week/season_position_rank from # column.
     * Type: RWT → sets week/season_rank from # column, parses Pos column for position rank.
     */
    public function importRankings(Request $request): JsonResponse
    {
        $request->validate([
            'data' => ['required', 'string', 'min:5'],
            'type' => ['required', 'string', 'in:QB,RWT,DST,K'],
            'period' => ['required', 'string', 'in:week,season'],
            'ppr' => ['sometimes', 'boolean'],
        ]);

        $type = $request->input('type');
        $period = $request->input('period');
        $isRwt = $type === 'RWT';
        $cols = RankingFields::columns(null, $request->boolean('ppr', true));

        $lines = array_values(array_filter(
            array_map('trim', explode("\n", $request->input('data'))),
            fn ($l) => $l !== ''
        ));

        if (empty($lines)) {
            return response()->json(['message' => 'No data provided.'], 422);
        }

        // Skip header row if present
        $firstCols = preg_split('/\t/', $lines[0]);
        if (strtolower(trim($firstCols[0] ?? '')) === '#' || stripos($firstCols[0] ?? '', 'player') !== false) {
            array_shift($lines);
        }

        $allPlayers = Player::all();
        $playerByName = [];
        foreach ($allPlayers as $p) {
            $playerByName[$this->normalizePlayerName($p->name)] = $p;
            if ($p->alternate_name) {
                $playerByName[$this->normalizePlayerName($p->alternate_name)] = $p;
            }
        }

        $updated = 0;
        $notFound = [];

        foreach ($lines as $line) {
            $colsLine = preg_split('/\t/', $line);
            $rank = (int) trim($colsLine[0] ?? '');
            $rawPlayer = trim($colsLine[1] ?? '');

            if ($rank <= 0 || $rawPlayer === '') {
                continue;
            }

            $playerName = preg_replace('/\s*\([^)]*\)\s*$/', '', $rawPlayer);
            $playerName = trim($playerName);

            $player = $playerByName[$this->normalizePlayerName($playerName)] ?? null;
            if (!$player) {
                $notFound[] = ['rank' => $rank, 'name' => $playerName];
                continue;
            }

            if ($isRwt) {
                $posRaw = trim($colsLine[3] ?? '');
                $posRank = null;
                if (preg_match('/^(RB|WR|TE)(\d+)$/i', $posRaw, $m)) {
                    $posRank = (int) $m[2];
                }

                $fields = $period === 'week'
                    ? [$cols['week_rank'] => $rank, $cols['week_position_rank'] => $posRank ?? 999]
                    : [$cols['season_rank'] => $rank, $cols['season_position_rank'] => $posRank ?? 999];
            } else {
                $fields = $period === 'week'
                    ? [$cols['week_position_rank'] => $rank]
                    : [$cols['season_position_rank'] => $rank];
            }

            Player::query()->where('id', $player->id)->update($fields);
            $updated++;
        }

        return response()->json([
            'updated' => $updated,
            'not_found' => $notFound,
            'total_lines' => count($lines),
        ]);
    }

    /**
     * Import season rankings from an ETR-style CSV upload or pasted CSV/TSV text.
     *
     * Required columns: Player, ETR Rank (aliases: Rank, 1QB Rank)
     * Helpful: Position, Team (DST matching), ETR Pos Rank (aliases: 1QB Pos Rk)
     * If pos rank is missing, it is derived from overall rank within each position.
     */
    public function importSeasonRankings(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['nullable', 'file', 'mimes:csv,txt', 'max:5120'],
            'data' => ['nullable', 'string', 'min:5'],
            'ppr' => ['sometimes', 'boolean'],
        ]);

        $rankCols = RankingFields::columns(null, $request->boolean('ppr', true));

        if (!$request->hasFile('file') && !$request->filled('data')) {
            return response()->json([
                'message' => 'Provide a CSV file or pasted ranking data.',
            ], 422);
        }

        if ($request->hasFile('file')) {
            $handle = fopen($request->file('file')->getRealPath(), 'r');
            if (!$handle) {
                return response()->json(['message' => 'Unable to read the file.'], 422);
            }
            $table = [];
            while (($row = fgetcsv($handle)) !== false) {
                $table[] = $row;
            }
            fclose($handle);
        } else {
            $table = $this->parseDelimitedText($request->input('data'));
        }

        if (count($table) < 2) {
            return response()->json(['message' => 'No ranking rows found.'], 422);
        }

        $header = array_shift($table);
        $headerMap = [];
        foreach ($header as $i => $h) {
            $key = $this->normalizeCsvHeader((string) $h);
            if ($key !== '') {
                $headerMap[$key] = $i;
            }
        }

        $playerCol = $this->findCsvColumn($headerMap, ['player', 'name']);
        $rankCol = $this->findCsvColumn($headerMap, ['etr rank', 'etrrank', '1qb rank', '1qbrank', 'overall rank', 'overallrank']);
        $posCol = $this->findCsvColumn($headerMap, ['position', 'pos']);
        $teamCol = $this->findCsvColumn($headerMap, ['team', 'nfl']);
        $posRankCol = $this->findCsvColumn($headerMap, [
            'etr pos rank', 'etrposrank', 'etr pos ra', 'etrposra', 'etr pos r', 'etrposr',
            '1qb pos rk', '1qbposrk',
        ]);

        if ($playerCol === null || $rankCol === null) {
            return response()->json([
                'message' => 'CSV must include "Player" and "ETR Rank" columns (or "1QB Rank" for the older Fantrax format).',
            ], 422);
        }

        $allPlayers = Player::all();
        $playerByName = [];
        foreach ($allPlayers as $p) {
            $playerByName[$this->normalizePlayerName($p->name)] = $p;
            if ($p->alternate_name) {
                $playerByName[$this->normalizePlayerName($p->alternate_name)] = $p;
            }
        }
        $dstLookup = $this->buildDstFranchiseLookup();

        $pending = [];
        $notFound = [];
        $seenPlayerIds = [];

        foreach ($table as $cols) {
            if (!is_array($cols) || count(array_filter($cols, fn ($c) => trim((string) $c) !== '')) === 0) {
                continue;
            }

            $rawPlayer = trim((string) ($cols[$playerCol] ?? ''));
            $seasonRank = (int) preg_replace('/[^\d]/', '', (string) ($cols[$rankCol] ?? ''));
            $position = strtoupper(trim((string) ($cols[$posCol] ?? '')));
            $teamAbbr = strtoupper(trim((string) ($cols[$teamCol] ?? '')));
            $posRkRaw = $posRankCol !== null ? trim((string) ($cols[$posRankCol] ?? '')) : '';

            if ($rawPlayer === '' || $seasonRank <= 0) {
                continue;
            }

            $posRank = null;
            if ($posRkRaw !== '' && preg_match('/^[A-Z]{1,3}(\d+)$/i', $posRkRaw, $m)) {
                $posRank = (int) $m[1];
            } elseif ($posRkRaw !== '' && ctype_digit($posRkRaw)) {
                $posRank = (int) $posRkRaw;
            }

            $mappedPos = $position !== '' ? $this->mapFantraxPosition($position) : null;
            $player = null;
            if ($mappedPos === 'DST') {
                // Prefer Team abbr / aliases, then Player column (supports alt names like "LA DST")
                $player = $dstLookup[$teamAbbr]
                    ?? $playerByName[$this->normalizePlayerName($rawPlayer)]
                    ?? ($teamAbbr !== '' ? ($playerByName[$this->normalizePlayerName($teamAbbr)] ?? null) : null);
            } else {
                $player = $playerByName[$this->normalizePlayerName($rawPlayer)] ?? null;
            }

            if (!$player) {
                $notFound[] = ['rank' => $seasonRank, 'name' => $rawPlayer, 'position' => $position];
                continue;
            }

            if (isset($seenPlayerIds[$player->id])) {
                continue;
            }
            $seenPlayerIds[$player->id] = true;

            $pending[] = [
                'player' => $player,
                'season_rank' => $seasonRank,
                'pos_rank' => $posRank,
                'position' => $mappedPos ?? $position,
            ];
        }

        // Derive missing position ranks from overall order within each position
        $byPos = [];
        foreach ($pending as $i => $row) {
            if ($row['pos_rank'] !== null) {
                continue;
            }
            $key = $row['position'] !== '' ? $row['position'] : '_';
            $byPos[$key][] = $i;
        }
        foreach ($byPos as $indexes) {
            usort($indexes, fn ($a, $b) => $pending[$a]['season_rank'] <=> $pending[$b]['season_rank']);
            foreach ($indexes as $n => $i) {
                $pending[$i]['pos_rank'] = $n + 1;
            }
        }

        $updated = 0;
        $cleared = 0;
        $seasonCol = $rankCols['season_rank'];
        $seasonPosCol = $rankCols['season_position_rank'];

        DB::transaction(function () use ($pending, &$updated, &$cleared, $seasonCol, $seasonPosCol) {
            // Full overwrite for this scoring format only; leave the other set intact.
            // Use query builder updates (not model->update) so ranks that happen to
            // match the pre-wipe in-memory values are still written after the wipe.
            $cleared = Player::query()->update([
                $seasonCol => 999,
                $seasonPosCol => 999,
            ]);

            foreach ($pending as $row) {
                Player::query()->where('id', $row['player']->id)->update([
                    $seasonCol => $row['season_rank'],
                    $seasonPosCol => $row['pos_rank'] ?? 999,
                ]);
                $updated++;
            }
        });

        return response()->json([
            'updated' => $updated,
            'cleared' => $cleared,
            'not_found' => $notFound,
            'total_lines' => count($table),
        ]);
    }

    /**
     * Split pasted CSV/TSV text into rows of cells.
     */
    private function parseDelimitedText(string $data): array
    {
        $lines = preg_split('/\r\n|\r|\n/', $data) ?: [];
        $lines = array_values(array_filter(
            array_map(fn ($l) => rtrim($l, "\r"), $lines),
            fn ($l) => trim($l) !== ''
        ));

        if ($lines === []) {
            return [];
        }

        $first = $lines[0];
        $tabCount = substr_count($first, "\t");
        $commaCount = substr_count($first, ',');
        $delimiter = $tabCount >= $commaCount ? "\t" : ',';

        return array_map(fn ($line) => str_getcsv($line, $delimiter), $lines);
    }

    private function normalizeCsvHeader(string $header): string
    {
        return preg_replace('/[^a-z0-9]+/', '', strtolower(trim($header))) ?? '';
    }

    /**
     * @param  array<string, int>  $headerMap
     * @param  list<string>  $aliases
     */
    private function findCsvColumn(array $headerMap, array $aliases): ?int
    {
        foreach ($aliases as $alias) {
            $key = $this->normalizeCsvHeader($alias);
            if ($key !== '' && isset($headerMap[$key])) {
                return $headerMap[$key];
            }
        }

        // Allow truncated spreadsheet headers (e.g. "ETR Pos Ra")
        foreach ($aliases as $alias) {
            $needle = $this->normalizeCsvHeader($alias);
            if ($needle === '' || strlen($needle) < 4) {
                continue;
            }
            foreach ($headerMap as $key => $idx) {
                if (str_starts_with($key, $needle) || str_starts_with($needle, $key)) {
                    return $idx;
                }
            }
        }

        return null;
    }

    /**
     * Import waiver wire rankings from plain text (one player name per line).
     * Line position = rank. Type specifies the position being imported.
     * Clears existing waiver_rank for players of this position before importing.
     */
    public function importWaiverRankings(Request $request): JsonResponse
    {
        $request->validate([
            'data' => ['required', 'string', 'min:2'],
            'type' => ['required', 'string', 'in:OVR,QB,RB,WR,TE,K,DST'],
            'ppr' => ['sometimes', 'boolean'],
        ]);

        $type = $request->input('type');
        $cols = RankingFields::columns(null, $request->boolean('ppr', true));
        $rankField = $type === 'OVR' ? $cols['waiver_rank_overall'] : $cols['waiver_rank'];

        $lines = array_values(array_filter(
            array_map('trim', explode("\n", $request->input('data'))),
            fn ($l) => $l !== ''
        ));

        // Strip leading numbering like "1." or "2)" from each line
        $lines = array_map(fn ($l) => preg_replace('/^\d+[\.\)]\s*/', '', $l), $lines);

        if (empty($lines)) {
            return response()->json(['message' => 'No data provided.'], 422);
        }

        // Clear existing rankings for this type + scoring format
        if ($type === 'OVR') {
            Player::query()->update([$rankField => null]);
        } else {
            Player::whereJsonContains('positions', $type)->update([$rankField => null]);
        }

        $allPlayers = Player::all();
        $playerByName = [];
        foreach ($allPlayers as $p) {
            $playerByName[$this->normalizePlayerName($p->name)] = $p;
            if ($p->alternate_name) {
                $playerByName[$this->normalizePlayerName($p->alternate_name)] = $p;
            }
        }

        // Build DST franchise lookup for DST and OVR types
        $dstLookup = [];
        if ($type === 'DST' || $type === 'OVR') {
            $franchises = IrlFranchise::all();
            foreach ($franchises as $f) {
                $dstPlayer = $allPlayers->first(fn ($p) => $p->irl_franchise_id === $f->id
                    && in_array('DST', $p->positions ?? [], true));
                if ($dstPlayer) {
                    foreach (['name', 'abbreviated_name', 'alternate_name', 'alternate_abbreviated_name'] as $field) {
                        if ($f->$field) {
                            $dstLookup[$this->normalizePlayerName($f->$field)] = $dstPlayer;
                        }
                    }
                }
            }
        }

        $updated = 0;
        $notFound = [];

        foreach ($lines as $idx => $name) {
            $rank = $idx + 1;
            $normalized = $this->normalizePlayerName($name);

            // Try player name lookup first, then DST franchise lookup
            $player = $playerByName[$normalized] ?? $dstLookup[$normalized] ?? null;

            if (!$player) {
                $notFound[] = ['rank' => $rank, 'name' => $name];
                continue;
            }

            Player::query()->where('id', $player->id)->update([$rankField => $rank]);
            $updated++;
        }

        return response()->json([
            'updated' => $updated,
            'not_found' => $notFound,
            'total_lines' => count($lines),
        ]);
    }

    /**
     * Fetch player IDs from the Fantrax API and match them to players in our database.
     * Matches by normalised player name; uses position as a tiebreaker when multiple
     * DB players share the same name.  Returns an updated count and the list of DB
     * players that still have no Fantrax ID after the run.
     */
    public function importFantraxIds(): JsonResponse
    {
        $result = $this->syncFantraxIdsFromApi();

        if ($result['error'] !== null) {
            return response()->json(['message' => $result['error']], $result['status'] ?? 502);
        }

        return response()->json([
            'updated'         => $result['updated'],
            'unmatched_count' => $result['unmatched_count'],
            'unmatched'       => $result['unmatched'],
        ]);
    }

    /**
     * Pull Fantrax player IDs and write matches onto DB players.
     *
     * @return array{updated: int, unmatched_count: int, unmatched: array, error: ?string, status?: int}
     */
    private function syncFantraxIdsFromApi(): array
    {
        $response = Http::timeout(30)->get('https://www.fantrax.com/fxea/general/getPlayerIds', [
            'sport' => 'NFL',
        ]);

        if (!$response->successful()) {
            return [
                'updated' => 0,
                'unmatched_count' => 0,
                'unmatched' => [],
                'error' => 'Failed to fetch data from the Fantrax API (HTTP ' . $response->status() . ').',
                'status' => 502,
            ];
        }

        $fantraxPlayers = $this->parseFantraxPlayers($response->json() ?? []);

        if (empty($fantraxPlayers)) {
            return [
                'updated' => 0,
                'unmatched_count' => 0,
                'unmatched' => [],
                'error' => 'No player data was returned by the Fantrax API. The response format may have changed.',
                'status' => 422,
            ];
        }

        $dbPlayers = Player::query()->select(['id', 'name', 'alternate_name', 'positions'])->get();
        $dstLookup = $this->buildDstFranchiseLookup();
        $updates = $this->matchFantraxIds($dbPlayers, $dstLookup, $fantraxPlayers);

        if (!empty($updates)) {
            foreach ($updates as $playerId => $fantraxId) {
                Player::query()->where('id', $playerId)->update(['fantrax_id' => $fantraxId]);
            }
        }

        $unmatched = Player::query()
            ->whereNull('fantrax_id')
            ->select(['id', 'name', 'positions'])
            ->orderBy('name')
            ->get()
            ->map(fn ($p) => [
                'id'        => $p->id,
                'name'      => $p->name,
                'positions' => $p->positions ?? [],
            ])
            ->values()
            ->all();

        return [
            'updated' => count($updates),
            'unmatched_count' => count($unmatched),
            'unmatched' => array_slice($unmatched, 0, 200),
            'error' => null,
        ];
    }

    /**
     * Parse a Fantrax getPlayerIds response into a flat list of normalised entries.
     *
     * Handles the known shape:
     *   { "id1": { "name": "Last, First", "fantraxId": "...", "position": "...",
     *              "team": "...", "teamShortName": "..." }, ... }
     * as well as a { "playerIds": { ... } } wrapper if Fantrax adds one.
     *
     * Player names arrive as "Last, First" and are reversed to "First Last".
     * DST entries carry "teamShortName" (e.g. "PIT") in the "team" slot.
     */
    private function parseFantraxPlayers(array $data): array
    {
        // Unwrap { "playerIds": { ... } } if present, otherwise treat the whole
        // response as the player map.
        $map = isset($data['playerIds']) && is_array($data['playerIds'])
            ? $data['playerIds']
            : $data;

        $players = [];
        foreach ($map as $id => $value) {
            if (!is_array($value) || empty($value['name'])) {
                continue;
            }

            $pos  = strtoupper((string) ($value['pos'] ?? $value['position'] ?? ''));
            $name = (string) $value['name'];

            // DST entries: match by team abbreviation, not name.
            if ($pos === 'DST') {
                $teamAbbr = (string) ($value['teamShortName'] ?? $value['team'] ?? '');
                if ($teamAbbr === '' || $teamAbbr === '(N/A)') {
                    continue;
                }
                $players[] = [
                    'id'   => (string) ($value['fantraxId'] ?? $id),
                    'name' => '',
                    'pos'  => 'DST',
                    'team' => strtoupper($teamAbbr),
                ];
                continue;
            }

            // Include non-fantasy positions (e.g. CB) so two-way players like
            // Travis Hunter can still match by name against our WR/RB/etc. rows.
            // Names arrive as "Last, First" — reverse to "First Last".
            if (str_contains($name, ',')) {
                [$last, $first] = array_map('trim', explode(',', $name, 2));
                $name = $first . ' ' . $last;
            }

            if ($name === '') {
                continue;
            }

            $players[] = [
                'id'   => (string) ($value['fantraxId'] ?? $id),
                'name' => $name,
                'pos'  => $pos,
                'team' => '',
            ];
        }

        return $players;
    }

    /**
     * Match Fantrax entries to DB players.
     *
     * Skill-position players are matched by normalised name with position as a
     * tiebreaker.  DST entries are matched by franchise abbreviation via the
     * pre-built $dstLookup (abbr → Player).
     *
     * Two passes:
     *  1) Fantasy positions only (QB/RB/WR/TE/K/DST) — avoids binding
     *     "Josh Allen" QB to Fantrax's unrelated Center entry, etc.
     *  2) Dual-threat IDP positions (CB/S) for DB players still unmatched
     *     (e.g. Travis Hunter listed as CB on Fantrax).
     *
     * Returns a map of [ db_player_id => fantrax_id ].
     */
    private function matchFantraxIds($dbPlayers, array $dstLookup, array $fantraxPlayers): array
    {
        // Build name lookup: normalised_name => [Player, ...]
        $nameLookup = [];
        foreach ($dbPlayers as $p) {
            $nameLookup[$this->normalizePlayerName($p->name)][] = $p;
            if ($p->alternate_name) {
                $nameLookup[$this->normalizePlayerName($p->alternate_name)][] = $p;
            }
        }

        $updates = [];

        // Pass 1 — fantasy-relevant Fantrax positions only.
        foreach ($fantraxPlayers as $fp) {
            if ($fp['pos'] === 'DST') {
                $matched = $dstLookup[$fp['team']] ?? null;
                if ($matched && !isset($updates[$matched->id])) {
                    $updates[$matched->id] = $fp['id'];
                }
                continue;
            }

            $ourPos = $this->mapFantraxPosition($fp['pos']);
            if ($ourPos === null) {
                continue;
            }

            $candidates = $nameLookup[$this->normalizePlayerName($fp['name'])] ?? [];
            if ($candidates === []) {
                continue;
            }

            $matched = null;
            foreach ($candidates as $c) {
                if (in_array($ourPos, $c->positions ?? [], true)) {
                    $matched = $c;
                    break;
                }
            }

            if ($matched && !isset($updates[$matched->id])) {
                $updates[$matched->id] = $fp['id'];
            }
        }

        // Pass 2 — dual-threat defensive listings for still-unmatched skill players.
        static $dualThreat = ['CB', 'DB', 'S', 'SS', 'FS'];
        foreach ($fantraxPlayers as $fp) {
            if ($fp['pos'] === 'DST' || $this->mapFantraxPosition($fp['pos']) !== null) {
                continue;
            }
            if (!in_array(strtoupper($fp['pos']), $dualThreat, true)) {
                continue;
            }

            $candidates = $nameLookup[$this->normalizePlayerName($fp['name'])] ?? [];
            $candidates = array_values(array_filter(
                $candidates,
                fn ($c) => !isset($updates[$c->id])
            ));

            if (count($candidates) === 1) {
                $updates[$candidates[0]->id] = $fp['id'];
            }
        }

        return $updates;
    }

    /**
     * Build a lookup of franchise abbreviation (uppercased) → DST Player.
     * Includes primary/alternate franchise abbrs, franchise names, and the DST
     * player's name / alternate_name (so ETR rows like Team=LA can match).
     */
    private function buildDstFranchiseLookup(): array
    {
        $lookup = [];
        $dstPlayers = Player::query()
            ->whereJsonContains('positions', 'DST')
            ->with('irlFranchise')
            ->get();

        foreach ($dstPlayers as $p) {
            $f = $p->irlFranchise;
            if (!$f) {
                continue;
            }

            $aliases = [
                $f->abbreviated_name,
                $f->alternate_abbreviated_name,
                $f->name,
                $f->alternate_name,
                $p->name,
                $p->alternate_name,
            ];

            foreach ($aliases as $alias) {
                if ($alias === null || trim((string) $alias) === '') {
                    continue;
                }
                $lookup[strtoupper(trim((string) $alias))] = $p;
            }
        }

        return $lookup;
    }

    /**
     * Map a Fantrax position string to one of our PlayerPosition enum values.
     * Returns null for positions we don't track (OL, LB, CB, S, P, etc.).
     */
    private function mapFantraxPosition(string $pos): ?string
    {
        static $map = [
            'QB'   => 'QB',
            'RB'   => 'RB',
            'WR'   => 'WR',
            'TE'   => 'TE',
            'K'    => 'K',
            'DST'  => 'DST',
            'DEF'  => 'DST',
            'D/ST' => 'DST',
        ];
        return $map[strtoupper(trim($pos))] ?? null;
    }

    /**
     * List all players flagged as do-not-roster.
     */
    public function doNotRosterList(): JsonResponse
    {
        $players = Player::where('do_not_roster', true)
            ->with('irlFranchise')
            ->orderBy('name')
            ->get()
            ->map(fn ($p) => [
                'id'                  => $p->id,
                'name'                => $p->name,
                'positions'           => $p->positions ?? [],
                'irl_franchise_name'  => $p->irlFranchise?->name,
                'irl_franchise_abbr'  => $p->irlFranchise?->abbreviated_name,
                'bye_week'            => $p->irlFranchise?->bye_week,
            ]);

        return response()->json(['data' => $players]);
    }

    /**
     * Add players to the do-not-roster list by pasting names (one per line).
     */
    public function doNotRosterAdd(Request $request): JsonResponse
    {
        $request->validate([
            'data' => ['required', 'string', 'min:2'],
        ]);

        $lines = array_values(array_filter(
            array_map('trim', explode("\n", $request->input('data'))),
            fn ($l) => $l !== ''
        ));

        // Strip leading numbering like "1." or "2)"
        $lines = array_map(fn ($l) => preg_replace('/^\d+[\.\)]\s*/', '', $l), $lines);

        if (empty($lines)) {
            return response()->json(['message' => 'No data provided.'], 422);
        }

        $allPlayers = Player::all();
        $playerByName = [];
        foreach ($allPlayers as $p) {
            $playerByName[$this->normalizePlayerName($p->name)] = $p;
            if ($p->alternate_name) {
                $playerByName[$this->normalizePlayerName($p->alternate_name)] = $p;
            }
        }

        $updated = 0;
        $notFound = [];

        foreach ($lines as $idx => $name) {
            $normalized = $this->normalizePlayerName($name);
            $player = $playerByName[$normalized] ?? null;

            if (!$player) {
                $notFound[] = ['rank' => $idx + 1, 'name' => $name];
                continue;
            }

            if (!$player->do_not_roster) {
                $player->update(['do_not_roster' => true]);
            }
            $updated++;
        }

        return response()->json([
            'updated'     => $updated,
            'not_found'   => $notFound,
            'total_lines' => count($lines),
        ]);
    }

    /**
     * Remove a single player from the do-not-roster list.
     */
    public function doNotRosterRemove(Player $player): JsonResponse
    {
        $player->update(['do_not_roster' => false]);

        return response()->json(['success' => true]);
    }

    /**
     * Reset all players' do-not-roster flag to false.
     */
    public function doNotRosterReset(): JsonResponse
    {
        $count = Player::where('do_not_roster', true)->update(['do_not_roster' => false]);

        return response()->json(['cleared' => $count]);
    }

    /**
     * Get teams (my teams) that have do-not-roster players on their roster.
     */
    public function doNotRosterTeams(): JsonResponse
    {
        $dnrPlayerIds = Player::where('do_not_roster', true)->pluck('id')->toArray();

        if (empty($dnrPlayerIds)) {
            return response()->json(['data' => []]);
        }

        $myTeams = \App\Models\Team::where('my_team', true)
            ->with('league')
            ->get();

        $myTeamIds = $myTeams->pluck('id')->toArray();

        if (empty($myTeamIds)) {
            return response()->json(['data' => []]);
        }

        $slots = \App\Models\LineupSlot::whereIn('team_id', $myTeamIds)
            ->whereIn('player_id', $dnrPlayerIds)
            ->get();

        $teamIdsWithDnr = $slots->pluck('team_id')->unique()->toArray();

        $results = $myTeams
            ->filter(fn ($t) => in_array($t->id, $teamIdsWithDnr, true))
            ->map(fn ($t) => [
                'team_id'     => $t->id,
                'team_name'   => $t->name,
                'league_id'   => $t->league_id,
                'league_name' => $t->league?->name,
            ])
            ->values();

        return response()->json(['data' => $results]);
    }

    private function normalizeForMatch(string $value): string
    {
        return strtolower(preg_replace('/\s+/', '', $value));
    }

    /**
     * Normalize a player name for fuzzy matching:
     * strip suffixes (Jr, Sr, II–V), remove apostrophes/hyphens, collapse whitespace, lowercase.
     */
    private function normalizePlayerName(string $name): string
    {
        $n = preg_replace('/\b(Jr|Sr|II|III|IV|V)\.?\b/i', '', $name);
        $n = str_replace(["'", "\u{2019}", '-', '.'], '', $n);
        return strtolower(trim(preg_replace('/\s{2,}/', ' ', $n)));
    }
}
