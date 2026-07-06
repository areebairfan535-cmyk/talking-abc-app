<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * password_reset_codes table model.
 */
final class PasswordResetCode extends Model
{
    public static function invalidateActive(int $userId): void
    {
        self::run(
            'UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL',
            [$userId]
        );
    }

    public static function issue(int $userId, string $codeHash, string $codeSalt, int $ttlSeconds): void
    {
        self::run(
            'INSERT INTO password_reset_codes (user_id, code_hash, code_salt, expires_at)
             VALUES (?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? SECOND))',
            [$userId, $codeHash, $codeSalt, $ttlSeconds]
        );
    }

    /**
     * Latest unused, unexpired code joined with its user.
     *
     * @return array<string,mixed>|null
     */
    public static function latestValidForEmail(string $email): ?array
    {
        return self::fetchOne(
            'SELECT prc.id AS reset_id, prc.code_hash, prc.code_salt,
                    u.id, u.full_name, u.email, u.phone
             FROM password_reset_codes prc
             INNER JOIN users u ON u.id = prc.user_id
             WHERE u.email = ? AND prc.used_at IS NULL AND prc.expires_at > CURRENT_TIMESTAMP
             ORDER BY prc.created_at DESC
             LIMIT 1',
            [$email]
        );
    }

    public static function consume(int $resetId): void
    {
        self::run(
            'UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?',
            [$resetId]
        );
    }
}
