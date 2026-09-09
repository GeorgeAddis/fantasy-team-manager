<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IrlGame extends Model
{
    protected $fillable = [
        'season',
        'week',
        'kickoff_at',
        'away_irl_franchise_id',
        'home_irl_franchise_id',
        'espn_event_id',
    ];

    protected function casts(): array
    {
        return [
            'season' => 'integer',
            'week' => 'integer',
            'kickoff_at' => 'immutable_datetime',
        ];
    }

    public function awayFranchise(): BelongsTo
    {
        return $this->belongsTo(IrlFranchise::class, 'away_irl_franchise_id');
    }

    public function homeFranchise(): BelongsTo
    {
        return $this->belongsTo(IrlFranchise::class, 'home_irl_franchise_id');
    }
}
