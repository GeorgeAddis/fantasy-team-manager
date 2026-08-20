<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TeamStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'fantrax_id' => ['nullable', 'string', 'max:255'],
            'league_id' => ['required', 'integer', Rule::exists('leagues', 'id')],
            'my_team' => ['required', 'boolean'],
        ];
    }
}
