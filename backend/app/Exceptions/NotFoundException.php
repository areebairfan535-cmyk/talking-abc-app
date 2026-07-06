<?php

declare(strict_types=1);

namespace App\Exceptions;

/**
 * Thrown when no route matches the request (maps to HTTP 404).
 */
final class NotFoundException extends HttpException
{
    public function __construct(string $message = 'Not found')
    {
        parent::__construct($message, 404);
    }
}
