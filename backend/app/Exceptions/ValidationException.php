<?php

declare(strict_types=1);

namespace App\Exceptions;

/**
 * Thrown when request input fails validation (maps to HTTP 400).
 */
final class ValidationException extends HttpException
{
    public function __construct(string $message)
    {
        parent::__construct($message, 400);
    }
}
