<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Immutable HTTP request value object.
 */
final class Request
{
    /**
     * @param array<string,mixed> $body
     * @param array<string,mixed> $query
     */
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        public readonly array $body = [],
        public readonly array $query = [],
    ) {
    }

    public static function capture(): self
    {
        $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

        $body = [];
        if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            $raw = file_get_contents('php://input') ?: '';
            if (trim($raw) !== '') {
                $decoded = json_decode($raw, true);
                $body = is_array($decoded) ? $decoded : [];
            }
        }

        return new self($method, rtrim($path, '/') === '' ? '/' : rtrim($path, '/'), $body, $_GET);
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $this->query[$key] ?? $default;
    }

    public function string(string $key, string $default = ''): string
    {
        $value = $this->input($key, $default);

        return is_scalar($value) ? trim((string) $value) : $default;
    }

    public function boolean(string $key): bool
    {
        return (bool) $this->input($key, false);
    }
}
