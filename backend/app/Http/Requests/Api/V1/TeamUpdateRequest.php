<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TeamUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'league_id' => ['sometimes', 'required', 'integer', Rule::exists('leagues', 'id')],
            'my_team' => ['sometimes', 'required', 'boolean'],
        ];
    }
}
