<?php

declare(strict_types=1);

namespace App\Core;

use App\Exceptions\ValidationException;

/**
 * Small fluent validator. Throws ValidationException on the first failure.
 */
final class Validator
{
    public static function requireText(string $value, string $label): string
    {
        if (trim($value) === '') {
            throw new ValidationException("{$label} is required");
        }

        return trim($value);
    }

    public static function requireEmail(string $value): string
    {
        $email = strtolower(trim($value));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ValidationException('Valid email is required');
        }

        return $email;
    }

    public static function requirePhone(string $value): string
    {
        $digits = preg_replace('/\D/', '', $value) ?? '';
        if (strlen($digits) < 6) {
            throw new ValidationException('Valid phone number is required');
        }

        return trim($value);
    }

    public static function requirePassword(string $value, int $min = 6): string
    {
        if (strlen($value) < $min) {
            throw new ValidationException("Password must be at least {$min} characters");
        }

        return $value;
    }
}
