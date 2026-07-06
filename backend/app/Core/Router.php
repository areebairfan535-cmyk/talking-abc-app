<?php

declare(strict_types=1);

namespace App\Core;

use App\Exceptions\NotFoundException;

/**
 * HTTP router.
 *
 * Routes are stored in a hash map keyed by "METHOD path", giving average
 * O(1) dispatch lookup regardless of how many routes are registered.
 * Each handler is a [ControllerClass, method] pair that the DI container
 * instantiates with auto-wired dependencies.
 */
final class Router
{
    /** @var array<string, array{0:class-string,1:string}> */
    private array $routes = [];

    public function __construct(private readonly Container $container)
    {
    }

    /**
     * @param class-string $controller
     */
    public function get(string $path, string $controller, string $action): void
    {
        $this->add('GET', $path, $controller, $action);
    }

    /**
     * @param class-string $controller
     */
    public function post(string $path, string $controller, string $action): void
    {
        $this->add('POST', $path, $controller, $action);
    }

    /**
     * @param class-string $controller
     */
    public function add(string $method, string $path, string $controller, string $action): void
    {
        $this->routes[$this->key($method, $path)] = [$controller, $action];
    }

    /**
     * @return array<string,mixed>|list<mixed>
     */
    public function dispatch(Request $request): array
    {
        $handler = $this->routes[$this->key($request->method, $request->path)] ?? null;

        if ($handler === null) {
            throw new NotFoundException("No route for {$request->method} {$request->path}");
        }

        [$controllerClass, $action] = $handler;
        $controller = $this->container->make($controllerClass);

        /** @var array<string,mixed>|list<mixed> */
        return $controller->{$action}($request);
    }

    private function key(string $method, string $path): string
    {
        $path = rtrim($path, '/');

        return strtoupper($method) . ' ' . ($path === '' ? '/' : $path);
    }
}
