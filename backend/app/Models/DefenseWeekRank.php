<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DefenseWeekRank extends Model
{
    protected $fillable = [
        'irl_franchise_id',
        'week',
        'rank',
    ];

    protected function casts(): array
    {
        return [
            'week' => 'integer',
            'rank' => 'integer',
        ];
    }

    public function irlFranchise(): BelongsTo
    {
        return $this->belongsTo(IrlFranchise::class);
    }
}
