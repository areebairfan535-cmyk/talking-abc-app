<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Config;
use RuntimeException;

/**
 * Minimal SMTP client for delivering the password-reset code.
 *
 * Falls back to writing the code into a local log file when SMTP is not
 * configured or unreachable, so the dev flow never breaks.
 */
final class MailService
{
    /** @var array<string,mixed> */
    private array $config;

    public function __construct()
    {
        $this->config = Config::get('mail', []);
    }

    /**
     * @return 'email'|'local' delivery channel used.
     */
    public function sendResetCode(string $to, string $code): string
    {
        $subject = 'Your Talking ABC sign in code';
        $message = "Use this code to sign in to Talking ABC. The code expires in 10 minutes.\n\nCode: {$code}";

        try {
            if ($this->sendSmtp($to, $subject, $message)) {
                return 'email';
            }
        } catch (\Throwable) {
            // Fall through to local logging.
        }

        $logPath = dirname(__DIR__, 2) . '/storage/reset-codes.log';
        @mkdir(dirname($logPath), 0777, true);
        file_put_contents($logPath, date('Y-m-d H:i:s') . " {$to}: {$code}" . PHP_EOL, FILE_APPEND);

        return 'local';
    }

    private function sendSmtp(string $to, string $subject, string $message): bool
    {
        $host = (string) $this->config['host'];
        if ($host === '') {
            return false;
        }

        $port = (int) $this->config['port'];
        $secure = (string) $this->config['secure'];
        $user = (string) $this->config['user'];
        $password = (string) $this->config['password'];
        $from = (string) $this->config['from'];

        if ($from === '') {
            throw new RuntimeException('SMTP_FROM or SMTP_USER is required to send reset email');
        }

        $remote = $secure === 'ssl' ? "ssl://{$host}:{$port}" : "{$host}:{$port}";
        $socket = @stream_socket_client($remote, $errno, $errstr, 15);
        if (!$socket) {
            throw new RuntimeException("Could not connect to SMTP server: {$errstr}");
        }

        try {
            $this->expect($socket, '220');
            $this->command($socket, 'EHLO localhost', '250');

            if ($secure === 'tls') {
                $this->command($socket, 'STARTTLS', '220');
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new RuntimeException('Could not enable SMTP TLS');
                }
                $this->command($socket, 'EHLO localhost', '250');
            }

            if ($user !== '') {
                $this->command($socket, 'AUTH LOGIN', '334');
                $this->command($socket, base64_encode($user), '334');
                $this->command($socket, base64_encode($password), '235');
            }

            $this->command($socket, "MAIL FROM:<{$from}>", '250');
            $this->command($socket, "RCPT TO:<{$to}>", ['250', '251']);
            $this->command($socket, 'DATA', '354');

            $headers = "From: Talking ABC <{$from}>\r\n"
                . "To: <{$to}>\r\n"
                . "Subject: {$subject}\r\n"
                . "MIME-Version: 1.0\r\n"
                . "Content-Type: text/plain; charset=UTF-8\r\n";
            $body = $headers . "\r\n" . $message;
            $this->command($socket, $body . "\r\n.", '250');
            $this->command($socket, 'QUIT', '221');
        } finally {
            fclose($socket);
        }

        return true;
    }

    /**
     * @param resource $socket
     */
    private function expect($socket, string $code): string
    {
        $response = '';
        while (($line = fgets($socket, 515)) !== false) {
            $response .= $line;
            if (strlen($line) >= 4 && $line[3] === ' ') {
                break;
            }
        }
        if (!str_starts_with($response, $code)) {
            throw new RuntimeException('Unexpected SMTP reply: ' . trim($response));
        }

        return $response;
    }

    /**
     * @param resource $socket
     * @param string|list<string> $expected
     */
    private function command($socket, string $command, string|array $expected): string
    {
        fwrite($socket, $command . "\r\n");

        $response = '';
        while (($line = fgets($socket, 515)) !== false) {
            $response .= $line;
            if (strlen($line) >= 4 && $line[3] === ' ') {
                break;
            }
        }

        $codes = (array) $expected;
        foreach ($codes as $code) {
            if (str_starts_with($response, $code)) {
                return $response;
            }
        }

        throw new RuntimeException('SMTP command failed: ' . trim($response));
    }
}
