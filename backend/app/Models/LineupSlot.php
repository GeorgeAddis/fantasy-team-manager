<?php

namespace App\Models;

use App\Enums\LineupPosition;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LineupSlot extends Model
{
    protected $fillable = ['team_id', 'player_id', 'lineup_position'];

    protected function casts(): array
    {
        return [
            'lineup_position' => LineupPosition::class,
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function player(): BelongsTo
    {
        return $this->belongsTo(Player::class);
    }
}
