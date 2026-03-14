<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class IrlFranchiseUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'abbreviated_name' => ['sometimes', 'required', 'string', 'max:32'],
            'alternate_name' => ['nullable', 'string', 'max:255'],
            'alternate_abbreviated_name' => ['nullable', 'string', 'max:32'],
            'bye_week' => ['nullable', 'integer', 'min:1', 'max:18'],
        ];
    }
}
