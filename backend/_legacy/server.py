from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import hashlib
import hmac
import json
import os
import secrets
import smtplib
from email.message import EmailMessage
from urllib.parse import urlparse

import mysql.connector


def load_env_file(path):
    if not os.path.isfile(path):
        return

    with open(path, "r", encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            name, value = line.split("=", 1)
            os.environ.setdefault(name.strip(), value.strip().strip("\"'"))


load_env_file(os.path.join(os.path.dirname(__file__), "..", ".env"))

HOST = "0.0.0.0"
PORT = 5000
MYSQL_HOST = os.getenv("MYSQL_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "talking_abc")
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "no-reply@talking-abc.local")


def mysql_config(include_database=True):
    config = {
        "host": MYSQL_HOST,
        "port": MYSQL_PORT,
        "user": MYSQL_USER,
        "password": MYSQL_PASSWORD,
        "charset": "utf8mb4",
        "use_unicode": True,
    }
    if include_database:
        config["database"] = MYSQL_DATABASE
    return config


def connect_db(include_database=True):
    return mysql.connector.connect(**mysql_config(include_database))


def init_db():
    server_conn = connect_db(include_database=False)
    try:
        cursor = server_conn.cursor()
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DATABASE}` "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        )
        server_conn.commit()
        cursor.close()
    finally:
        server_conn.close()

    conn = connect_db()
    try:
        cursor = conn.cursor()
        statements = [
            """
            CREATE TABLE IF NOT EXISTS learned_letters (
              letter VARCHAR(1) PRIMARY KEY NOT NULL,
              word VARCHAR(100) NOT NULL,
              learned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """,
            """
            CREATE TABLE IF NOT EXISTS game_stats (
              id INT PRIMARY KEY NOT NULL,
              games_played INT NOT NULL DEFAULT 0,
              high_score INT NOT NULL DEFAULT 0,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              CONSTRAINT game_stats_single_row CHECK (id = 1)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """,
            """
            CREATE TABLE IF NOT EXISTS game_attempts (
              id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
              mode VARCHAR(60) NOT NULL,
              target_letter VARCHAR(1) NOT NULL,
              target_word VARCHAR(100) NOT NULL,
              selected_answer VARCHAR(20) NOT NULL,
              correct_answer VARCHAR(20) NOT NULL,
              is_correct TINYINT(1) NOT NULL,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """,
            """
            CREATE TABLE IF NOT EXISTS letter_stats (
              letter VARCHAR(1) PRIMARY KEY NOT NULL,
              word VARCHAR(100) NOT NULL,
              correct_count INT NOT NULL DEFAULT 0,
              wrong_count INT NOT NULL DEFAULT 0,
              updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """,
            """
            CREATE TABLE IF NOT EXISTS users (
              id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
              full_name VARCHAR(120) NOT NULL,
              email VARCHAR(190) NOT NULL UNIQUE,
              phone VARCHAR(40) NOT NULL,
              password_hash VARCHAR(128) NOT NULL,
              password_salt VARCHAR(64) NOT NULL,
              created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """,
            """
            CREATE TABLE IF NOT EXISTS password_reset_codes (
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """,
        ]
        for statement in statements:
            cursor.execute(statement)
        cursor.execute(
            """
            INSERT INTO game_stats (id, games_played, high_score)
            VALUES (1, 0, 0)
            ON DUPLICATE KEY UPDATE id = id
            """
        )
        conn.commit()
        cursor.close()
    finally:
        conn.close()


def public_user(row):
    return {
        "id": row["id"],
        "fullName": row["full_name"],
        "email": row["email"],
        "phone": row["phone"],
    }


def hash_password(password, salt=None):
    password_salt = salt or secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        password_salt.encode("utf-8"),
        120000,
    ).hex()
    return password_hash, password_salt


def verify_password(password, password_hash, password_salt):
    next_hash, _ = hash_password(password, password_salt)
    return hmac.compare_digest(next_hash, password_hash)


def send_reset_email(email, code):
    if not SMTP_HOST:
        print(f"Password reset code for {email}: {code}")
        with open(os.path.join(os.path.dirname(__file__), "reset-codes.log"), "a", encoding="utf-8") as log_file:
            log_file.write(f"{email}: {code}\n")
        return False

    message = EmailMessage()
    message["Subject"] = "Your Talking ABC sign in code"
    message["From"] = SMTP_FROM
    message["To"] = email
    message.set_content(
        "Use this code to sign in to Talking ABC. "
        f"The code expires in 10 minutes.\n\nCode: {code}"
    )

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
            smtp.starttls()
            if SMTP_USER:
                smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.send_message(message)
    except Exception:
        print(f"Password reset code for {email}: {code}")
        with open(os.path.join(os.path.dirname(__file__), "reset-codes.log"), "a", encoding="utf-8") as log_file:
            log_file.write(f"{email}: {code}\n")
        return False

    return True


def register_user(data):
    full_name = str(data.get("fullName", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    phone = str(data.get("phone", "")).strip()
    password = str(data.get("password", ""))

    if not full_name:
        raise ValueError("Full name is required")
    if "@" not in email or "." not in email:
        raise ValueError("Valid email is required")
    if len("".join(ch for ch in phone if ch.isdigit())) < 6:
        raise ValueError("Valid phone number is required")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters")

    password_hash, password_salt = hash_password(password)

    conn = connect_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            INSERT INTO users (full_name, email, phone, password_hash, password_salt)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (full_name, email, phone, password_hash, password_salt),
        )
        cursor.execute(
            "SELECT id, full_name, email, phone FROM users WHERE id = %s",
            (cursor.lastrowid,),
        )
        row = cursor.fetchone()
        conn.commit()
        cursor.close()
    except mysql.connector.IntegrityError:
        raise ValueError("An account with this email already exists")
    finally:
        conn.close()

    return {"ok": True, "user": public_user(row)}


def login_user(data):
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email:
        raise ValueError("Email is required")
    if not password:
        raise ValueError("Password is required")

    conn = connect_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, full_name, email, phone, password_hash, password_salt
            FROM users
            WHERE email = %s
            """,
            (email,),
        )
        row = cursor.fetchone()
        cursor.close()
    finally:
        conn.close()

    if not row or not verify_password(password, row["password_hash"], row["password_salt"]):
        raise ValueError("Invalid email or password")

    return {"ok": True, "user": public_user(row)}


def request_password_reset(data):
    email = str(data.get("email", "")).strip().lower()

    if "@" not in email or "." not in email:
        raise ValueError("Valid email is required")

    conn = connect_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, email FROM users WHERE email = %s",
            (email,),
        )
        row = cursor.fetchone()

        if not row:
            cursor.close()
            return {"ok": False, "needsRegistration": True, "message": "No account found with this email"}

        code = f"{secrets.randbelow(1000000):06d}"
        code_hash, code_salt = hash_password(code)
        cursor.execute(
            """
            UPDATE password_reset_codes
            SET used_at = CURRENT_TIMESTAMP
            WHERE user_id = %s AND used_at IS NULL
            """,
            (row["id"],),
        )
        cursor.execute(
            """
            INSERT INTO password_reset_codes (user_id, code_hash, code_salt, expires_at)
            VALUES (%s, %s, %s, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE))
            """,
            (row["id"], code_hash, code_salt),
        )
        conn.commit()
        sent_by_email = send_reset_email(row["email"], code)
        cursor.close()
    finally:
        conn.close()

    return {"ok": True, "delivery": "email" if sent_by_email else "local"}


def verify_reset_code(data):
    email = str(data.get("email", "")).strip().lower()
    code = str(data.get("code", "")).strip()

    if "@" not in email or "." not in email:
        raise ValueError("Valid email is required")
    if not code:
        raise ValueError("Code is required")

    conn = connect_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT
              prc.id AS reset_id,
              prc.code_hash,
              prc.code_salt,
              prc.expires_at,
              u.id,
              u.full_name,
              u.email,
              u.phone
            FROM password_reset_codes prc
            INNER JOIN users u ON u.id = prc.user_id
            WHERE u.email = %s
              AND prc.used_at IS NULL
              AND prc.expires_at > CURRENT_TIMESTAMP
            ORDER BY prc.created_at DESC
            LIMIT 1
            """,
            (email,),
        )
        row = cursor.fetchone()

        if not row or not verify_password(code, row["code_hash"], row["code_salt"]):
            raise ValueError("Invalid or expired code")

        cursor.execute(
            """
            UPDATE password_reset_codes
            SET used_at = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (row["reset_id"],),
        )
        conn.commit()
        cursor.close()
    finally:
        conn.close()

    return {"ok": True, "user": public_user(row)}


def score_summary():
    conn = connect_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT COUNT(*) AS total FROM learned_letters")
        learned = cursor.fetchone()
        cursor.execute(
            "SELECT games_played, high_score FROM game_stats WHERE id = 1"
        )
        stats = cursor.fetchone()
        cursor.execute(
            """
            SELECT
              SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct,
              SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) AS wrong
            FROM game_attempts
            """
        )
        attempts = cursor.fetchone()
        cursor.close()
    finally:
        conn.close()

    letters_learned = int(learned["total"] if learned else 0)
    alphabet_score = round((letters_learned / 26) * 100)
    high_score = int(stats["high_score"] if stats else 0)

    return {
        "lettersLearned": letters_learned,
        "gamesPlayed": int(stats["games_played"] if stats else 0),
        "correctAnswers": int(attempts["correct"] or 0),
        "wrongAnswers": int(attempts["wrong"] or 0),
        "score": max(alphabet_score, high_score),
    }


def mark_letter(data):
    letter = str(data.get("letter", "")).strip().upper()
    word = str(data.get("word", "")).strip()

    if not letter or not word:
        raise ValueError("letter and word are required")

    conn = connect_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT IGNORE INTO learned_letters (letter, word)
            VALUES (%s, %s)
            """,
            (letter, word),
        )
        conn.commit()
        cursor.close()
    finally:
        conn.close()

    return {"ok": True, "summary": score_summary()}


def record_attempt(data):
    mode = str(data.get("mode", "")).strip()
    target_letter = str(data.get("targetLetter", "")).strip().upper()
    target_word = str(data.get("targetWord", "")).strip()
    selected_answer = str(data.get("selectedAnswer", "")).strip().upper()
    correct_answer = str(data.get("correctAnswer", "")).strip().upper()
    is_correct = bool(data.get("isCorrect"))

    if not all([mode, target_letter, target_word, selected_answer, correct_answer]):
        raise ValueError("mode, targetLetter, targetWord, selectedAnswer, and correctAnswer are required")

    conn = connect_db()
    try:
        cursor = conn.cursor()
        conn.start_transaction()
        cursor.execute(
            """
            INSERT INTO game_attempts (
              mode,
              target_letter,
              target_word,
              selected_answer,
              correct_answer,
              is_correct
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (mode, target_letter, target_word, selected_answer, correct_answer, 1 if is_correct else 0),
        )
        cursor.execute(
            """
            INSERT INTO letter_stats (letter, word, correct_count, wrong_count)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
              word = VALUES(word),
              correct_count = correct_count + VALUES(correct_count),
              wrong_count = wrong_count + VALUES(wrong_count),
              updated_at = CURRENT_TIMESTAMP
            """,
            (correct_answer, target_word, 1 if is_correct else 0, 0 if is_correct else 1),
        )
        cursor.execute(
            """
            UPDATE game_stats
            SET
              games_played = games_played + 1,
              high_score = GREATEST(high_score, %s),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
            """,
            (100 if is_correct else 0,),
        )
        conn.commit()
        cursor.close()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return {"ok": True, "summary": score_summary()}


def letter_stats():
    conn = connect_db()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT
              letter,
              word,
              correct_count,
              wrong_count,
              DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
            FROM letter_stats
            ORDER BY letter
            """
        )
        rows = cursor.fetchall()
        cursor.close()
    finally:
        conn.close()

    return {"letters": rows}


class RequestHandler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        raw_body = self.rfile.read(length)
        return json.loads(raw_body.decode("utf-8"))

    def do_OPTIONS(self):
        self._send_json(200, {"ok": True})

    def do_GET(self):
        path = urlparse(self.path).path

        try:
            if path == "/health":
                self._send_json(200, {"ok": True, "database": MYSQL_DATABASE, "driver": "mysql"})
            elif path == "/summary":
                self._send_json(200, score_summary())
            elif path == "/letter-stats":
                self._send_json(200, letter_stats())
            else:
                self._send_json(404, {"error": "Not found"})
        except Exception as exc:
            self._send_json(500, {"error": str(exc)})

    def do_POST(self):
        path = urlparse(self.path).path

        try:
            data = self._read_json()
            if path == "/learned-letter":
                self._send_json(200, mark_letter(data))
            elif path == "/game-attempt":
                self._send_json(200, record_attempt(data))
            elif path == "/register":
                self._send_json(200, register_user(data))
            elif path == "/login":
                self._send_json(200, login_user(data))
            elif path == "/forgot-password":
                self._send_json(200, request_password_reset(data))
            elif path == "/verify-reset-code":
                self._send_json(200, verify_reset_code(data))
            else:
                self._send_json(404, {"error": "Not found"})
        except ValueError as exc:
            self._send_json(400, {"error": str(exc)})
        except json.JSONDecodeError:
            self._send_json(400, {"error": "Invalid JSON"})
        except Exception as exc:
            self._send_json(500, {"error": str(exc)})

    def log_message(self, format, *args):
        print("%s - %s" % (self.address_string(), format % args))


def main():
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), RequestHandler)
    print(f"Talking ABC backend running at http://{HOST}:{PORT}")
    print(f"MySQL database: {MYSQL_DATABASE} on {MYSQL_HOST}:{MYSQL_PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
