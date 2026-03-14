<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\IrlFranchise */
class IrlFranchiseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'abbreviated_name' => $this->abbreviated_name,
            'alternate_name' => $this->alternate_name,
            'alternate_abbreviated_name' => $this->alternate_abbreviated_name,
            'bye_week' => $this->bye_week,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
