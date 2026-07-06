<?php

declare(strict_types=1);

namespace App\DataStructures;

/**
 * Doubly linked list with O(1) head/tail insertion and arbitrary-node removal.
 * Used as the recency list inside the LRU cache.
 *
 * @template TValue
 */
final class DoublyLinkedList
{
    /** @var Node<TValue>|null */
    private ?Node $head = null;
    /** @var Node<TValue>|null */
    private ?Node $tail = null;
    private int $size = 0;

    /**
     * @param Node<TValue> $node
     */
    public function pushFront(Node $node): void
    {
        $node->prev = null;
        $node->next = $this->head;

        if ($this->head !== null) {
            $this->head->prev = $node;
        }
        $this->head = $node;

        if ($this->tail === null) {
            $this->tail = $node;
        }
        $this->size++;
    }

    /**
     * @param Node<TValue> $node
     */
    public function remove(Node $node): void
    {
        if ($node->prev !== null) {
            $node->prev->next = $node->next;
        } else {
            $this->head = $node->next;
        }

        if ($node->next !== null) {
            $node->next->prev = $node->prev;
        } else {
            $this->tail = $node->prev;
        }

        $node->prev = null;
        $node->next = null;
        $this->size--;
    }

    /**
     * @param Node<TValue> $node
     */
    public function moveToFront(Node $node): void
    {
        if ($this->head === $node) {
            return;
        }
        $this->remove($node);
        $this->pushFront($node);
    }

    /**
     * @return Node<TValue>|null
     */
    public function tail(): ?Node
    {
        return $this->tail;
    }

    public function size(): int
    {
        return $this->size;
    }
}
