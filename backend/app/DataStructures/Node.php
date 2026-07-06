<?php

declare(strict_types=1);

namespace App\DataStructures;

/**
 * Node for the doubly linked list backing {@see LRUCache}.
 *
 * @template TValue
 */
final class Node
{
    /** @var Node<TValue>|null */
    public ?Node $prev = null;
    /** @var Node<TValue>|null */
    public ?Node $next = null;

    /**
     * @param TValue $value
     */
    public function __construct(
        public readonly string $key,
        public mixed $value,
    ) {
    }
}
