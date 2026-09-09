<?php

namespace App\Support;

class SflexRankingSplit
{
    /**
     * Classify a paste row as QB / RB / WR / TE.
     * Prefers the Pos column (QB1, RB2, …); falls back to stored player positions.
     */
    public static function classify(string $posRaw, array $positions = []): ?string
    {
        if (preg_match('/^(QB|RB|WR|TE)/i', trim($posRaw), $m)) {
            return strtoupper($m[1]);
        }

        foreach (['QB', 'RB', 'WR', 'TE'] as $pos) {
            if (in_array($pos, $positions, true)) {
                return $pos;
            }
        }

        return null;
    }

    public static function parseSkillPosRank(string $posRaw): ?int
    {
        if (preg_match('/^(RB|WR|TE)(\d+)$/i', trim($posRaw), $m)) {
            return (int) $m[2];
        }

        return null;
    }

    /**
     * Split a superflex list into QB position ranks and RWT ranks.
     * QBs are extracted in list order (QB1, QB2, …). Remaining RB/WR/TE
     * get a compressed RWT overall rank plus Pos-column position rank.
     *
     * @param  list<array{pos_raw?: string, positions?: array}>  $rows
     * @return list<array{kind: 'QB'|'RWT'|null, overall_rank: ?int, position_rank: ?int}>
     */
    public static function assign(array $rows): array
    {
        $qbRank = 0;
        $rwtRank = 0;
        $out = [];

        foreach ($rows as $row) {
            $posRaw = (string) ($row['pos_raw'] ?? '');
            $kind = self::classify($posRaw, $row['positions'] ?? []);

            if ($kind === 'QB') {
                $qbRank++;
                $out[] = ['kind' => 'QB', 'overall_rank' => null, 'position_rank' => $qbRank];
                continue;
            }

            if (in_array($kind, ['RB', 'WR', 'TE'], true)) {
                $rwtRank++;
                $out[] = [
                    'kind' => 'RWT',
                    'overall_rank' => $rwtRank,
                    'position_rank' => self::parseSkillPosRank($posRaw),
                ];
                continue;
            }

            $out[] = ['kind' => null, 'overall_rank' => null, 'position_rank' => null];
        }

        return $out;
    }
}
