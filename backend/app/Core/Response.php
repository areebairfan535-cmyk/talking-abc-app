<?php

declare(strict_types=1);

namespace App\Core;

/**
 * JSON response writer. This is the "View" layer of the MVC stack for an API:
 * it serialises controller output into the HTTP response.
 */
final class Response
{
    public static function cors(): void
    {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
        // Bypass-Tunnel-Reminder is sent by the client on every request; without it
        // listed here the browser rejects the preflight and the web build cannot
        // reach the API at all (native builds are unaffected — they skip CORS).
        header('Access-Control-Allow-Headers: Content-Type, Authorization, Bypass-Tunnel-Reminder');
    }

    /**
     * @param array<string,mixed>|list<mixed> $data
     */
    public static function json(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
