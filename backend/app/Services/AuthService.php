<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Config;
use App\Core\Validator;
use App\Exceptions\ValidationException;
use App\Models\PasswordResetCode;
use App\Models\User;
use PDOException;

/**
 * Authentication & account-recovery business logic.
 *
 * Controllers stay thin by delegating registration, login and the password
 * reset code lifecycle here. Dependencies are constructor-injected by the
 * DI container.
 */
final class AuthService
{
    public function __construct(
        private readonly PasswordHasher $hasher,
        private readonly MailService $mail,
    ) {
    }

    /**
     * @param array<string,mixed> $input
     * @return array{id:int,fullName:string,email:string,phone:string}
     */
    public function register(string $fullName, string $email, string $phone, string $password): array
    {
        $fullName = Validator::requireText($fullName, 'Full name');
        $email = Validator::requireEmail($email);
        $phone = Validator::requirePhone($phone);
        $password = Validator::requirePassword($password);

        [$hash, $salt] = $this->hasher->hash($password);

        try {
            $user = User::create($fullName, $email, $phone, $hash, $salt);
        } catch (PDOException) {
            throw new ValidationException('An account with this email already exists');
        }

        return User::toPublic($user);
    }

    /**
     * @return array{id:int,fullName:string,email:string,phone:string}
     */
    public function login(string $email, string $password): array
    {
        $email = strtolower(trim($email));
        if ($email === '') {
            throw new ValidationException('Email is required');
        }
        if ($password === '') {
            throw new ValidationException('Password is required');
        }

        $row = User::findByEmail($email);
        if ($row === null || !$this->hasher->verify($password, (string) $row['password_hash'], (string) $row['password_salt'])) {
            throw new ValidationException('Invalid email or password');
        }

        return User::toPublic($row);
    }

    /**
     * @return array{ok:bool,needsRegistration?:bool,message?:string,delivery?:string}
     */
    public function requestReset(string $email): array
    {
        $email = Validator::requireEmail($email);

        $user = User::findByEmail($email);
        if ($user === null) {
            return ['ok' => false, 'needsRegistration' => true, 'message' => 'No account found with this email'];
        }

        $userId = (int) $user['id'];
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        [$codeHash, $codeSalt] = $this->hasher->hash($code);

        PasswordResetCode::invalidateActive($userId);
        PasswordResetCode::issue($userId, $codeHash, $codeSalt, (int) Config::get('security.reset_code_ttl', 600));

        $delivery = $this->mail->sendResetCode((string) $user['email'], $code);

        return ['ok' => true, 'delivery' => $delivery];
    }

    /**
     * @return array{id:int,fullName:string,email:string,phone:string}
     */
    public function verifyReset(string $email, string $code): array
    {
        $email = Validator::requireEmail($email);
        $code = trim($code);
        if ($code === '') {
            throw new ValidationException('Code is required');
        }

        $row = PasswordResetCode::latestValidForEmail($email);
        if ($row === null || !$this->hasher->verify($code, (string) $row['code_hash'], (string) $row['code_salt'])) {
            throw new ValidationException('Invalid or expired code');
        }

        PasswordResetCode::consume((int) $row['reset_id']);

        return User::toPublic($row);
    }
}
