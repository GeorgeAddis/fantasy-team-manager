<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LineupSlotStoreRequest;
use App\Http\Requests\Api\V1\LineupSlotUpdateRequest;
use App\Http\Resources\LineupSlotResource;
use App\Models\LineupSlot;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class LineupSlotController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return LineupSlotResource::collection(
            LineupSlot::query()->with(['team', 'player'])->orderBy('id')->paginate(100)
        );
    }

    public function store(LineupSlotStoreRequest $request): LineupSlotResource
    {
        $slot = LineupSlot::query()->create($request->validated());

        return new LineupSlotResource($slot->load(['team', 'player']));
    }

    public function show(LineupSlot $lineupSlot): LineupSlotResource
    {
        return new LineupSlotResource($lineupSlot->load(['team', 'player']));
    }

    public function update(LineupSlotUpdateRequest $request, LineupSlot $lineupSlot): LineupSlotResource
    {
        $lineupSlot->update($request->validated());

        return new LineupSlotResource($lineupSlot->fresh()->load(['team', 'player']));
    }

    public function destroy(LineupSlot $lineupSlot): Response
    {
        $lineupSlot->delete();

        return response()->noContent();
    }
}
