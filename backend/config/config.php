<?php

declare(strict_types=1);

use App\Core\Env;

/*
|--------------------------------------------------------------------------
| Application configuration
|--------------------------------------------------------------------------
| Values are read from the project .env file (loaded by App\Core\Env) with
| sensible XAMPP/MariaDB defaults so the backend works out of the box.
*/

return [
    'app' => [
        'host' => '0.0.0.0',
        'port' => 5000,
        'debug' => Env::bool('APP_DEBUG', true),
    ],

    'database' => [
        'host'     => Env::get('MYSQL_HOST', '127.0.0.1'),
        'port'     => (int) Env::get('MYSQL_PORT', '3306'),
        'name'     => Env::get('MYSQL_DATABASE', 'talking_abc'),
        'user'     => Env::get('MYSQL_USER', 'root'),
        'password' => Env::get('MYSQL_PASSWORD', ''),
        'charset'  => 'utf8mb4',
        'collation' => 'utf8mb4_unicode_ci',
    ],

    'mail' => [
        'host'     => Env::get('SMTP_HOST', ''),
        'port'     => (int) Env::get('SMTP_PORT', '587'),
        'secure'   => strtolower(Env::get('SMTP_SECURE', 'tls')),
        'user'     => Env::get('SMTP_USER', ''),
        'password' => Env::get('SMTP_PASSWORD', ''),
        'from'     => Env::get('SMTP_FROM', Env::get('SMTP_USER', 'no-reply@talking-abc.local')),
    ],

    'security' => [
        'pbkdf2_iterations' => 120000,
        'reset_code_ttl'    => 600, // seconds
    ],
];
