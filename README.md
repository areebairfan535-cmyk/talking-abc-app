<div align="center">

# 🔤 Talking ABC

**An interactive alphabet-learning app for children — hear it, play it, master it.**

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)](https://docs.expo.dev/versions/v54.0.0/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PHP](https://img.shields.io/badge/PHP-8.1%2B-777BB4?logo=php&logoColor=white)](https://www.php.net/)
[![MySQL](https://img.shields.io/badge/MySQL-MariaDB-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 📌 Overview

**Talking ABC** helps children learn the English alphabet through sound, colour and play. Every letter comes with a matching word, a picture and real text-to-speech pronunciation, so learners can *hear* the alphabet rather than just read it.

Beyond the flashcards, four mini-games turn practice into play, while a progress dashboard shows parents and teachers exactly which letters have been mastered and which need more work.

The project is a **full-stack application**: a cross-platform **React Native (Expo)** client backed by a hand-built **PHP MVC** API with a **MySQL** database.

---

## ✨ Features

### For learners
- 🔤 **A–Z flashcards** — each letter paired with a word, emoji illustration and its own colour theme
- 🔊 **Text-to-speech pronunciation** — tap any letter to hear it spoken aloud via `expo-speech`
- 🎮 **Four mini-games** — practice disguised as play:
  | Game | How it works |
  |------|--------------|
  | 🎈 **Balloon Pops** | Tap the balloon carrying the correct letter |
  | 👾 **Feed the Monster** | Give the monster the letter it asks for |
  | 🚂 **Which Letter Is Missing?** | Fill the gap in an alphabet sequence |
  | ❓ **Alphabet Quiz** | Answer mixed alphabet questions |
- 🎨 **Child-friendly UI** — large tap targets, bright colours, haptic feedback

### For parents & teachers
- 📊 **Progress dashboard** — letters learned out of 26, games played, correct vs. wrong answers, overall score
- 🏆 **Per-letter accuracy ranking** — see the strongest and weakest letters, ranked server-side
- 👤 **User accounts** — register, log in, and keep progress tied to a profile
- 🔑 **Password recovery** — reset codes delivered by email over SMTP

---

## 📸 Screenshots

> Add screenshots of the welcome, learn, game and score screens here.

| Learn | Play | Score |
|:-----:|:----:|:-----:|
| _coming soon_ | _coming soon_ | _coming soon_ |

---

## 🛠️ Tech Stack

### Frontend — mobile & web client
| Technology | Purpose |
|------------|---------|
| **Expo SDK 54** | Cross-platform runtime (Android, iOS, Web) |
| **React Native 0.81** + **React 19** | UI framework, New Architecture enabled |
| **TypeScript 5.9** | Static typing across the whole client |
| **Expo Router 6** | File-based navigation with typed routes |
| **expo-speech** | Text-to-speech letter pronunciation |
| **AsyncStorage** | Persists the signed-in session on device |
| **Reanimated 4** + **expo-haptics** | Animations and tactile feedback |

### Backend — REST API
| Technology | Purpose |
|------------|---------|
| **PHP 8.1+** | Hand-rolled MVC framework — no external framework |
| **MySQL / MariaDB** | Persistent storage via PDO |
| **Custom DI container** | Auto-wires controllers and services through reflection |
| **SMTP (PHPMailer-free)** | Sends password-reset codes |

---

## 🏗️ Architecture

```
Expo client (React Native + TypeScript)
        │  HTTP / JSON
        ▼
PHP front controller  →  Router  →  Controller  →  Service  →  Model  →  MySQL
                                        │
                                   DI Container
```

A single entry point (`backend/public/index.php`) boots a PSR-4 autoloader, resolves the route from a hash-map route table, and lets the container construct whatever the controller needs. Controllers stay thin: they validate input and delegate to services, which own the business rules.

### 🧮 Data Structures & Algorithms applied

This project deliberately implements core DSA concepts from scratch rather than reaching for libraries:

| Structure | Where it's used | Complexity |
|-----------|-----------------|------------|
| **LRU Cache** (hash map + doubly linked list) | Memoises the score summary | O(1) get / put |
| **Merge Sort** | Stable ranking of letters by accuracy | O(n log n) |
| **Max Heap** (priority queue) | Top-N strongest letters | O(n log k) |
| **Hash-map router** | Request dispatch | O(1) average |

---

## 📂 Project Structure

```
talking-abc/
├── app/                       # Expo Router screens (file-based routing)
│   ├── index.tsx              #   Welcome / entry
│   ├── login.tsx              #   Sign in
│   ├── register.tsx           #   Create account
│   ├── verify-code.tsx        #   Password-reset code entry
│   ├── home-menu.tsx          #   Main menu
│   ├── learn.tsx              #   A–Z flashcard grid
│   ├── letter/[letter].tsx    #   Single-letter detail
│   ├── play-game.tsx          #   Four mini-games
│   └── my-score.tsx           #   Progress dashboard
├── components/                # Reusable UI (themed text/view, error boundary…)
├── constants/                 # Alphabet data and theme tokens
├── hooks/                     # Colour-scheme and theming hooks
├── lib/
│   ├── database.ts            # Typed API client
│   └── auth.ts                # Session persistence
├── assets/images/             # Icons and splash artwork
├── backend/                   # PHP API — see backend/README.md
│   ├── public/index.php       #   Front controller
│   ├── routes/api.php         #   Route table
│   └── app/                   #   Core, Models, Services, Controllers, DataStructures
├── app.json                   # Expo configuration
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 18+** and npm
- **PHP 8.1+** with the `pdo_mysql` extension enabled
- **MySQL** or **MariaDB** running (XAMPP works out of the box)
- The [Expo Go](https://expo.dev/go) app on your phone, or an Android/iOS emulator

### 1. Clone and install

```bash
git clone https://github.com/areebairfan535-cmyk/talking-abc-app.git
cd talking-abc-app
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Then open `.env` and fill in your values:

```env
# Backend API base URL (leave blank to auto-detect the Expo host on your LAN)
EXPO_PUBLIC_API_URL=http://127.0.0.1:5000

# Database
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=talking_abc

# Optional — SMTP for real password-reset emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=tls
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your-16-char-app-password
SMTP_FROM=you@gmail.com
```

> ⚠️ **Never commit `.env`** — it holds your database and email credentials. It is already listed in `.gitignore`.

### 3. Start the backend

```bash
php -S 0.0.0.0:5000 backend/public/index.php
```

The database and all tables are created automatically on the first request. Verify it is alive:

```bash
curl http://127.0.0.1:5000/health
```

### 4. Start the app

```bash
npm start
```

Then press `a` for Android, `i` for iOS, `w` for web — or scan the QR code with Expo Go.

### 5. Point the app at your backend

Set `EXPO_PUBLIC_API_URL` in `.env` to match how the device reaches your machine:

| Running on | URL |
|------------|-----|
| Web / iOS simulator | `http://127.0.0.1:5000` |
| Android emulator | `http://10.0.2.2:5000` |
| Physical phone | `http://<YOUR_LAN_IP>:5000` |

---

## 📡 API Reference

Base URL: `http://<host>:5000`

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| `GET` | `/health` | — | `{ok, database, driver}` |
| `POST` | `/register` | `{fullName, email, phone, password}` | `{ok, user}` |
| `POST` | `/login` | `{email, password}` | `{ok, user}` |
| `POST` | `/forgot-password` | `{email}` | `{ok, delivery}` |
| `POST` | `/verify-reset-code` | `{email, code}` | `{ok, user}` |
| `GET` | `/summary` | — | `{lettersLearned, gamesPlayed, correctAnswers, wrongAnswers, score}` |
| `POST` | `/learned-letter` | `{letter, word}` | `{ok, summary}` |
| `POST` | `/game-attempt` | `{mode, targetLetter, targetWord, selectedAnswer, correctAnswer, isCorrect}` | `{ok, summary}` |
| `GET` | `/letter-stats` | — | `{letters[], strongest[]}` ranked by accuracy |

Full backend documentation lives in [`backend/README.md`](backend/README.md).

---

## 📜 Available Scripts

| Command | What it does |
|---------|--------------|
| `npm start` | Start the Expo dev server |
| `npm run android` | Launch on an Android device or emulator |
| `npm run ios` | Launch on an iOS simulator |
| `npm run web` | Run in the browser |
| `npm run lint` | Lint the codebase with ESLint |

---

## 🗺️ Roadmap

- [ ] Add screenshots and a demo video
- [ ] Urdu alphabet mode alongside English
- [ ] Offline-first mode with local progress sync
- [ ] Recording and playback so children can compare their own pronunciation
- [ ] Multiple child profiles under one parent account
- [ ] Automated test suite (Jest + PHPUnit)

---

## 👩‍💻 Author

**Areeba Irfan**
IT Graduate · Mobile App & Full-Stack Developer

[![GitHub](https://img.shields.io/badge/GitHub-areebairfan535--cmyk-181717?logo=github&logoColor=white)](https://github.com/areebairfan535-cmyk)

---

## 📄 License

Released under the **MIT License** — see [LICENSE](LICENSE) for details.

<div align="center">

Made with ❤️ to make learning the alphabet a little more fun.

</div>
