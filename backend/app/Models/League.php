<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class League extends Model
{
    protected $fillable = ['name'];

    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }
}
