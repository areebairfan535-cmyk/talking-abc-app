<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Core\Request;
use App\Core\Validator;
use App\Exceptions\ValidationException;
use App\Models\GameAttempt;
use App\Models\GameStat;
use App\Models\LearnedLetter;
use App\Models\LetterStat;
use App\Services\ScoreService;
use Throwable;

/**
 * Learning progress + gameplay endpoints.
 */
final class GameController extends Controller
{
    private const CORRECT_ROUND_SCORE = 100;

    public function __construct(private readonly ScoreService $scores)
    {
    }

    /**
     * POST /learned-letter
     *
     * @return array<string,mixed>
     */
    public function markLearned(Request $request): array
    {
        $letter = strtoupper(Validator::requireText($request->string('letter'), 'letter'));
        $word = Validator::requireText($request->string('word'), 'word');

        LearnedLetter::markLearned($letter, $word);
        $this->scores->invalidate();

        return $this->ok(['summary' => $this->scores->summary()]);
    }

    /**
     * POST /game-attempt
     *
     * @return array<string,mixed>
     */
    public function recordAttempt(Request $request): array
    {
        $mode = $request->string('mode');
        $targetLetter = strtoupper($request->string('targetLetter'));
        $targetWord = $request->string('targetWord');
        $selectedAnswer = strtoupper($request->string('selectedAnswer'));
        $correctAnswer = strtoupper($request->string('correctAnswer'));
        $isCorrect = $request->boolean('isCorrect');

        if ($mode === '' || $targetLetter === '' || $targetWord === '' || $selectedAnswer === '' || $correctAnswer === '') {
            throw new ValidationException('mode, targetLetter, targetWord, selectedAnswer, and correctAnswer are required');
        }

        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            GameAttempt::record($mode, $targetLetter, $targetWord, $selectedAnswer, $correctAnswer, $isCorrect);
            LetterStat::bump($correctAnswer, $targetWord, $isCorrect);
            GameStat::registerPlay($isCorrect ? self::CORRECT_ROUND_SCORE : 0);
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        $this->scores->invalidate();

        return $this->ok(['summary' => $this->scores->summary()]);
    }
}
