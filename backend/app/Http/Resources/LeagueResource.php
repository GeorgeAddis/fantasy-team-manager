<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\League */
class LeagueResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'fantrax_id' => $this->fantrax_id,
            'teams' => $this->whenLoaded('teams', function () {
                return $this->teams
                    ->sortBy('id')
                    ->values()
                    ->map(fn ($team) => [
                        'id' => $team->id,
                        'name' => $team->name,
                        'league_id' => $team->league_id,
                        'my_team' => $team->my_team,
                    ]);
            }),
            'requires_waiver_claim' => $this->requires_waiver_claim,
            'requires_roster_moves' => $this->requires_roster_moves,
            'requires_roster_optimised' => $this->requires_roster_optimised,
            'requires_thursday_update' => $this->requires_thursday_update,
            'requires_pre_season_optimised' => $this->requires_pre_season_optimised,
            'teams_updated_at' => $this->teams_updated_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
