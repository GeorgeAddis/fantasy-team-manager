<?php

namespace App\Models;

use App\Enums\PlayerPosition;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Player extends Model
{
    protected $fillable = [
        'name',
        'irl_franchise_id',
        'week_rank',
        'season_rank',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'position' => PlayerPosition::class,
            'week_rank' => 'integer',
            'season_rank' => 'integer',
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
