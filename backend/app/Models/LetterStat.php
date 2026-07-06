<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * letter_stats table model.
 */
final class LetterStat extends Model
{
    public static function bump(string $letter, string $word, bool $isCorrect): void
    {
        self::run(
            'INSERT INTO letter_stats (letter, word, correct_count, wrong_count)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                word = VALUES(word),
                correct_count = correct_count + VALUES(correct_count),
                wrong_count = wrong_count + VALUES(wrong_count),
                updated_at = CURRENT_TIMESTAMP',
            [$letter, $word, $isCorrect ? 1 : 0, $isCorrect ? 0 : 1]
        );
    }

    /**
     * @return list<array<string,mixed>>
     */
    public static function all(): array
    {
        return self::fetchAll(
            "SELECT
                letter,
                word,
                correct_count,
                wrong_count,
                DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
             FROM letter_stats"
        );
    }
}
