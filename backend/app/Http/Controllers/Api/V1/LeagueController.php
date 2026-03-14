<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\LeagueStoreRequest;
use App\Http\Requests\Api\V1\LeagueUpdateRequest;
use App\Http\Resources\LeagueResource;
use App\Models\League;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class LeagueController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return LeagueResource::collection(League::query()->orderBy('id')->paginate(50));
    }

    public function store(LeagueStoreRequest $request): LeagueResource
    {
        $league = League::query()->create($request->validated());

        return new LeagueResource($league);
    }

    public function show(League $league): LeagueResource
    {
        return new LeagueResource($league);
    }

    public function update(LeagueUpdateRequest $request, League $league): LeagueResource
    {
        $league->update($request->validated());

        return new LeagueResource($league->fresh());
    }

    public function destroy(League $league): Response
    {
        $league->delete();

        return response()->noContent();
    }
}
