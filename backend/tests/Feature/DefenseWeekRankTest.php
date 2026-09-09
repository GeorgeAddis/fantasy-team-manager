<?php

namespace Tests\Feature;

use App\Models\DefenseWeekRank;
use App\Models\IrlFranchise;
use App\Models\Player;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DefenseWeekRankTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_replaces_week_ranks_from_name_order(): void
    {
        $pit = IrlFranchise::query()->create([
            'name' => 'Pittsburgh Steelers',
            'abbreviated_name' => 'PIT',
        ]);
        $sf = IrlFranchise::query()->create([
            'name' => 'San Francisco 49ers',
            'abbreviated_name' => 'SF',
            'alternate_abbreviated_name' => 'SFO',
        ]);
        $lar = IrlFranchise::query()->create([
            'name' => 'Los Angeles Rams',
            'abbreviated_name' => 'LAR',
        ]);

        $response = $this->putJson('/api/v1/defense-week-ranks', [
            'week' => 3,
            'data' => "Unknown Team\nPIT\nSan Francisco\nRams DST\n",
        ]);

        $response->assertOk()
            ->assertJsonPath('updated', 3)
            ->assertJsonPath('total_lines', 4)
            ->assertJsonPath('week', 3)
            ->assertJsonPath('not_found.0.name', 'Unknown Team');

        $this->assertDatabaseCount('defense_week_ranks', 3);
        $this->assertDatabaseHas('defense_week_ranks', [
            'irl_franchise_id' => $pit->id,
            'week' => 3,
            'rank' => 1,
        ]);
        $this->assertDatabaseHas('defense_week_ranks', [
            'irl_franchise_id' => $sf->id,
            'week' => 3,
            'rank' => 2,
        ]);
        $this->assertDatabaseHas('defense_week_ranks', [
            'irl_franchise_id' => $lar->id,
            'week' => 3,
            'rank' => 3,
        ]);

        $this->putJson('/api/v1/defense-week-ranks', [
            'week' => 3,
            'data' => "LAR\nPIT",
        ])->assertOk()->assertJsonPath('updated', 2);

        $this->assertDatabaseCount('defense_week_ranks', 2);
        $this->assertDatabaseHas('defense_week_ranks', [
            'irl_franchise_id' => $lar->id,
            'week' => 3,
            'rank' => 1,
        ]);
        $this->assertDatabaseMissing('defense_week_ranks', [
            'irl_franchise_id' => $sf->id,
            'week' => 3,
        ]);

        $this->getJson('/api/v1/defense-week-ranks?week=3')
            ->assertOk()
            ->assertJsonPath('data.0.rank', 1)
            ->assertJsonPath('data.0.abbreviated_name', 'LAR')
            ->assertJsonPath('data.1.abbreviated_name', 'PIT');
    }

    public function test_it_copies_dst_week_position_ranks(): void
    {
        $jax = IrlFranchise::query()->create([
            'name' => 'Jacksonville Jaguars',
            'abbreviated_name' => 'JAX',
        ]);
        $lac = IrlFranchise::query()->create([
            'name' => 'Los Angeles Chargers',
            'abbreviated_name' => 'LAC',
        ]);

        Player::query()->create([
            'name' => 'Jacksonville',
            'irl_franchise_id' => $jax->id,
            'positions' => ['DST'],
            'week_position_rank' => 1,
        ]);
        Player::query()->create([
            'name' => 'LA Chargers',
            'irl_franchise_id' => $lac->id,
            'positions' => ['DST'],
            'week_position_rank' => 2,
        ]);

        $this->postJson('/api/v1/defense-week-ranks/copy-from-week-rankings', [
            'week' => 4,
        ])
            ->assertOk()
            ->assertJsonPath('updated', 2)
            ->assertJsonPath('week', 4)
            ->assertJsonPath('source', 'week_rankings');

        $this->assertDatabaseHas('defense_week_ranks', [
            'irl_franchise_id' => $jax->id,
            'week' => 4,
            'rank' => 1,
        ]);
        $this->assertDatabaseHas('defense_week_ranks', [
            'irl_franchise_id' => $lac->id,
            'week' => 4,
            'rank' => 2,
        ]);
    }

    public function test_it_rejects_invalid_weeks(): void
    {
        $this->getJson('/api/v1/defense-week-ranks?week=0')->assertStatus(422);
        $this->putJson('/api/v1/defense-week-ranks', [
            'week' => 18,
            'data' => 'PIT',
        ])->assertStatus(422);

        $this->assertSame(0, DefenseWeekRank::query()->count());
    }
}
