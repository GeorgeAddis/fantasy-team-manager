<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class LeagueImportFantraxRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'       => ['required', 'string', 'max:255'],
            'fantrax_id' => ['required', 'string', 'max:255'],
            'ppr'        => ['sometimes', 'boolean'],
        ];
    }
}
