<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\DataStructures\MaxHeap;
use App\DataStructures\MergeSort;
use App\Models\LetterStat;

/**
 * Per-letter performance statistics.
 *
 * Demonstrates applied DSA: rows are ranked by accuracy with a stable
 * {@see MergeSort}, and the strongest letters are pulled with a
 * {@see MaxHeap} (priority queue) without sorting twice.
 */
final class LetterController extends Controller
{
    private const TOP_N = 3;

    /**
     * GET /letter-stats
     *
     * @return array<string,mixed>
     */
    public function stats(Request $request): array
    {
        $rows = array_map(static function (array $row): array {
            $correct = (int) $row['correct_count'];
            $wrong = (int) $row['wrong_count'];
            $attempts = $correct + $wrong;
            $accuracy = $attempts > 0 ? round(($correct / $attempts) * 100, 1) : 0.0;

            return [
                'letter'        => (string) $row['letter'],
                'word'          => (string) $row['word'],
                'correct_count' => $correct,
                'wrong_count'   => $wrong,
                'attempts'      => $attempts,
                'accuracy'      => $accuracy,
                'updated_at'    => (string) $row['updated_at'],
            ];
        }, LetterStat::all());

        // Rank by accuracy desc, then attempts desc, then letter asc (stable).
        $ranked = MergeSort::sort($rows, static function (array $a, array $b): int {
            return [$b['accuracy'], $b['attempts'], $a['letter']]
                <=> [$a['accuracy'], $a['attempts'], $b['letter']];
        });

        // Pull the strongest letters with a max-heap keyed on accuracy.
        $heap = new MaxHeap(static fn (array $row): float => (float) $row['accuracy']);
        foreach ($rows as $row) {
            if ($row['attempts'] > 0) {
                $heap->insert($row);
            }
        }
        $strongest = array_map(
            static fn (array $row): array => ['letter' => $row['letter'], 'accuracy' => $row['accuracy']],
            $heap->top(self::TOP_N)
        );

        return [
            'letters'   => $ranked,
            'strongest' => $strongest,
        ];
    }
}
