<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * learned_letters table model.
 */
final class LearnedLetter extends Model
{
    public static function markLearned(string $letter, string $word): void
    {
        self::run(
            'INSERT IGNORE INTO learned_letters (letter, word) VALUES (?, ?)',
            [$letter, $word]
        );
    }

    public static function count(): int
    {
        $row = self::fetchOne('SELECT COUNT(*) AS total FROM learned_letters');

        return (int) ($row['total'] ?? 0);
    }
}
