<?php

declare(strict_types=1);

namespace App\Database;

use App\Core\Database;

/**
 * Idempotent schema bootstrap. Creates the MySQL tables if they do not exist
 * and seeds the single game_stats row.
 */
final class Schema
{
    public static function migrate(): void
    {
        $pdo = Database::connection();

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
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        ];

        foreach ($statements as $sql) {
            $pdo->exec($sql);
        }

        $pdo->exec('INSERT INTO game_stats (id, games_played, high_score) VALUES (1, 0, 0)
                    ON DUPLICATE KEY UPDATE id = id');
    }
}
