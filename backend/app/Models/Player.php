<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Player extends Model
{
    protected $fillable = [
        'name',
        'alternate_name',
        'fantrax_id',
        'irl_franchise_id',
        'week_rank',
        'week_position_rank',
        'week_rank_non_ppr',
        'week_position_rank_non_ppr',
        'season_rank',
        'season_position_rank',
        'season_rank_non_ppr',
        'season_position_rank_non_ppr',
        'positions',
        'waiver_rank',
        'waiver_rank_overall',
        'waiver_rank_non_ppr',
        'waiver_rank_overall_non_ppr',
        'do_not_roster',
    ];

    protected function casts(): array
    {
        return [
            'positions' => 'array',
            'week_rank' => 'integer',
            'week_position_rank' => 'integer',
            'week_rank_non_ppr' => 'integer',
            'week_position_rank_non_ppr' => 'integer',
            'season_rank' => 'integer',
            'season_position_rank' => 'integer',
            'season_rank_non_ppr' => 'integer',
            'season_position_rank_non_ppr' => 'integer',
            'waiver_rank' => 'integer',
            'waiver_rank_overall' => 'integer',
            'waiver_rank_non_ppr' => 'integer',
            'waiver_rank_overall_non_ppr' => 'integer',
            'do_not_roster' => 'boolean',
        ];
    }

    public function irlFranchise(): BelongsTo
    {
        return $this->belongsTo(IrlFranchise::class);
    }

    public function lineupSlots(): HasMany
    {
        return $this->hasMany(LineupSlot::class);
    }
}
