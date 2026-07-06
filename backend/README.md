# Talking ABC — PHP Backend (MVC + OOP + DSA)

A small but fully object-oriented API for the Talking ABC app, built on **PHP 8 + MySQL/MariaDB** with a hand-rolled **MVC** stack, a **dependency-injection container**, and applied **data structures & algorithms**.

## Architecture

```
backend/
├── public/
│   └── index.php            # Front controller + PSR-4 autoloader (single entry point)
├── config/
│   └── config.php           # Env-driven configuration
├── routes/
│   └── api.php              # Route table: METHOD path -> [Controller, action]
├── app/
│   ├── Core/                # Framework: App, Router, Container (DI), Request,
│   │                        #   Response, Controller, Model, Database, Config,
│   │                        #   Validator, Env
│   ├── Exceptions/          # HttpException, ValidationException, NotFoundException
│   ├── DataStructures/      # Node, DoublyLinkedList, LRUCache, MergeSort, MaxHeap
│   ├── Models/              # User, LearnedLetter, GameAttempt, LetterStat,
│   │                        #   GameStat, PasswordResetCode  (Active-Record style)
│   ├── Services/            # AuthService, ScoreService, MailService, PasswordHasher
│   ├── Http/Controllers/    # Health, Auth, Score, Game, Letter
│   └── Database/Schema.php  # Idempotent table migration
└── _legacy/                 # Previous single-file backend (kept for reference)
```

### Concepts applied
- **MVC** — Controllers handle HTTP, Models own persistence, `Response` is the JSON "view".
- **OOP** — namespaces, abstract base classes, interfaces via type hints, encapsulation, readonly value objects, constructor injection.
- **Dependency Injection** — `Core\Container` auto-wires controller/service dependencies via reflection.
- **DSA**
  - `LRUCache` (hash map + doubly linked list) memoises the score summary — O(1) get/put.
  - `MergeSort` — stable O(n log n) ranking of letters by accuracy (`/letter-stats`).
  - `MaxHeap` (priority queue) — top-N strongest letters in O(n log k).
  - `Router` — O(1) average dispatch via a hash-map route table.

## Requirements
- PHP 8.1+ with `pdo_mysql` enabled
- MySQL / MariaDB running (XAMPP default: `127.0.0.1:3306`, user `root`, no password)

The database and tables are created automatically on first request.

## Run

```powershell
php -S 0.0.0.0:5000 backend/public/index.php
```

Server: `http://0.0.0.0:5000`. Frontend API URLs:
- Web / iOS simulator: `http://127.0.0.1:5000`
- Android emulator: `http://10.0.2.2:5000`
- Physical phone: `http://<YOUR_LAN_IP>:5000`

## Configuration (project `.env`)

```
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=talking_abc

# Optional — Gmail SMTP for real reset emails (else code is logged to backend/storage/reset-codes.log)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=tls
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM=you@gmail.com
```

## Endpoints

| Method | Path                 | Body                                                                      | Returns |
|--------|----------------------|---------------------------------------------------------------------------|---------|
| GET    | `/health`            | —                                                                         | `{ok, database, driver}` |
| POST   | `/register`          | `{fullName, email, phone, password}`                                      | `{ok, user}` |
| POST   | `/login`             | `{email, password}`                                                       | `{ok, user}` |
| POST   | `/forgot-password`   | `{email}`                                                                 | `{ok, delivery}` / `{ok:false, needsRegistration}` |
| POST   | `/verify-reset-code` | `{email, code}`                                                           | `{ok, user}` |
| GET    | `/summary`           | —                                                                         | `{lettersLearned, gamesPlayed, correctAnswers, wrongAnswers, score}` |
| POST   | `/learned-letter`    | `{letter, word}`                                                          | `{ok, summary}` |
| POST   | `/game-attempt`      | `{mode, targetLetter, targetWord, selectedAnswer, correctAnswer, isCorrect}` | `{ok, summary}` |
| GET    | `/letter-stats`      | —                                                                         | `{letters[], strongest[]}` (ranked by accuracy) |
