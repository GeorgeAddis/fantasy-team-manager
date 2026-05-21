<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class LeagueUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'                  => ['sometimes', 'required', 'string', 'max:255'],
            'fantrax_id'            => ['nullable', 'string', 'max:255'],
            'requires_waiver_claim' => ['sometimes', 'boolean'],
            'requires_roster_moves'     => ['sometimes', 'boolean'],
            'requires_roster_optimised' => ['sometimes', 'boolean'],
            'requires_thursday_update' => ['sometimes', 'boolean'],
            'requires_pre_season_optimised' => ['sometimes', 'boolean'],
        ];
    }
}
