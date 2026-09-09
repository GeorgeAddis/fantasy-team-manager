<?php

namespace App\Support;

class RankingPasteLine
{
    /**
     * Parse a ranking paste row. Accepts tabs, 2+ spaces, "1 Name", "1. Name",
     * "#1: Name", or a bare name (rank 0 = use list order).
     *
     * @return array{file_rank: int, name: string, pos_raw: string}|null
     */
    public static function parse(string $line): ?array
    {
        $line = trim(preg_replace('/^\xEF\xBB\xBF/', '', $line) ?? $line);
        if ($line === '' || self::isHeader($line)) {
            return null;
        }

        $cols = preg_split('/\t+/', $line) ?: [$line];
        if (count($cols) < 2) {
            $cols = preg_split('/\s{2,}/', $line) ?: [$line];
        }

        $rank = (int) preg_replace('/[^\d]/', '', trim($cols[0] ?? ''));
        $rawPlayer = trim($cols[1] ?? '');
        $posRaw = trim($cols[3] ?? '');

        if ($rawPlayer === '' && preg_match('/^#?\s*(\d+)\s*[\.\:\)]\s+(.+)$/', $line, $m)) {
            $rank = (int) $m[1];
            $rawPlayer = trim($m[2]);
        }

        if ($rawPlayer === '' && preg_match('/^#?\s*(\d+)\s+(.+)$/', $line, $m)) {
            $rank = (int) $m[1];
            $rawPlayer = trim($m[2]);
        }

        if ($rawPlayer === '' && !preg_match('/^\d+$/', $line)) {
            $rawPlayer = preg_replace('/^#?\s*\d+\s*[\.\:\)]\s*/', '', $line) ?? $line;
            $rawPlayer = trim($rawPlayer);
        }

        $name = trim(preg_replace('/\s*\([^)]*\)\s*$/', '', $rawPlayer) ?? $rawPlayer);
        if ($name === '' || preg_match('/^\d+$/', $name)) {
            return null;
        }

        return [
            'file_rank' => $rank > 0 ? $rank : 0,
            'name' => $name,
            'pos_raw' => $posRaw,
        ];
    }

    private static function isHeader(string $line): bool
    {
        $first = strtolower(trim(strtok($line, "\t") ?: $line));

        return $first === '#' || $first === 'rank' || str_contains($first, 'player');
    }
}
