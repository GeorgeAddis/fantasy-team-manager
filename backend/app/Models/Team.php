<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Team extends Model
{
    protected $fillable = ['name', 'league_id', 'my_team'];

    protected function casts(): array
    {
        return [
            'my_team' => 'boolean',
        ];
    }

    public function league(): BelongsTo
    {
        return $this->belongsTo(League::class);
    }

    public function lineupSlots(): HasMany
    {
        return $this->hasMany(LineupSlot::class);
    }
}
