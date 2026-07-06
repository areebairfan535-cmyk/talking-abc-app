<?php

declare(strict_types=1);

namespace App\Services;

use App\DataStructures\LRUCache;
use App\Models\GameAttempt;
use App\Models\GameStat;
use App\Models\LearnedLetter;

/**
 * Computes the aggregate score summary shown on the home / score screens.
 *
 * The result is memoised in a request-scoped {@see LRUCache}; writes that
 * affect the score call {@see invalidate()} so the next read recomputes.
 */
final class ScoreService
{
    private const CACHE_KEY = 'score.summary';
    private const ALPHABET_SIZE = 26;

    /** @var LRUCache<array<string,int>> */
    private LRUCache $cache;

    public function __construct()
    {
        $this->cache = new LRUCache(8);
    }

    /**
     * @return array{lettersLearned:int,gamesPlayed:int,correctAnswers:int,wrongAnswers:int,score:int}
     */
    public function summary(): array
    {
        if ($this->cache->has(self::CACHE_KEY)) {
            /** @var array{lettersLearned:int,gamesPlayed:int,correctAnswers:int,wrongAnswers:int,score:int} */
            return $this->cache->get(self::CACHE_KEY);
        }

        $lettersLearned = LearnedLetter::count();
        $stats = GameStat::current();
        $totals = GameAttempt::answerTotals();

        $alphabetScore = (int) round(($lettersLearned / self::ALPHABET_SIZE) * 100);

        $summary = [
            'lettersLearned' => $lettersLearned,
            'gamesPlayed'    => $stats['games_played'],
            'correctAnswers' => $totals['correct'],
            'wrongAnswers'   => $totals['wrong'],
            'score'          => max($alphabetScore, $stats['high_score']),
        ];

        $this->cache->put(self::CACHE_KEY, $summary);

        return $summary;
    }

    public function invalidate(): void
    {
        $this->cache->forget(self::CACHE_KEY);
    }
}
