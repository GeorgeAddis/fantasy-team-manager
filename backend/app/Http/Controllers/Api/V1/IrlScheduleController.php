<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\LineupPosition;
use App\Http\Controllers\Controller;
use App\Models\IrlGame;
use App\Models\LineupSlot;
use App\Models\Team;
use App\Support\FantraxWeeklyOpponents;
use App\Support\NflScheduleSync;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;
use Throwable;

class IrlScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $week = filter_var($request->query('week'), FILTER_VALIDATE_INT);
        if ($week === false || $week < NflScheduleSync::MIN_WEEK || $week > NflScheduleSync::MAX_WEEK) {
            return response()->json(['message' => 'Week must be between 1 and 17.'], 422);
        }

        $season = filter_var($request->query('season'), FILTER_VALIDATE_INT);
        if ($season === false) {
            $season = NflScheduleSync::currentSeasonYear();
        }

        $startersByFranchise = $this->startingPlayersByFranchise($week);

        $games = IrlGame::query()
            ->with(['awayFranchise', 'homeFranchise'])
            ->where('season', $season)
            ->where('week', $week)
            ->orderBy('kickoff_at')
            ->orderBy('id')
            ->get()
            ->map(fn (IrlGame $game) => $this->serialize($game, $startersByFranchise));

        return response()->json([
            'data' => $games,
            'week' => $week,
            'season' => $season,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $season = filter_var($request->input('season'), FILTER_VALIDATE_INT);
        if ($season === false) {
            $season = NflScheduleSync::currentSeasonYear();
        }

        try {
            $result = NflScheduleSync::sync($season);
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        } catch (Throwable $e) {
            return response()->json(['message' => 'Could not update the NFL schedule.'], 502);
        }

        return response()->json($result);
    }

    private function serialize(IrlGame $game, array $startersByFranchise = []): array
    {
        $kickoff = $game->kickoff_at?->utc();
        $bangkok = $kickoff?->timezone('Asia/Bangkok');

        return [
            'id' => $game->id,
            'season' => $game->season,
            'week' => $game->week,
            'kickoff_at' => $kickoff?->toIso8601String(),
            'day_label' => $bangkok?->format('l, j F'),
            'time_label' => $bangkok?->format('g:i A'),
            'away' => $this->franchisePayload($game->awayFranchise, $startersByFranchise),
            'home' => $this->franchisePayload($game->homeFranchise, $startersByFranchise),
        ];
    }

    private function franchisePayload($franchise, array $startersByFranchise = []): ?array
    {
        if (!$franchise) {
            return null;
        }

        return [
            'id' => $franchise->id,
            'name' => $franchise->name,
            'abbreviated_name' => $franchise->abbreviated_name,
            'starters' => $startersByFranchise[$franchise->id] ?? [],
        ];
    }

    /**
     * Starting players in my non-bestball leagues, grouped by IRL franchise.
     * `leagues` = I start them. `against` = my Fantrax H2H opponent starts them this week.
     *
     * @return array<int, list<array{id: int, name: string, positions: list<string>, leagues: list<array{id: int, name: string}>, against: list<array{id: int, name: string}>}>>
     */
    private function startingPlayersByFranchise(int $week): array
    {
        $opponentTeamIdByLeague = FantraxWeeklyOpponents::opponentTeamIdByLeague($week);
        $myTeamIds = Team::query()
            ->where('my_team', true)
            ->whereHas('league', fn ($q) => $q->where('bestball', false))
            ->pluck('id');
        $relevantTeamIds = $myTeamIds->merge(array_values($opponentTeamIdByLeague))->unique()->filter()->values();

        $slots = LineupSlot::query()
            ->where('lineup_position', '!=', LineupPosition::BN)
            ->whereNotNull('player_id')
            ->whereIn('team_id', $relevantTeamIds)
            ->with(['player', 'team.league'])
            ->get();

        $byFranchise = [];
        foreach ($slots as $slot) {
            $player = $slot->player;
            $franchiseId = $player?->irl_franchise_id;
            $league = $slot->team?->league;
            $isMine = (bool) $slot->team?->my_team;
            $isAgainst = ($opponentTeamIdByLeague[$league?->id] ?? null) === $slot->team_id;
            if ($player === null || $franchiseId === null || $league === null || (!$isMine && !$isAgainst)) {
                continue;
            }

            $byFranchise[$franchiseId][$player->id] ??= [
                'id' => $player->id,
                'name' => $player->name,
                'positions' => $player->positions ?? [],
                'leagues' => [],
                'against' => [],
            ];

            $leagueRow = ['id' => $league->id, 'name' => $league->name];
            if ($isMine) {
                $byFranchise[$franchiseId][$player->id]['leagues'][$league->id] = $leagueRow;
            } else {
                $byFranchise[$franchiseId][$player->id]['against'][$league->id] = $leagueRow;
            }
        }

        $posOrder = ['QB' => 0, 'RB' => 1, 'WR' => 2, 'TE' => 3, 'K' => 4, 'DST' => 5];
        foreach ($byFranchise as $franchiseId => $players) {
            $list = array_map(function (array $player) {
                $mine = array_values($player['leagues']);
                $against = array_values($player['against']);
                usort($mine, fn ($a, $b) => $b['id'] <=> $a['id']);
                usort($against, fn ($a, $b) => $b['id'] <=> $a['id']);
                $player['leagues'] = $mine;
                $player['against'] = $against;

                return $player;
            }, $players);
            $list = array_values($list);
            usort($list, function (array $a, array $b) use ($posOrder) {
                $posA = $posOrder[$a['positions'][0] ?? ''] ?? 99;
                $posB = $posOrder[$b['positions'][0] ?? ''] ?? 99;
                if ($posA !== $posB) {
                    return $posA <=> $posB;
                }

                return strcasecmp($a['name'], $b['name']);
            });
            $byFranchise[$franchiseId] = $list;
        }

        return $byFranchise;
    }
}
