<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\LineupPosition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LineupSlotUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'team_id' => ['sometimes', 'required', 'integer', Rule::exists('teams', 'id')],
            'player_id' => ['nullable', 'integer', Rule::exists('players', 'id')],
            'lineup_position' => ['sometimes', 'required', Rule::enum(LineupPosition::class)],
        ];
    }
}
