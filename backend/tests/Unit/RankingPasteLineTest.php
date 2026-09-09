<?php

namespace Tests\Unit;

use App\Support\RankingPasteLine;
use PHPUnit\Framework\TestCase;

class RankingPasteLineTest extends TestCase
{
    public function test_it_parses_common_defense_paste_formats(): void
    {
        $this->assertSame(
            ['file_rank' => 1, 'name' => 'Jacksonville Jaguars', 'pos_raw' => ''],
            RankingPasteLine::parse("1\tJacksonville Jaguars")
        );
        $this->assertSame(
            ['file_rank' => 2, 'name' => 'Los Angeles Chargers', 'pos_raw' => 'DST2'],
            RankingPasteLine::parse("2\tLos Angeles Chargers\tvs. KC\tDST2")
        );
        $this->assertSame(
            ['file_rank' => 3, 'name' => 'Pittsburgh Steelers', 'pos_raw' => ''],
            RankingPasteLine::parse('3 Pittsburgh Steelers')
        );
        $this->assertSame(
            ['file_rank' => 4, 'name' => 'Philadelphia Eagles', 'pos_raw' => ''],
            RankingPasteLine::parse('4. Philadelphia Eagles')
        );
        $this->assertSame(
            ['file_rank' => 5, 'name' => 'Los Angeles Rams', 'pos_raw' => ''],
            RankingPasteLine::parse('#5: Los Angeles Rams')
        );
        $this->assertSame(
            ['file_rank' => 0, 'name' => 'Denver Broncos', 'pos_raw' => ''],
            RankingPasteLine::parse('Denver Broncos')
        );
        $this->assertNull(RankingPasteLine::parse('#	Player (team)'));
    }
}
