<?php

namespace Tests\Unit;

use App\Support\DefenseNameLookup;
use PHPUnit\Framework\TestCase;

class DefenseNameLookupTest extends TestCase
{
    public function test_it_normalizes_defense_name_variants(): void
    {
        $this->assertSame('pit', DefenseNameLookup::normalize('PIT DST'));
        $this->assertSame('pit', DefenseNameLookup::normalize('PIT D/ST'));
        $this->assertSame('pit', DefenseNameLookup::normalize('PIT D'));
        $this->assertSame('rams', DefenseNameLookup::normalize('Rams DST'));
        $this->assertSame('san francisco', DefenseNameLookup::normalize('San Francisco'));
    }
}
