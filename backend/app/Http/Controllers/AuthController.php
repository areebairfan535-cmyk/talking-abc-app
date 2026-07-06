<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Services\AuthService;

/**
 * Registration, login and password-reset endpoints.
 */
final class AuthController extends Controller
{
    public function __construct(private readonly AuthService $auth)
    {
    }

    /**
     * POST /register
     *
     * @return array<string,mixed>
     */
    public function register(Request $request): array
    {
        $user = $this->auth->register(
            $request->string('fullName'),
            $request->string('email'),
            $request->string('phone'),
            (string) $request->input('password', '')
        );

        return $this->ok(['user' => $user]);
    }

    /**
     * POST /login
     *
     * @return array<string,mixed>
     */
    public function login(Request $request): array
    {
        $user = $this->auth->login(
            $request->string('email'),
            (string) $request->input('password', '')
        );

        return $this->ok(['user' => $user]);
    }

    /**
     * POST /forgot-password
     *
     * @return array<string,mixed>
     */
    public function forgotPassword(Request $request): array
    {
        return $this->auth->requestReset($request->string('email'));
    }

    /**
     * POST /verify-reset-code
     *
     * @return array<string,mixed>
     */
    public function verifyResetCode(Request $request): array
    {
        $user = $this->auth->verifyReset(
            $request->string('email'),
            $request->string('code')
        );

        return $this->ok(['user' => $user]);
    }
}
