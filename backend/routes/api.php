<?php

declare(strict_types=1);

use App\Core\Router;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\LetterController;
use App\Http\Controllers\ScoreController;

/**
 * API route table. Maps each HTTP method + path to a [controller, action].
 *
 * @return callable(Router):void
 */
return static function (Router $router): void {
    $router->get('/health', HealthController::class, 'show');

    // Auth & account recovery
    $router->post('/register', AuthController::class, 'register');
    $router->post('/login', AuthController::class, 'login');
    $router->post('/forgot-password', AuthController::class, 'forgotPassword');
    $router->post('/verify-reset-code', AuthController::class, 'verifyResetCode');

    // Score & progress
    $router->get('/summary', ScoreController::class, 'summary');
    $router->post('/learned-letter', GameController::class, 'markLearned');
    $router->post('/game-attempt', GameController::class, 'recordAttempt');

    // Letter statistics (DSA-powered ranking)
    $router->get('/letter-stats', LetterController::class, 'stats');
};
