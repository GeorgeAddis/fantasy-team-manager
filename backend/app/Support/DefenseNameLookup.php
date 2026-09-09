<?php

namespace App\Support;

use App\Models\IrlFranchise;
use App\Models\Player;

class DefenseNameLookup
{
    /**
     * @return array<string, IrlFranchise>
     */
    public static function build(): array
    {
        $franchises = IrlFranchise::query()->orderBy('id')->get();
        $dstByFranchiseId = Player::query()
            ->whereJsonContains('positions', 'DST')
            ->get()
            ->keyBy('irl_franchise_id');

        $lookup = [];
        $ambiguous = [];

        foreach ($franchises as $franchise) {
            $dst = $dstByFranchiseId->get($franchise->id);
            foreach (self::aliasesFor($franchise, $dst) as $alias) {
                $key = self::normalize($alias);
                if ($key === '') {
                    continue;
                }
                if (isset($ambiguous[$key])) {
                    continue;
                }
                if (isset($lookup[$key]) && $lookup[$key]->id !== $franchise->id) {
                    unset($lookup[$key]);
                    $ambiguous[$key] = true;
                    continue;
                }
                $lookup[$key] = $franchise;
            }
        }

        return $lookup;
    }

    /**
     * @return array<string, Player>
     */
    public static function buildPlayerLookup(): array
    {
        $dstByFranchiseId = Player::query()
            ->whereJsonContains('positions', 'DST')
            ->get()
            ->keyBy('irl_franchise_id');

        $lookup = [];
        foreach (self::build() as $key => $franchise) {
            $player = $dstByFranchiseId->get($franchise->id);
            if ($player) {
                $lookup[$key] = $player;
            }
        }

        return $lookup;
    }

    /**
     * @param  array<string, IrlFranchise>  $lookup
     */
    public static function find(string $name, array $lookup): ?IrlFranchise
    {
        return $lookup[self::normalize($name)] ?? null;
    }

    /**
     * @param  array<string, Player>  $lookup
     */
    public static function findPlayer(string $name, array $lookup): ?Player
    {
        return $lookup[self::normalize($name)] ?? null;
    }

    public static function normalize(string $name): string
    {
        $n = preg_replace('/\b(d\/st|dst|defense|def)\b/i', '', $name) ?? $name;
        $n = preg_replace('/\s+\bd\b\s*$/i', '', $n) ?? $n;
        $n = str_replace(["'", "\u{2019}", '-', '.'], '', $n);

        return strtolower(trim(preg_replace('/\s{2,}/', ' ', $n) ?? $n));
    }

    /**
     * @return list<string>
     */
    private static function aliasesFor(IrlFranchise $franchise, ?Player $dst): array
    {
        $aliases = [];
        foreach ([
            $franchise->name,
            $franchise->abbreviated_name,
            $franchise->alternate_name,
            $franchise->alternate_abbreviated_name,
            $dst?->name,
            $dst?->alternate_name,
        ] as $alias) {
            if ($alias === null || trim((string) $alias) === '') {
                continue;
            }
            $aliases[] = (string) $alias;
        }

        $parts = preg_split('/\s+/', trim((string) $franchise->name)) ?: [];
        if (count($parts) > 1) {
            $aliases[] = (string) end($parts);
            $city = implode(' ', array_slice($parts, 0, -1));
            if ($city !== '') {
                $aliases[] = $city;
            }
        }

        return $aliases;
    }
}
