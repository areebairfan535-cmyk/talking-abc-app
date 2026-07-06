<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Core\Config;
use App\Core\Controller;
use App\Core\Database;
use App\Core\Request;

/**
 * Liveness + connectivity probe.
 */
final class HealthController extends Controller
{
    /**
     * @return array<string,mixed>
     */
    public function show(Request $request): array
    {
        // Touch the connection so an unhealthy DB surfaces here.
        Database::connection();

        return $this->ok([
            'database' => (string) Config::get('database.name'),
            'driver'   => 'php-mvc-pdo-mysql',
        ]);
    }
}
