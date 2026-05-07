<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\GlobalSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GlobalSettingController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = GlobalSetting::all()->pluck('value', 'key');

        return response()->json(['data' => $settings]);
    }

    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'key'   => ['required', 'string'],
            'value' => ['required'],
        ]);

        $key = $request->input('key');
        $value = $request->input('value');

        if ($key === 'current_week') {
            $week = filter_var($value, FILTER_VALIDATE_INT);
            if ($week === false || $week < 0 || $week > 17) {
                return response()->json(['message' => 'Current week must be between 0 and 17.'], 422);
            }
        }

        GlobalSetting::setValue($key, $value);

        return response()->json(['data' => [$key => (string) $value]]);
    }
}
