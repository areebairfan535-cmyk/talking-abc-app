<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Services\ScoreService;

/**
 * Score summary endpoint.
 */
final class ScoreController extends Controller
{
    public function __construct(private readonly ScoreService $scores)
    {
    }

    /**
     * GET /summary
     *
     * @return array<string,mixed>
     */
    public function summary(Request $request): array
    {
        return $this->scores->summary();
    }
}
