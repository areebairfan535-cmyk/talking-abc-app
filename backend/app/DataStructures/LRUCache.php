<?php

declare(strict_types=1);

namespace App\DataStructures;

/**
 * Least-Recently-Used cache with O(1) get/put.
 *
 * Combines a hash map (key -> node) for constant-time lookup with a doubly
 * linked list that tracks recency. When capacity is exceeded the tail
 * (least recently used) entry is evicted. Used to memoise expensive read
 * aggregates (e.g. the score summary) within a request.
 *
 * @template TValue
 */
final class LRUCache
{
    /** @var array<string, Node<TValue>> */
    private array $map = [];

    /** @var DoublyLinkedList<TValue> */
    private DoublyLinkedList $recency;

    public function __construct(private readonly int $capacity = 64)
    {
        $this->recency = new DoublyLinkedList();
    }

    public function has(string $key): bool
    {
        return isset($this->map[$key]);
    }

    /**
     * @return TValue|null
     */
    public function get(string $key): mixed
    {
        if (!isset($this->map[$key])) {
            return null;
        }

        $node = $this->map[$key];
        $this->recency->moveToFront($node);

        return $node->value;
    }

    /**
     * @param TValue $value
     */
    public function put(string $key, mixed $value): void
    {
        if (isset($this->map[$key])) {
            $node = $this->map[$key];
            $node->value = $value;
            $this->recency->moveToFront($node);

            return;
        }

        $node = new Node($key, $value);
        $this->map[$key] = $node;
        $this->recency->pushFront($node);

        if ($this->recency->size() > $this->capacity) {
            $lru = $this->recency->tail();
            if ($lru !== null) {
                $this->recency->remove($lru);
                unset($this->map[$lru->key]);
            }
        }
    }

    public function forget(string $key): void
    {
        if (isset($this->map[$key])) {
            $this->recency->remove($this->map[$key]);
            unset($this->map[$key]);
        }
    }
}
