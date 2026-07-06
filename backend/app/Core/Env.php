<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Tiny .env loader / accessor.
 *
 * Loads KEY=VALUE pairs from the project .env once and exposes typed getters.
 * Existing real environment variables always win over the file.
 */
final class Env
{
    private static bool $loaded = false;

    /** @var array<string,string> */
    private static array $values = [];

    public static function load(string $path): void
    {
        if (self::$loaded) {
            return;
        }
        self::$loaded = true;

        if (!is_file($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }
            [$name, $value] = explode('=', $line, 2);
            $name = trim($name);
            $value = trim(trim($value), "\"'");
            if ($name !== '') {
                self::$values[$name] = $value;
            }
        }
    }

    public static function get(string $key, string $default = ''): string
    {
        $real = getenv($key);
        if ($real !== false && $real !== '') {
            return $real;
        }

        return self::$values[$key] ?? $default;
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $value = strtolower(self::get($key, $default ? 'true' : 'false'));

        return in_array($value, ['1', 'true', 'yes', 'on'], true);
    }
}
