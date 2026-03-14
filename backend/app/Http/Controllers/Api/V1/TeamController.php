<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\TeamStoreRequest;
use App\Http\Requests\Api\V1\TeamUpdateRequest;
use App\Http\Resources\TeamResource;
use App\Models\Team;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class TeamController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return TeamResource::collection(Team::query()->with('league')->orderBy('id')->paginate(50));
    }

    public function store(TeamStoreRequest $request): TeamResource
    {
        $team = Team::query()->create($request->validated());

        return new TeamResource($team);
    }

    public function show(Team $team): TeamResource
    {
        return new TeamResource($team->load('league'));
    }

    public function update(TeamUpdateRequest $request, Team $team): TeamResource
    {
        $team->update($request->validated());

        return new TeamResource($team->fresh()->load('league'));
    }

    public function destroy(Team $team): Response
    {
        $team->delete();

        return response()->noContent();
    }
}
