<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Base controller. Controllers extend this and return plain arrays from their
 * actions; the kernel serialises the array to JSON via Response.
 */
abstract class Controller
{
    /**
     * @param array<string,mixed> $payload
     * @return array<string,mixed>
     */
    protected function ok(array $payload = []): array
    {
        return array_merge(['ok' => true], $payload);
    }
}
