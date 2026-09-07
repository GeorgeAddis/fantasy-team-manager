<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class DefenseWeekRankUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'week' => ['required', 'integer', 'min:1', 'max:17'],
            'data' => ['required', 'string', 'min:1'],
        ];
    }
}
