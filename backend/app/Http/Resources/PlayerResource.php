<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Player */
class PlayerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'alternate_name' => $this->alternate_name,
            'fantrax_id' => $this->fantrax_id,
            'irl_franchise_id' => $this->irl_franchise_id,
            'irl_franchise_name' => $this->whenLoaded('irlFranchise', fn () => $this->irlFranchise?->name),
            'irl_franchise_abbr' => $this->whenLoaded('irlFranchise', fn () => $this->irlFranchise?->abbreviated_name),
            'week_rank' => $this->week_rank,
            'week_position_rank' => $this->week_position_rank,
            'week_rank_non_ppr' => $this->week_rank_non_ppr,
            'week_position_rank_non_ppr' => $this->week_position_rank_non_ppr,
            'season_rank' => $this->season_rank,
            'season_position_rank' => $this->season_position_rank,
            'season_rank_non_ppr' => $this->season_rank_non_ppr,
            'season_position_rank_non_ppr' => $this->season_position_rank_non_ppr,
            'waiver_rank' => $this->waiver_rank,
            'waiver_rank_overall' => $this->waiver_rank_overall,
            'waiver_rank_non_ppr' => $this->waiver_rank_non_ppr,
            'waiver_rank_overall_non_ppr' => $this->waiver_rank_overall_non_ppr,
            'do_not_roster' => $this->do_not_roster,
            'positions' => $this->positions ?? [],
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
