<?php

declare(strict_types=1);

namespace App\Models;

use App\Core\Model;

/**
 * game_stats singleton-row model (always id = 1).
 */
final class GameStat extends Model
{
    /**
     * @return array{games_played:int,high_score:int}
     */
    public static function current(): array
    {
        $row = self::fetchOne('SELECT games_played, high_score FROM game_stats WHERE id = 1');

        return [
            'games_played' => (int) ($row['games_played'] ?? 0),
            'high_score'   => (int) ($row['high_score'] ?? 0),
        ];
    }

    public static function registerPlay(int $scoreForRound): void
    {
        self::run(
            'UPDATE game_stats
             SET games_played = games_played + 1,
                 high_score = GREATEST(high_score, ?),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = 1',
            [$scoreForRound]
        );
    }
}
