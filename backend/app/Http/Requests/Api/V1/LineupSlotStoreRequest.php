<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\LineupPosition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LineupSlotStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'team_id' => ['required', 'integer', Rule::exists('teams', 'id')],
            'player_id' => ['nullable', 'integer', Rule::exists('players', 'id')],
            'lineup_position' => ['required', Rule::enum(LineupPosition::class)],
        ];
    }
}
