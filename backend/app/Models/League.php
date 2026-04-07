<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class League extends Model
{
    protected $fillable = ['name', 'fantrax_id', 'teams_updated_at'];

    protected function casts(): array
    {
        return [
            'teams_updated_at' => 'datetime',
        ];
    }

    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }
}
