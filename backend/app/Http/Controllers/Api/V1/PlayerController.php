<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\PlayerPosition;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PlayerStoreRequest;
use App\Http\Requests\Api\V1\PlayerUpdateRequest;
use App\Http\Resources\PlayerResource;
use App\Models\IrlFranchise;
use App\Models\Player;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
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

        return response()->json([
            'imported' => count($rows),
            'skipped' => $skipped,
            'cleared' => $cleared,
            'failed_rows' => $failedRows,
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
                'season_rank'         => 999,
                'season_position_rank' => 999,
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
        ]);

        $type = $request->input('type');
        $period = $request->input('period');
        $isRwt = $type === 'RWT';

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
            $cols = preg_split('/\t/', $line);
            $rank = (int) trim($cols[0] ?? '');
            $rawPlayer = trim($cols[1] ?? '');

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
                $posRaw = trim($cols[3] ?? '');
                $posRank = null;
                if (preg_match('/^(RB|WR|TE)(\d+)$/i', $posRaw, $m)) {
                    $posRank = (int) $m[2];
                }

                $fields = $period === 'week'
                    ? ['week_rank' => $rank, 'week_position_rank' => $posRank ?? 999]
                    : ['season_rank' => $rank, 'season_position_rank' => $posRank ?? 999];
            } else {
                $fields = $period === 'week'
                    ? ['week_position_rank' => $rank]
                    : ['season_position_rank' => $rank];
            }

            $player->update($fields);
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
        $response = Http::timeout(30)->get('https://www.fantrax.com/fxea/general/getPlayerIds', [
            'sport' => 'NFL',
        ]);

        if (!$response->successful()) {
            return response()->json([
                'message' => 'Failed to fetch data from the Fantrax API (HTTP ' . $response->status() . ').',
            ], 502);
        }

        $fantraxPlayers = $this->parseFantraxPlayers($response->json() ?? []);

        if (empty($fantraxPlayers)) {
            return response()->json([
                'message' => 'No player data was returned by the Fantrax API. The response format may have changed.',
            ], 422);
        }

        $dbPlayers  = Player::query()->select(['id', 'name', 'alternate_name', 'positions'])->get();
        $dstLookup  = $this->buildDstFranchiseLookup();
        $updates    = $this->matchFantraxIds($dbPlayers, $dstLookup, $fantraxPlayers);

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

        return response()->json([
            'updated'         => count($updates),
            'unmatched_count' => count($unmatched),
            'unmatched'       => array_slice($unmatched, 0, 200),
        ]);
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

            // Skip positions we will never have in our DB.
            if ($this->mapFantraxPosition($pos) === null) {
                continue;
            }

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
        foreach ($fantraxPlayers as $fp) {
            // DST — match by franchise abbreviation.
            if ($fp['pos'] === 'DST') {
                $matched = $dstLookup[$fp['team']] ?? null;
                if ($matched && !isset($updates[$matched->id])) {
                    $updates[$matched->id] = $fp['id'];
                }
                continue;
            }

            // Skill positions — match by name, use position to disambiguate.
            $candidates = $nameLookup[$this->normalizePlayerName($fp['name'])] ?? [];
            if (empty($candidates)) {
                continue;
            }

            $matched = null;
            if (count($candidates) === 1) {
                $matched = $candidates[0];
            } else {
                $ourPos = $this->mapFantraxPosition($fp['pos']);
                foreach ($candidates as $c) {
                    if ($ourPos && in_array($ourPos, $c->positions ?? [], true)) {
                        $matched = $c;
                        break;
                    }
                }
            }

            if ($matched && !isset($updates[$matched->id])) {
                $updates[$matched->id] = $fp['id'];
            }
        }

        return $updates;
    }

    /**
     * Build a lookup of franchise abbreviation (uppercased) → DST Player.
     * Includes both primary and alternate abbreviated names.
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
            $lookup[strtoupper($f->abbreviated_name)] = $p;
            if ($f->alternate_abbreviated_name) {
                $lookup[strtoupper($f->alternate_abbreviated_name)] = $p;
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
