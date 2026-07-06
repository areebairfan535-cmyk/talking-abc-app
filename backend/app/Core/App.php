<?php

declare(strict_types=1);

namespace App\Core;

use App\Database\Schema;
use App\Exceptions\HttpException;
use Throwable;

/**
 * Application kernel. Wires configuration, the DI container and the router,
 * then handles the lifecycle of a single request.
 */
final class App
{
    private Router $router;

    public function __construct(private readonly string $basePath)
    {
        Env::load($this->basePath . '/../.env');
        Config::load(require $this->basePath . '/config/config.php');

        $container = new Container();
        $this->router = new Router($container);

        /** @var callable(Router):void $registerRoutes */
        $registerRoutes = require $this->basePath . '/routes/api.php';
        $registerRoutes($this->router);
    }

    public function run(): void
    {
        Response::cors();

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
            Response::json(['ok' => true], 200);

            return;
        }

        try {
            Schema::migrate();
            $request = Request::capture();
            $payload = $this->router->dispatch($request);
            Response::json($payload, 200);
        } catch (HttpException $e) {
            Response::json(['error' => $e->getMessage()], $e->statusCode());
        } catch (Throwable $e) {
            $debug = (bool) Config::get('app.debug', false);
            Response::json([
                'error' => $debug ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }
}
