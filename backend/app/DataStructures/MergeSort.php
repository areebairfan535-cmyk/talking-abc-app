<?php

declare(strict_types=1);

namespace App\DataStructures;

use Closure;

/**
 * Stable merge sort - O(n log n) worst case.
 *
 * Used to rank letter statistics by a caller-supplied comparator (e.g. by
 * accuracy) where a stable ordering keeps equal items in their original order.
 */
final class MergeSort
{
    /**
     * @template T
     * @param list<T> $items
     * @param Closure(T,T):int $comparator
     * @return list<T>
     */
    public static function sort(array $items, Closure $comparator): array
    {
        $count = count($items);
        if ($count <= 1) {
            return $items;
        }

        $middle = intdiv($count, 2);
        $left = self::sort(array_slice($items, 0, $middle), $comparator);
        $right = self::sort(array_slice($items, $middle), $comparator);

        return self::merge($left, $right, $comparator);
    }

    /**
     * @template T
     * @param list<T> $left
     * @param list<T> $right
     * @param Closure(T,T):int $comparator
     * @return list<T>
     */
    private static function merge(array $left, array $right, Closure $comparator): array
    {
        $merged = [];
        $i = 0;
        $j = 0;
        $leftCount = count($left);
        $rightCount = count($right);

        while ($i < $leftCount && $j < $rightCount) {
            if ($comparator($left[$i], $right[$j]) <= 0) {
                $merged[] = $left[$i++];
            } else {
                $merged[] = $right[$j++];
            }
        }

        while ($i < $leftCount) {
            $merged[] = $left[$i++];
        }
        while ($j < $rightCount) {
            $merged[] = $right[$j++];
        }

        return $merged;
    }
}
