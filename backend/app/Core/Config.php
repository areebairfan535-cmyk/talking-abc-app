<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Configuration registry (singleton-ish static store).
 *
 * Holds the resolved config array and exposes dot-notation access,
 * e.g. Config::get('database.host').
 */
final class Config
{
    /** @var array<string,mixed> */
    private static array $items = [];

    /**
     * @param array<string,mixed> $items
     */
    public static function load(array $items): void
    {
        self::$items = $items;
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $segments = explode('.', $key);
        $value = self::$items;

        foreach ($segments as $segment) {
            if (!is_array($value) || !array_key_exists($segment, $value)) {
                return $default;
            }
            $value = $value[$segment];
        }

        return $value;
    }
}
