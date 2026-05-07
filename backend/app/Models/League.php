<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class League extends Model
{
    protected $fillable = ['name', 'fantrax_id', 'teams_updated_at', 'requires_waiver_claim', 'requires_roster_moves', 'requires_roster_optimised', 'requires_thursday_update'];

    protected function casts(): array
    {
        return [
            'teams_updated_at' => 'datetime',
            'requires_waiver_claim' => 'boolean',
            'requires_roster_moves' => 'boolean',
            'requires_roster_optimised' => 'boolean',
            'requires_thursday_update' => 'boolean',
        ];
    }

    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }
}
