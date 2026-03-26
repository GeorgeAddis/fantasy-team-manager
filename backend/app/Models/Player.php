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
        'irl_franchise_id',
        'week_rank',
        'week_position_rank',
        'season_rank',
        'season_position_rank',
        'positions',
    ];

    protected function casts(): array
    {
        return [
            'positions' => 'array',
            'week_rank' => 'integer',
            'week_position_rank' => 'integer',
            'season_rank' => 'integer',
            'season_position_rank' => 'integer',
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
