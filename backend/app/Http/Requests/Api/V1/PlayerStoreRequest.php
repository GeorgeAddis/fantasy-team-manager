<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\PlayerPosition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PlayerStoreRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->merge([
            'week_rank' => $this->input('week_rank') === null || $this->input('week_rank') === '' ? 999 : $this->input('week_rank'),
            'week_position_rank' => $this->input('week_position_rank') === null || $this->input('week_position_rank') === '' ? 999 : $this->input('week_position_rank'),
            'season_rank' => $this->input('season_rank') === null || $this->input('season_rank') === '' ? 999 : $this->input('season_rank'),
            'season_position_rank' => $this->input('season_position_rank') === null || $this->input('season_position_rank') === '' ? 999 : $this->input('season_position_rank'),
        ]);
    }

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'alternate_name' => ['nullable', 'string', 'max:255'],
            'irl_franchise_id' => ['nullable', 'integer', Rule::exists('irl_franchises', 'id')],
            'week_rank' => ['nullable', 'integer', 'min:0'],
            'week_position_rank' => ['nullable', 'integer', 'min:0'],
            'season_rank' => ['nullable', 'integer', 'min:0'],
            'season_position_rank' => ['nullable', 'integer', 'min:0'],
            'positions' => ['required', 'array', 'min:1'],
            'positions.*' => ['required', 'string', Rule::enum(PlayerPosition::class)],
        ];
    }
}
