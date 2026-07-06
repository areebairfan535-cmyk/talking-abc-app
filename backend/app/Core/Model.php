<?php

declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOStatement;

/**
 * Base model. Provides shared PDO access plus thin query helpers so concrete
 * models read like an Active Record without pulling in a full ORM.
 */
abstract class Model
{
    protected static function db(): PDO
    {
        return Database::connection();
    }

    /**
     * @param list<mixed> $params
     */
    protected static function run(string $sql, array $params = []): PDOStatement
    {
        $statement = static::db()->prepare($sql);
        $statement->execute($params);

        return $statement;
    }

    /**
     * @param list<mixed> $params
     * @return array<string,mixed>|null
     */
    protected static function fetchOne(string $sql, array $params = []): ?array
    {
        $row = static::run($sql, $params)->fetch();

        return $row === false ? null : $row;
    }

    /**
     * @param list<mixed> $params
     * @return list<array<string,mixed>>
     */
    protected static function fetchAll(string $sql, array $params = []): array
    {
        return static::run($sql, $params)->fetchAll();
    }
}
