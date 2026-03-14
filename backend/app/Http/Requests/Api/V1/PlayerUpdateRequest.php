<?php

namespace App\Http\Requests\Api\V1;

use App\Enums\PlayerPosition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PlayerUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'irl_franchise_id' => ['nullable', 'integer', Rule::exists('irl_franchises', 'id')],
            'week_rank' => ['sometimes', 'required', 'integer', 'min:0'],
            'season_rank' => ['sometimes', 'required', 'integer', 'min:0'],
            'position' => ['sometimes', 'required', Rule::enum(PlayerPosition::class)],
        ];
    }
}
