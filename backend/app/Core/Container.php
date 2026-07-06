<?php

declare(strict_types=1);

namespace App\Core;

use ReflectionClass;
use ReflectionNamedType;
use RuntimeException;

/**
 * Lightweight dependency-injection container with constructor auto-wiring.
 *
 * Resolves a class by reflecting its constructor and recursively building any
 * class-typed dependencies. Resolved instances are cached (shared) so the same
 * service is reused within a request.
 */
final class Container
{
    /** @var array<class-string,object> */
    private array $shared = [];

    /**
     * @template T of object
     * @param class-string<T> $class
     * @return T
     */
    public function make(string $class): object
    {
        if (isset($this->shared[$class])) {
            /** @var T */
            return $this->shared[$class];
        }

        $instance = $this->build($class);
        $this->shared[$class] = $instance;

        /** @var T $instance */
        return $instance;
    }

    /**
     * @param class-string $class
     */
    private function build(string $class): object
    {
        if (!class_exists($class)) {
            throw new RuntimeException("Cannot resolve unknown class {$class}");
        }

        $reflection = new ReflectionClass($class);
        $constructor = $reflection->getConstructor();

        if ($constructor === null) {
            return new $class();
        }

        $dependencies = [];
        foreach ($constructor->getParameters() as $parameter) {
            $type = $parameter->getType();

            if ($type instanceof ReflectionNamedType && !$type->isBuiltin()) {
                $dependencies[] = $this->make($type->getName());
                continue;
            }

            if ($parameter->isDefaultValueAvailable()) {
                $dependencies[] = $parameter->getDefaultValue();
                continue;
            }

            throw new RuntimeException(
                "Cannot resolve parameter \${$parameter->getName()} of {$class}"
            );
        }

        return $reflection->newInstanceArgs($dependencies);
    }
}
