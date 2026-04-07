<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\PlayerPosition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PlayerUpdateRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $payload = [];

        if ($this->exists('week_rank') && ($this->input('week_rank') === null || $this->input('week_rank') === '')) {
            $payload['week_rank'] = 999;
        }

        if ($this->exists('week_position_rank') && ($this->input('week_position_rank') === null || $this->input('week_position_rank') === '')) {
            $payload['week_position_rank'] = 999;
        }

        if ($this->exists('season_rank') && ($this->input('season_rank') === null || $this->input('season_rank') === '')) {
            $payload['season_rank'] = 999;
        }

        if ($this->exists('season_position_rank') && ($this->input('season_position_rank') === null || $this->input('season_position_rank') === '')) {
            $payload['season_position_rank'] = 999;
        }

        if (!empty($payload)) {
            $this->merge($payload);
        }
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'alternate_name' => ['nullable', 'string', 'max:255'],
            'fantrax_id' => ['nullable', 'string', 'max:255'],
            'irl_franchise_id' => ['nullable', 'integer', Rule::exists('irl_franchises', 'id')],
            'week_rank' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'week_position_rank' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'season_rank' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'season_position_rank' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'positions' => ['sometimes', 'required', 'array', 'min:1'],
            'positions.*' => ['required', 'string', Rule::enum(PlayerPosition::class)],
        ];
    }
}
