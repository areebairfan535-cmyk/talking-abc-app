<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * Users table model.
 */
final class User extends Model
{
    /**
     * @return array<string,mixed>|null
     */
    public static function findByEmail(string $email): ?array
    {
        return self::fetchOne(
            'SELECT id, full_name, email, phone, password_hash, password_salt FROM users WHERE email = ?',
            [$email]
        );
    }

    /**
     * @return array<string,mixed>|null
     */
    public static function findById(int $id): ?array
    {
        return self::fetchOne(
            'SELECT id, full_name, email, phone FROM users WHERE id = ?',
            [$id]
        );
    }

    public static function emailExists(string $email): bool
    {
        return self::fetchOne('SELECT id FROM users WHERE email = ?', [$email]) !== null;
    }

    /**
     * @return array<string,mixed> Newly created public user row.
     */
    public static function create(string $fullName, string $email, string $phone, string $hash, string $salt): array
    {
        self::run(
            'INSERT INTO users (full_name, email, phone, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)',
            [$fullName, $email, $phone, $hash, $salt]
        );

        return self::findById((int) self::db()->lastInsertId()) ?? [];
    }

    /**
     * Map a DB row to the public shape the mobile app expects.
     *
     * @param array<string,mixed> $row
     * @return array{id:int,fullName:string,email:string,phone:string}
     */
    public static function toPublic(array $row): array
    {
        return [
            'id'       => (int) $row['id'],
            'fullName' => (string) $row['full_name'],
            'email'    => (string) $row['email'],
            'phone'    => (string) $row['phone'],
        ];
    }
}
