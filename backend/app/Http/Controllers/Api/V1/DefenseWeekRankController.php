<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\DefenseWeekRankUpdateRequest;
use App\Models\DefenseWeekRank;
use App\Models\LineupSlot;
use App\Models\Player;
use App\Models\Team;
use App\Support\DefenseNameLookup;
use App\Support\RankingFields;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DefenseWeekRankController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $week = filter_var($request->query('week'), FILTER_VALIDATE_INT);
        if ($week === false || $week < 1 || $week > 17) {
            return response()->json(['message' => 'Week must be between 1 and 17.'], 422);
        }

        $rows = DefenseWeekRank::query()
            ->with('irlFranchise')
            ->where('week', $week)
            ->orderBy('rank')
            ->orderBy('id')
            ->get()
            ->map(fn (DefenseWeekRank $row) => [
                'id' => $row->id,
                'week' => $row->week,
                'rank' => $row->rank,
                'irl_franchise_id' => $row->irl_franchise_id,
                'name' => $row->irlFranchise?->name,
                'abbreviated_name' => $row->irlFranchise?->abbreviated_name,
            ]);

        return response()->json(['data' => $rows]);
    }

    /**
     * Replace all weekly defense ranks for a week. Line order is rank.
     */
    public function update(DefenseWeekRankUpdateRequest $request): JsonResponse
    {
        $week = (int) $request->validated('week');
        $lines = array_values(array_filter(
            array_map(
                fn (string $line) => trim(preg_replace('/^\d+[\.\)]\s*/', '', trim($line)) ?? ''),
                explode("\n", $request->validated('data'))
            ),
            fn (string $line) => $line !== ''
        ));

        if ($lines === []) {
            return response()->json(['message' => 'No data provided.'], 422);
        }

        $lookup = DefenseNameLookup::build();
        $matched = [];
        $seen = [];
        $notFound = [];
        $rank = 0;

        foreach ($lines as $idx => $name) {
            $franchise = DefenseNameLookup::find($name, $lookup);
            if (!$franchise) {
                $notFound[] = ['rank' => $idx + 1, 'name' => $name];
                continue;
            }
            if (isset($seen[$franchise->id])) {
                continue;
            }
            $seen[$franchise->id] = true;
            $rank++;
            $matched[] = [
                'irl_franchise_id' => $franchise->id,
                'week' => $week,
                'rank' => $rank,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        DB::transaction(function () use ($week, $matched) {
            DefenseWeekRank::query()->where('week', $week)->delete();
            if ($matched !== []) {
                DefenseWeekRank::query()->insert($matched);
            }
        });

        return response()->json([
            'updated' => count($matched),
            'not_found' => $notFound,
            'total_lines' => count($lines),
            'week' => $week,
        ]);
    }

    /**
     * Best weekly defense on each of my non-bestball teams.
     * Falls back to the roster's best season-ranked DST when a week has no rank.
     */
    public function management(): JsonResponse
    {
        $ranksByWeek = [];
        foreach (DefenseWeekRank::query()->with('irlFranchise')->get() as $row) {
            $ranksByWeek[$row->week][$row->irl_franchise_id] = [
                'rank' => $row->rank,
                'abbr' => $row->irlFranchise?->abbreviated_name,
            ];
        }

        $teams = Team::query()
            ->where('my_team', true)
            ->whereHas('league', fn ($q) => $q->where('bestball', false))
            ->with(['league.teams', 'lineupSlots.player.irlFranchise'])
            ->get()
            ->sortBy(fn (Team $team) => mb_strtolower($team->league?->name ?? '').'|'.mb_strtolower($team->name))
            ->values();

        $teamLeagueId = [];
        $leagueTeamIds = [];
        foreach ($teams as $team) {
            foreach ($team->league?->teams ?? [] as $leagueTeam) {
                $teamLeagueId[$leagueTeam->id] = $team->league_id;
                $leagueTeamIds[] = $leagueTeam->id;
            }
        }
        $leagueTeamIds = array_values(array_unique($leagueTeamIds));

        $rosteredByLeague = [];
        if ($leagueTeamIds !== []) {
            foreach (LineupSlot::query()->whereIn('team_id', $leagueTeamIds)->whereNotNull('player_id')->get(['team_id', 'player_id']) as $slot) {
                $lid = $teamLeagueId[$slot->team_id] ?? null;
                if ($lid === null) {
                    continue;
                }
                $rosteredByLeague[$lid][$slot->player_id] = true;
            }
        }

        $allDsts = Player::query()
            ->whereJsonContains('positions', 'DST')
            ->with('irlFranchise')
            ->get();

        $data = $teams->map(function (Team $team) use ($ranksByWeek, $rosteredByLeague, $allDsts) {
            $league = $team->league;
            $seasonCol = RankingFields::column('season_position_rank', $league);

            $defenses = $team->lineupSlots
                ->filter(fn ($slot) => $slot->player !== null && in_array('DST', $slot->player->positions ?? [], true))
                ->map(fn ($slot) => $slot->player)
                ->unique('id')
                ->values();

            $fallbackAbbr = null;
            $bestSeason = null;
            foreach ($defenses as $player) {
                $raw = $player->{$seasonCol} ?? null;
                $seasonRank = is_numeric($raw) ? (int) $raw : null;
                $abbr = $player->irlFranchise?->abbreviated_name;
                if ($seasonRank !== null && $seasonRank > 0 && $seasonRank < 999) {
                    if ($bestSeason === null || $seasonRank < $bestSeason) {
                        $bestSeason = $seasonRank;
                        $fallbackAbbr = $abbr;
                    }
                }
            }
            if ($fallbackAbbr === null) {
                $fallbackAbbr = $defenses->first()?->irlFranchise?->abbreviated_name;
            }

            $rosteredIds = $rosteredByLeague[$league?->id] ?? [];

            $weeks = [];
            for ($week = 1; $week <= 17; $week++) {
                $best = null;
                foreach ($defenses as $player) {
                    $fid = $player->irl_franchise_id;
                    if ($fid === null) {
                        continue;
                    }
                    $entry = $ranksByWeek[$week][$fid] ?? null;
                    if ($entry === null) {
                        continue;
                    }
                    if ($best === null || $entry['rank'] < $best['rank']) {
                        $best = [
                            'rank' => $entry['rank'],
                            'abbr' => $entry['abbr'] ?? $player->irlFranchise?->abbreviated_name,
                        ];
                    }
                }

                $bestFa = null;
                foreach ($allDsts as $dst) {
                    if (isset($rosteredIds[$dst->id])) {
                        continue;
                    }
                    $fid = $dst->irl_franchise_id;
                    if ($fid === null) {
                        continue;
                    }
                    $entry = $ranksByWeek[$week][$fid] ?? null;
                    if ($entry === null) {
                        continue;
                    }
                    if ($bestFa === null || $entry['rank'] < $bestFa['rank']) {
                        $bestFa = [
                            'rank' => $entry['rank'],
                            'abbr' => $entry['abbr'] ?? $dst->irlFranchise?->abbreviated_name,
                        ];
                    }
                }

                $weeks[] = [
                    'week' => $week,
                    'rank' => $best['rank'] ?? null,
                    'abbr' => $best['abbr'] ?? $fallbackAbbr,
                    'unranked' => $best === null,
                    'fa_rank' => $bestFa['rank'] ?? null,
                    'fa_abbr' => $bestFa['abbr'] ?? null,
                ];
            }

            return [
                'team_id' => $team->id,
                'team_name' => $team->name,
                'league_id' => $league?->id,
                'league_name' => $league?->name,
                'weeks' => $weeks,
            ];
        });

        return response()->json(['data' => $data]);
    }
}
