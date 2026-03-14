<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\PlayerStoreRequest;
use App\Http\Requests\Api\V1\PlayerUpdateRequest;
use App\Http\Resources\PlayerResource;
use App\Models\Player;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class PlayerController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return PlayerResource::collection(
            Player::query()->with('irlFranchise')->orderBy('id')->paginate(100)
        );
    }

    public function store(PlayerStoreRequest $request): PlayerResource
    {
        $player = Player::query()->create($request->validated());

        return new PlayerResource($player);
    }

    public function show(Player $player): PlayerResource
    {
        return new PlayerResource($player->load('irlFranchise'));
    }

    public function update(PlayerUpdateRequest $request, Player $player): PlayerResource
    {
        $player->update($request->validated());

        return new PlayerResource($player->fresh()->load('irlFranchise'));
    }

    public function destroy(Player $player): Response
    {
        $player->delete();

        return response()->noContent();
    }
}
