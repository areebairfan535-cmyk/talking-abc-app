<?php

declare(strict_types=1);

namespace App\DataStructures;

use Closure;

/**
 * Binary max-heap (priority queue) with O(log n) insert and extract.
 *
 * Used to pull the top-N performing letters without fully sorting the set.
 *
 * @template T
 */
final class MaxHeap
{
    /** @var list<T> */
    private array $heap = [];

    /**
     * @param Closure(T):int|float $priority Higher value = higher priority.
     */
    public function __construct(private readonly Closure $priority)
    {
    }

    /**
     * @param T $item
     */
    public function insert(mixed $item): void
    {
        $this->heap[] = $item;
        $this->siftUp(count($this->heap) - 1);
    }

    /**
     * @return T|null
     */
    public function extractMax(): mixed
    {
        if ($this->heap === []) {
            return null;
        }

        $max = $this->heap[0];
        $last = array_pop($this->heap);

        if ($this->heap !== []) {
            $this->heap[0] = $last;
            $this->siftDown(0);
        }

        return $max;
    }

    public function size(): int
    {
        return count($this->heap);
    }

    /**
     * Convenience: drain up to $n highest-priority items in descending order.
     *
     * @return list<T>
     */
    public function top(int $n): array
    {
        $result = [];
        while ($n-- > 0 && $this->size() > 0) {
            $result[] = $this->extractMax();
        }

        return $result;
    }

    private function siftUp(int $index): void
    {
        while ($index > 0) {
            $parent = intdiv($index - 1, 2);
            if ($this->prio($index) <= $this->prio($parent)) {
                break;
            }
            $this->swap($index, $parent);
            $index = $parent;
        }
    }

    private function siftDown(int $index): void
    {
        $size = count($this->heap);

        while (true) {
            $largest = $index;
            $left = 2 * $index + 1;
            $right = 2 * $index + 2;

            if ($left < $size && $this->prio($left) > $this->prio($largest)) {
                $largest = $left;
            }
            if ($right < $size && $this->prio($right) > $this->prio($largest)) {
                $largest = $right;
            }
            if ($largest === $index) {
                break;
            }
            $this->swap($index, $largest);
            $index = $largest;
        }
    }

    private function prio(int $index): int|float
    {
        return ($this->priority)($this->heap[$index]);
    }

    private function swap(int $a, int $b): void
    {
        [$this->heap[$a], $this->heap[$b]] = [$this->heap[$b], $this->heap[$a]];
    }
}
