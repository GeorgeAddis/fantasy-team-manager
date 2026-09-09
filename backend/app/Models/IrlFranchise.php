<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IrlFranchise extends Model
{
    protected $table = 'irl_franchises';

    protected $fillable = [
        'name',
        'abbreviated_name',
        'alternate_name',
        'alternate_abbreviated_name',
        'bye_week',
    ];

    public function players(): HasMany
    {
        return $this->hasMany(Player::class);
    }

    public function defenseWeekRanks(): HasMany
    {
        return $this->hasMany(DefenseWeekRank::class);
    }

    public function homeGames(): HasMany
    {
        return $this->hasMany(IrlGame::class, 'home_irl_franchise_id');
    }

    public function awayGames(): HasMany
    {
        return $this->hasMany(IrlGame::class, 'away_irl_franchise_id');
    }
}
