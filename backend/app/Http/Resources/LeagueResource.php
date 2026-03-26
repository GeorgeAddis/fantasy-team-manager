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
            'teams_updated_at' => $this->teams_updated_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
