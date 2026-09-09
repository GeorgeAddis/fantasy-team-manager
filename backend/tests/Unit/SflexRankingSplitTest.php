<?php

namespace Tests\Unit;

use App\Support\SflexRankingSplit;
use PHPUnit\Framework\TestCase;

class SflexRankingSplitTest extends TestCase
{
    public function test_it_extracts_qbs_and_resequences_rwt(): void
    {
        $assigned = SflexRankingSplit::assign([
            ['pos_raw' => 'RB1'],
            ['pos_raw' => 'WR1'],
            ['pos_raw' => 'QB1'],
            ['pos_raw' => 'RB2'],
            ['pos_raw' => 'WR2'],
            ['pos_raw' => 'QB2'],
            ['pos_raw' => 'TE1'],
        ]);

        $this->assertSame([
            ['kind' => 'RWT', 'overall_rank' => 1, 'position_rank' => 1],
            ['kind' => 'RWT', 'overall_rank' => 2, 'position_rank' => 1],
            ['kind' => 'QB', 'overall_rank' => null, 'position_rank' => 1],
            ['kind' => 'RWT', 'overall_rank' => 3, 'position_rank' => 2],
            ['kind' => 'RWT', 'overall_rank' => 4, 'position_rank' => 2],
            ['kind' => 'QB', 'overall_rank' => null, 'position_rank' => 2],
            ['kind' => 'RWT', 'overall_rank' => 5, 'position_rank' => 1],
        ], $assigned);
    }

    public function test_it_classifies_from_player_positions_when_pos_missing(): void
    {
        $assigned = SflexRankingSplit::assign([
            ['pos_raw' => '', 'positions' => ['QB']],
            ['pos_raw' => '', 'positions' => ['WR']],
        ]);

        $this->assertSame('QB', $assigned[0]['kind']);
        $this->assertSame(1, $assigned[0]['position_rank']);
        $this->assertSame('RWT', $assigned[1]['kind']);
        $this->assertSame(1, $assigned[1]['overall_rank']);
        $this->assertNull($assigned[1]['position_rank']);
    }

    public function test_it_skips_kickers_and_defenses(): void
    {
        $assigned = SflexRankingSplit::assign([
            ['pos_raw' => 'K1'],
            ['pos_raw' => 'DST1'],
            ['pos_raw' => 'QB1'],
        ]);

        $this->assertNull($assigned[0]['kind']);
        $this->assertNull($assigned[1]['kind']);
        $this->assertSame(['kind' => 'QB', 'overall_rank' => null, 'position_rank' => 1], $assigned[2]);
    }
}
