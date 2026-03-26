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

        $handle = fopen($request->file('file')->getRealPath(), 'r');
        if (!$handle) {
            return response()->json(['message' => 'Unable to read the file.'], 422);
        }

        $header = fgetcsv($handle);
        if (!$header) {
            fclose($handle);
            return response()->json(['message' => 'CSV file is empty.'], 422);
        }

        $header = array_map(fn ($h) => strtolower(trim($h)), $header);

        $playerCol = array_search('player', $header);
        $teamCol = array_search('team', $header);
        $posCol = array_search('position', $header);

        if ($playerCol === false || $teamCol === false || $posCol === false) {
            fclose($handle);
            return response()->json([
                'message' => 'CSV must have "Player", "Team", and "Position" column headers in the first row.',
            ], 422);
        }

        $franchises = IrlFranchise::all();

        $abbrLookup = [];
        foreach ($franchises as $f) {
            $abbrLookup[strtoupper($f->abbreviated_name)] = $f->id;
            if ($f->alternate_abbreviated_name) {
                $abbrLookup[strtoupper($f->alternate_abbreviated_name)] = $f->id;
            }
        }

        $nameLookup = [];
        foreach ($franchises as $f) {
            $nameLookup[$this->normalizeForMatch($f->name)] = $f->id;
            $nameLookup[$this->normalizeForMatch($f->abbreviated_name)] = $f->id;
            if ($f->alternate_name) {
                $nameLookup[$this->normalizeForMatch($f->alternate_name)] = $f->id;
            }
            if ($f->alternate_abbreviated_name) {
                $nameLookup[$this->normalizeForMatch($f->alternate_abbreviated_name)] = $f->id;
            }
        }

        $validPositions = array_map(fn ($p) => $p->value, PlayerPosition::cases());

        $rows = [];
        $skipped = 0;
        $failedRows = [];
        $now = now();
        $rowNumber = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;
            $name = trim($row[$playerCol] ?? '');
            $teamRaw = strtoupper(trim($row[$teamCol] ?? ''));
            $posRaw = strtoupper(trim($row[$posCol] ?? ''));

            $positions = array_unique(array_filter(
                array_map('trim', preg_split('/[\/,]/', $posRaw)),
                fn ($p) => in_array($p, $validPositions, true)
            ));

            if ($name === '' || empty($positions)) {
                $skipped++;
                if (count($failedRows) < 200) {
                    $failedRows[] = [
                        'row' => $rowNumber,
                        'name' => $name,
                        'team' => $teamRaw,
                        'position' => $posRaw,
                        'reason' => $name === '' ? 'missing_name' : 'invalid_position',
                    ];
                }
                continue;
            }

            $teamParts = explode('/', $teamRaw);
            $teamAbbr = trim(end($teamParts));
            $franchiseId = $abbrLookup[$teamAbbr] ?? null;

            if ($franchiseId === null && in_array('DST', $positions, true)) {
                $normalized = $this->normalizeForMatch($name);
                $franchiseId = $nameLookup[$normalized] ?? null;
            }

            $rows[] = [
                'name' => $name,
                'irl_franchise_id' => $franchiseId,
                'positions' => json_encode(array_values($positions)),
                'week_rank' => 999,
                'week_position_rank' => 999,
                'season_rank' => 999,
                'season_position_rank' => 999,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        fclose($handle);

        if (empty($rows)) {
            return response()->json(['message' => 'No valid player rows found in CSV.'], 422);
        }

        $cleared = 0;
        if ($request->boolean('clear_existing')) {
            $cleared = Player::query()->count();
            Player::query()->delete();
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
