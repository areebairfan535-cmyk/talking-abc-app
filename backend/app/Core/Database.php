<?php

declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOException;
use RuntimeException;

/**
 * MySQL connection manager (Singleton pattern).
 *
 * A single shared PDO instance is reused for the whole request. The target
 * database is created on first connect if it does not yet exist.
 */
final class Database
{
    private static ?PDO $instance = null;

    private function __construct()
    {
        // Prevent instantiation - use Database::connection().
    }

    public static function connection(): PDO
    {
        if (self::$instance instanceof PDO) {
            return self::$instance;
        }

        $config = Config::get('database');

        try {
            self::ensureDatabaseExists($config);
            self::$instance = self::makePdo($config, true);
        } catch (PDOException $e) {
            throw new RuntimeException('Database connection failed: ' . $e->getMessage(), 0, $e);
        }

        return self::$instance;
    }

    /**
     * @param array<string,mixed> $config
     */
    private static function ensureDatabaseExists(array $config): void
    {
        $server = self::makePdo($config, false);
        $name = (string) $config['name'];
        $charset = (string) $config['charset'];
        $collation = (string) $config['collation'];
        $server->exec("CREATE DATABASE IF NOT EXISTS `{$name}` CHARACTER SET {$charset} COLLATE {$collation}");
    }

    /**
     * @param array<string,mixed> $config
     */
    private static function makePdo(array $config, bool $withDatabase): PDO
    {
        $dsn = sprintf('mysql:host=%s;port=%d;charset=%s', $config['host'], $config['port'], $config['charset']);
        if ($withDatabase) {
            $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $config['host'], $config['port'], $config['name'], $config['charset']);
        }

        return new PDO($dsn, (string) $config['user'], (string) $config['password'], [
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
}
