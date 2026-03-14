<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\IrlFranchiseStoreRequest;
use App\Http\Requests\Api\V1\IrlFranchiseUpdateRequest;
use App\Http\Resources\IrlFranchiseResource;
use App\Models\IrlFranchise;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class IrlFranchiseController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return IrlFranchiseResource::collection(
            IrlFranchise::query()->orderBy('name')->paginate(100)
        );
    }

    public function store(IrlFranchiseStoreRequest $request): IrlFranchiseResource
    {
        $franchise = IrlFranchise::query()->create($request->validated());

        return new IrlFranchiseResource($franchise);
    }

    public function show(IrlFranchise $irlFranchise): IrlFranchiseResource
    {
        return new IrlFranchiseResource($irlFranchise);
    }

    public function update(IrlFranchiseUpdateRequest $request, IrlFranchise $irlFranchise): IrlFranchiseResource
    {
        $irlFranchise->update($request->validated());

        return new IrlFranchiseResource($irlFranchise->fresh());
    }

    public function destroy(IrlFranchise $irlFranchise): Response
    {
        $irlFranchise->delete();

        return response()->noContent();
    }
}
