<?php

declare(strict_types=1);

function load_env_file(string $path): void
{
    if (!is_file($path)) {
        return;
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if ($lines === false) {
        return;
    }

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }

        [$name, $value] = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value, " \t\n\r\0\x0B\"'");

        if ($name !== '' && getenv($name) === false) {
            putenv("{$name}={$value}");
            $_ENV[$name] = $value;
        }
    }
}

load_env_file(dirname(__DIR__) . '/.env');

$mysqlHost = getenv('MYSQL_HOST') ?: '127.0.0.1';
$mysqlPort = getenv('MYSQL_PORT') ?: '3306';
$mysqlUser = getenv('MYSQL_USER') ?: 'root';
$mysqlPassword = getenv('MYSQL_PASSWORD') ?: '';
$mysqlDatabase = getenv('MYSQL_DATABASE') ?: 'talking_abc';

function use_sqlite_backend(): bool
{
    $driver = strtolower((string) (getenv('DB_DRIVER') ?: ''));
    if ($driver === 'mysql') {
        return false;
    }
    if ($driver === 'sqlite') {
        return true;
    }

    return !extension_loaded('pdo_mysql');
}

function send_json(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    echo json_encode($payload);
}

function read_json(): array
{
    $rawBody = file_get_contents('php://input');
    if ($rawBody === false || trim($rawBody) === '') {
        return [];
    }

    $payload = json_decode($rawBody, true);
    if (!is_array($payload)) {
        throw new InvalidArgumentException('Invalid JSON');
    }

    return $payload;
}

function db(bool $includeDatabase = true): PDO
{
    global $mysqlHost, $mysqlPort, $mysqlUser, $mysqlPassword, $mysqlDatabase;

    if (use_sqlite_backend()) {
        return new PDO(
            'sqlite:' . __DIR__ . '/talking_abc.db',
            null,
            null,
            [
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            ]
        );
    }

    $database = $includeDatabase ? ";dbname={$mysqlDatabase}" : '';
    $pdo = new PDO(
        "mysql:host={$mysqlHost};port={$mysqlPort}{$database};charset=utf8mb4",
        $mysqlUser,
        $mysqlPassword,
        [
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]
    );

    return $pdo;
}

function init_db(): void
{
    global $mysqlDatabase;

    if (use_sqlite_backend()) {
        $pdo = db();
        $statements = [
            "CREATE TABLE IF NOT EXISTS learned_letters (
                letter TEXT PRIMARY KEY NOT NULL,
                word TEXT NOT NULL,
                learned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )",
            "CREATE TABLE IF NOT EXISTS game_stats (
                id INTEGER PRIMARY KEY NOT NULL,
                games_played INTEGER NOT NULL DEFAULT 0,
                high_score INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CHECK (id = 1)
            )",
            "CREATE TABLE IF NOT EXISTS game_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                mode TEXT NOT NULL,
                target_letter TEXT NOT NULL,
                target_word TEXT NOT NULL,
                selected_answer TEXT NOT NULL,
                correct_answer TEXT NOT NULL,
                is_correct INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )",
            "CREATE TABLE IF NOT EXISTS letter_stats (
                letter TEXT PRIMARY KEY NOT NULL,
                word TEXT NOT NULL,
                correct_count INTEGER NOT NULL DEFAULT 0,
                wrong_count INTEGER NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )",
            "CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                phone TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )",
            "CREATE TABLE IF NOT EXISTS password_reset_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                user_id INTEGER NOT NULL,
                code_hash TEXT NOT NULL,
                code_salt TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                used_at TEXT DEFAULT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )",
            "CREATE INDEX IF NOT EXISTS password_reset_user_idx ON password_reset_codes (user_id)",
        ];

        foreach ($statements as $statement) {
            $pdo->exec($statement);
        }
        $pdo->exec('INSERT OR IGNORE INTO game_stats (id, games_played, high_score) VALUES (1, 0, 0)');
        return;
    }

    $server = db(false);
    $server->exec("CREATE DATABASE IF NOT EXISTS `{$mysqlDatabase}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    $pdo = db();
    $statements = [
        "CREATE TABLE IF NOT EXISTS learned_letters (
            letter VARCHAR(1) PRIMARY KEY NOT NULL,
            word VARCHAR(100) NOT NULL,
            learned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS game_stats (
            id INT PRIMARY KEY NOT NULL,
            games_played INT NOT NULL DEFAULT 0,
            high_score INT NOT NULL DEFAULT 0,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT game_stats_single_row CHECK (id = 1)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS game_attempts (
            id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
            mode VARCHAR(60) NOT NULL,
            target_letter VARCHAR(1) NOT NULL,
            target_word VARCHAR(100) NOT NULL,
            selected_answer VARCHAR(20) NOT NULL,
            correct_answer VARCHAR(20) NOT NULL,
            is_correct TINYINT(1) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS letter_stats (
            letter VARCHAR(1) PRIMARY KEY NOT NULL,
            word VARCHAR(100) NOT NULL,
            correct_count INT NOT NULL DEFAULT 0,
            wrong_count INT NOT NULL DEFAULT 0,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
            full_name VARCHAR(120) NOT NULL,
            email VARCHAR(190) NOT NULL UNIQUE,
            phone VARCHAR(40) NOT NULL,
            password_hash VARCHAR(128) NOT NULL,
            password_salt VARCHAR(64) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        "CREATE TABLE IF NOT EXISTS password_reset_codes (
            id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
            user_id INT NOT NULL,
            code_hash VARCHAR(128) NOT NULL,
            code_salt VARCHAR(64) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX password_reset_user_idx (user_id),
            CONSTRAINT password_reset_user_fk
              FOREIGN KEY (user_id) REFERENCES users(id)
              ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    ];

    foreach ($statements as $statement) {
        $pdo->exec($statement);
    }
    $pdo->exec('INSERT INTO game_stats (id, games_played, high_score) VALUES (1, 0, 0) ON DUPLICATE KEY UPDATE id = id');
}

function public_user(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'fullName' => $row['full_name'],
        'email' => $row['email'],
        'phone' => $row['phone'],
    ];
}

function hash_password_value(string $password, ?string $salt = null): array
{
    $passwordSalt = $salt ?: bin2hex(random_bytes(16));
    return [hash_pbkdf2('sha256', $password, $passwordSalt, 120000), $passwordSalt];
}

function verify_password_value(string $password, string $hash, string $salt): bool
{
    [$nextHash] = hash_password_value($password, $salt);
    return hash_equals($hash, $nextHash);
}

function smtp_read_response($socket): string
{
    $response = '';

    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (strlen($line) >= 4 && $line[3] === ' ') {
            break;
        }
    }

    return $response;
}

function smtp_command($socket, string $command, array $expectedCodes): string
{
    fwrite($socket, $command . "\r\n");
    $response = smtp_read_response($socket);
    $code = substr($response, 0, 3);

    if (!in_array($code, $expectedCodes, true)) {
        throw new RuntimeException('SMTP command failed: ' . trim($response));
    }

    return $response;
}

function send_smtp_mail(string $to, string $subject, string $message): bool
{
    $host = getenv('SMTP_HOST') ?: '';
    if ($host === '') {
        return false;
    }

    $port = (int) (getenv('SMTP_PORT') ?: '587');
    $secure = strtolower((string) (getenv('SMTP_SECURE') ?: 'tls'));
    $username = getenv('SMTP_USER') ?: '';
    $password = getenv('SMTP_PASSWORD') ?: '';
    $from = getenv('SMTP_FROM') ?: $username;

    if ($from === '') {
        throw new RuntimeException('SMTP_FROM or SMTP_USER is required to send reset email');
    }

    $remote = $secure === 'ssl' ? "ssl://{$host}:{$port}" : "{$host}:{$port}";
    $socket = @stream_socket_client($remote, $errno, $errstr, 15);
    if (!$socket) {
        throw new RuntimeException("Could not connect to SMTP server: {$errstr}");
    }

    stream_set_timeout($socket, 15);

    try {
        $greeting = smtp_read_response($socket);
        if (!str_starts_with($greeting, '220')) {
            throw new RuntimeException('SMTP greeting failed: ' . trim($greeting));
        }

        smtp_command($socket, 'EHLO localhost', ['250']);

        if ($secure === 'tls') {
            smtp_command($socket, 'STARTTLS', ['220']);
            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('Could not enable SMTP TLS');
            }
            smtp_command($socket, 'EHLO localhost', ['250']);
        }

        if ($username !== '') {
            smtp_command($socket, 'AUTH LOGIN', ['334']);
            smtp_command($socket, base64_encode($username), ['334']);
            smtp_command($socket, base64_encode($password), ['235']);
        }

        smtp_command($socket, "MAIL FROM:<{$from}>", ['250']);
        smtp_command($socket, "RCPT TO:<{$to}>", ['250', '251']);
        smtp_command($socket, 'DATA', ['354']);

        $headers = [
            "From: {$from}",
            "To: {$to}",
            "Subject: {$subject}",
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
        ];
        $body = str_replace(["\r\n.", "\n."], ["\r\n..", "\n.."], implode("\r\n", $headers) . "\r\n\r\n" . $message);
        smtp_command($socket, $body . "\r\n.", ['250']);
        smtp_command($socket, 'QUIT', ['221']);
    } finally {
        fclose($socket);
    }

    return true;
}

function send_reset_code(string $email, string $code): string
{
    $subject = 'Your Talking ABC sign in code';
    $message = "Use this code to sign in to Talking ABC. The code expires in 10 minutes.\n\nCode: {$code}";
    $headers = "From: no-reply@talking-abc.local\r\nContent-Type: text/plain; charset=UTF-8";

    try {
        if (send_smtp_mail($email, $subject, $message) || @mail($email, $subject, $message, $headers)) {
            return 'email';
        }
    } catch (Throwable) {
        // Fall through to local logging so the code flow still works during development.
    }

    error_log("Password reset code for {$email}: {$code}");
    file_put_contents(__DIR__ . '/reset-codes.log', date('Y-m-d H:i:s') . " {$email}: {$code}" . PHP_EOL, FILE_APPEND);

    return 'local';
}

function register_user(array $data): array
{
    $fullName = trim((string) ($data['fullName'] ?? ''));
    $email = strtolower(trim((string) ($data['email'] ?? '')));
    $phone = trim((string) ($data['phone'] ?? ''));
    $password = (string) ($data['password'] ?? '');

    if ($fullName === '') {
        throw new InvalidArgumentException('Full name is required');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Valid email is required');
    }
    if (strlen(preg_replace('/\D/', '', $phone)) < 6) {
        throw new InvalidArgumentException('Valid phone number is required');
    }
    if (strlen($password) < 6) {
        throw new InvalidArgumentException('Password must be at least 6 characters');
    }

    [$passwordHash, $passwordSalt] = hash_password_value($password);
    $pdo = db();
    $statement = $pdo->prepare('INSERT INTO users (full_name, email, phone, password_hash, password_salt) VALUES (?, ?, ?, ?, ?)');

    try {
        $statement->execute([$fullName, $email, $phone, $passwordHash, $passwordSalt]);
    } catch (PDOException) {
        throw new InvalidArgumentException('An account with this email already exists');
    }

    $user = $pdo->prepare('SELECT id, full_name, email, phone FROM users WHERE id = ?');
    $user->execute([$pdo->lastInsertId()]);

    return ['ok' => true, 'user' => public_user($user->fetch())];
}

function login_user(array $data): array
{
    $email = strtolower(trim((string) ($data['email'] ?? '')));
    $password = (string) ($data['password'] ?? '');

    if ($email === '') {
        throw new InvalidArgumentException('Email is required');
    }
    if ($password === '') {
        throw new InvalidArgumentException('Password is required');
    }

    $pdo = db();
    $statement = $pdo->prepare('SELECT id, full_name, email, phone, password_hash, password_salt FROM users WHERE email = ?');
    $statement->execute([$email]);
    $row = $statement->fetch();

    if (!$row || !verify_password_value($password, $row['password_hash'], $row['password_salt'])) {
        throw new InvalidArgumentException('Invalid email or password');
    }

    return ['ok' => true, 'user' => public_user($row)];
}

function request_password_reset(array $data): array
{
    $email = strtolower(trim((string) ($data['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Valid email is required');
    }

    $pdo = db();
    $user = $pdo->prepare('SELECT id, email FROM users WHERE email = ?');
    $user->execute([$email]);
    $row = $user->fetch();

    if (!$row) {
        return ['ok' => false, 'needsRegistration' => true, 'message' => 'No account found with this email'];
    }

    $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    [$codeHash, $codeSalt] = hash_password_value($code);
    $pdo->prepare('UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL')->execute([$row['id']]);
    if (use_sqlite_backend()) {
        $expiresAt = date('Y-m-d H:i:s', time() + 600);
        $pdo->prepare('INSERT INTO password_reset_codes (user_id, code_hash, code_salt, expires_at) VALUES (?, ?, ?, ?)')->execute([$row['id'], $codeHash, $codeSalt, $expiresAt]);
    } else {
        $pdo->prepare('INSERT INTO password_reset_codes (user_id, code_hash, code_salt, expires_at) VALUES (?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE))')->execute([$row['id'], $codeHash, $codeSalt]);
    }
    $delivery = send_reset_code($row['email'], $code);

    return ['ok' => true, 'delivery' => $delivery];
}

function verify_reset_code(array $data): array
{
    $email = strtolower(trim((string) ($data['email'] ?? '')));
    $code = trim((string) ($data['code'] ?? ''));

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Valid email is required');
    }
    if ($code === '') {
        throw new InvalidArgumentException('Code is required');
    }

    $pdo = db();
    $statement = $pdo->prepare(
        'SELECT prc.id AS reset_id, prc.code_hash, prc.code_salt, u.id, u.full_name, u.email, u.phone
         FROM password_reset_codes prc
         INNER JOIN users u ON u.id = prc.user_id
         WHERE u.email = ? AND prc.used_at IS NULL AND prc.expires_at > CURRENT_TIMESTAMP
         ORDER BY prc.created_at DESC
         LIMIT 1'
    );
    $statement->execute([$email]);
    $row = $statement->fetch();

    if (!$row || !verify_password_value($code, $row['code_hash'], $row['code_salt'])) {
        throw new InvalidArgumentException('Invalid or expired code');
    }

    $pdo->prepare('UPDATE password_reset_codes SET used_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$row['reset_id']]);

    return ['ok' => true, 'user' => public_user($row)];
}

function score_summary(): array
{
    $pdo = db();
    $lettersLearned = (int) $pdo->query('SELECT COUNT(*) AS total FROM learned_letters')->fetch()['total'];
    $stats = $pdo->query('SELECT games_played, high_score FROM game_stats WHERE id = 1')->fetch();
    $attempts = $pdo->query('SELECT SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct_count, SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) AS wrong_count FROM game_attempts')->fetch();
    $alphabetScore = (int) round(($lettersLearned / 26) * 100);

    return [
        'lettersLearned' => $lettersLearned,
        'gamesPlayed' => (int) ($stats['games_played'] ?? 0),
        'correctAnswers' => (int) ($attempts['correct_count'] ?? 0),
        'wrongAnswers' => (int) ($attempts['wrong_count'] ?? 0),
        'score' => max($alphabetScore, (int) ($stats['high_score'] ?? 0)),
    ];
}

try {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        send_json(200, ['ok' => true]);
        return;
    }

    init_db();
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $method = $_SERVER['REQUEST_METHOD'];
    $data = $method === 'POST' ? read_json() : [];

    if ($method === 'GET' && $path === '/health') {
        send_json(200, [
            'ok' => true,
            'database' => use_sqlite_backend() ? __DIR__ . '/talking_abc.db' : $mysqlDatabase,
            'driver' => use_sqlite_backend() ? 'php-pdo-sqlite' : 'php-pdo-mysql',
        ]);
    } elseif ($method === 'GET' && $path === '/summary') {
        send_json(200, score_summary());
    } elseif ($method === 'POST' && $path === '/register') {
        send_json(200, register_user($data));
    } elseif ($method === 'POST' && $path === '/login') {
        send_json(200, login_user($data));
    } elseif ($method === 'POST' && $path === '/forgot-password') {
        send_json(200, request_password_reset($data));
    } elseif ($method === 'POST' && $path === '/verify-reset-code') {
        send_json(200, verify_reset_code($data));
    } else {
        send_json(404, ['error' => 'Not found']);
    }
} catch (InvalidArgumentException $error) {
    send_json(400, ['error' => $error->getMessage()]);
} catch (Throwable $error) {
    send_json(500, ['error' => $error->getMessage()]);
}
