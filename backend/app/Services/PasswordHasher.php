<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Config;

/**
 * PBKDF2-SHA256 password & code hashing with per-secret salt.
 */
final class PasswordHasher
{
    private int $iterations;

    public function __construct()
    {
        $this->iterations = (int) Config::get('security.pbkdf2_iterations', 120000);
    }

    /**
     * @return array{0:string,1:string} [hash, salt]
     */
    public function hash(string $plain, ?string $salt = null): array
    {
        $salt ??= bin2hex(random_bytes(16));
        $hash = hash_pbkdf2('sha256', $plain, $salt, $this->iterations);

        return [$hash, $salt];
    }

    public function verify(string $plain, string $hash, string $salt): bool
    {
        [$candidate] = $this->hash($plain, $salt);

        return hash_equals($hash, $candidate);
    }
}
