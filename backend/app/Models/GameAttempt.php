<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * game_attempts table model.
 */
final class GameAttempt extends Model
{
    public static function record(
        string $mode,
        string $targetLetter,
        string $targetWord,
        string $selectedAnswer,
        string $correctAnswer,
        bool $isCorrect
    ): void {
        self::run(
            'INSERT INTO game_attempts
                (mode, target_letter, target_word, selected_answer, correct_answer, is_correct)
             VALUES (?, ?, ?, ?, ?, ?)',
            [$mode, $targetLetter, $targetWord, $selectedAnswer, $correctAnswer, $isCorrect ? 1 : 0]
        );
    }

    /**
     * @return array{correct:int,wrong:int}
     */
    public static function answerTotals(): array
    {
        $row = self::fetchOne(
            'SELECT
                SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct_count,
                SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) AS wrong_count
             FROM game_attempts'
        );

        return [
            'correct' => (int) ($row['correct_count'] ?? 0),
            'wrong'   => (int) ($row['wrong_count'] ?? 0),
        ];
    }
}
