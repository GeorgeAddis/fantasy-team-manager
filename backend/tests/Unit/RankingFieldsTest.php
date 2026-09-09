<?php

namespace Tests\Unit;

use App\Support\RankingFields;
use PHPUnit\Framework\TestCase;

class RankingFieldsTest extends TestCase
{
    public function test_it_mirrors_k_and_dst_ranks_across_scoring_formats(): void
    {
        $this->assertTrue(RankingFields::isScoringIndependent([], 'K'));
        $this->assertTrue(RankingFields::isScoringIndependent(['DST']));
        $this->assertFalse(RankingFields::isScoringIndependent(['QB'], 'QB'));

        $this->assertSame([
            'week_position_rank' => 4,
            'week_position_rank_non_ppr' => 4,
        ], RankingFields::mirrorScoringIndependent([
            'week_position_rank' => 4,
        ]));

        $this->assertSame([
            'waiver_rank_non_ppr' => 2,
            'waiver_rank' => 2,
        ], RankingFields::mirrorScoringIndependent([
            'waiver_rank_non_ppr' => 2,
        ]));

        $this->assertSame([
            'season_rank' => 80,
            'season_position_rank' => 3,
            'season_position_rank_non_ppr' => 3,
        ], RankingFields::mirrorScoringIndependent([
            'season_rank' => 80,
            'season_position_rank' => 3,
        ]));
    }
}
