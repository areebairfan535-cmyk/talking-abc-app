import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { AlphabetItem } from '@/constants/alphabet';

export type ScoreSummary = {
  lettersLearned: number;
  gamesPlayed: number;
  correctAnswers: number;
  wrongAnswers: number;
  score: number;
};

export type GameAttemptInput = {
  mode: string;
  targetLetter: string;
  targetWord: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
};

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  phone: string;
};

export type RegisterInput = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type ForgotPasswordInput = {
  email: string;
};

export type PasswordResetResponse = {
  ok: boolean;
  needsRegistration?: boolean;
  message?: string;
  delivery?: 'email' | 'local';
};

export type VerifyResetCodeInput = {
  email: string;
  code: string;
};

type ApiResponse<T> = T & {
  error?: string;
};

function hostToApiUrl(hostUri?: string) {
  const host = hostUri?.split(':')[0];

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:5000`;
  }

  return undefined;
}

function getDefaultApiUrl() {
  if (Platform.OS === 'web') {
    const webHost = typeof window !== 'undefined' ? window.location.hostname : '';
    const webApiUrl = hostToApiUrl(webHost);

    return webApiUrl ?? 'http://127.0.0.1:5000';
  }

  const platformHostUri =
    typeof Constants.platform === 'object' && Constants.platform !== null && 'hostUri' in Constants.platform
      ? String(Constants.platform.hostUri)
      : undefined;
  const expoHostApiUrl = hostToApiUrl(Constants.expoConfig?.hostUri) ?? hostToApiUrl(platformHostUri);

  return expoHostApiUrl ?? (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://127.0.0.1:5000');
}

const defaultApiUrl = getDefaultApiUrl();
const REQUEST_TIMEOUT_MS = 20000;

function uniqueUrls(urls: (string | undefined)[]) {
  return Array.from(
    new Set(
      urls
        .filter((url): url is string => Boolean(url))
        .map((url) => url.replace(/\/$/, ''))
    )
  );
}

function getApiUrls() {
  const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (Platform.OS === 'web') {
    return uniqueUrls([configuredApiUrl, defaultApiUrl, 'http://127.0.0.1:5000']);
  }

  return uniqueUrls([
    configuredApiUrl,
    defaultApiUrl,
    Platform.OS === 'android' ? 'http://10.0.2.2:5000' : undefined,
    'http://127.0.0.1:5000',
  ]);
}

function isReachabilityError(error: unknown) {
  return (
    error instanceof TypeError ||
    (typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name?: string }).name === 'AbortError')
  );
}

async function fetchJson<T>(apiUrl: string, path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        // Skip the localtunnel (*.loca.lt) browser reminder page for API calls.
        'Bypass-Tunnel-Reminder': 'true',
        ...options?.headers,
      },
    });
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(payload.error ?? `Backend request failed with ${response.status}`);
  }

  return payload;
}

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const apiUrls = getApiUrls();
  const failedUrls: string[] = [];

  for (const apiUrl of apiUrls) {
    try {
      return await fetchJson<T>(apiUrl, path, options);
    } catch (error) {
      if (isReachabilityError(error)) {
        failedUrls.push(apiUrl);
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    `Cannot reach backend. Tried: ${failedUrls.join(', ')}. Open ${apiUrls[0]}/health to check the backend.`
  );
}

export async function markLetterLearned(item: AlphabetItem): Promise<ScoreSummary> {
  const payload = await requestJson<{ summary: ScoreSummary }>('/learned-letter', {
    method: 'POST',
    body: JSON.stringify({
      letter: item.letter,
      word: item.word,
    }),
  });

  return payload.summary;
}

export async function recordGameAttempt(attempt: GameAttemptInput): Promise<ScoreSummary> {
  const payload = await requestJson<{ summary: ScoreSummary }>('/game-attempt', {
    method: 'POST',
    body: JSON.stringify(attempt),
  });

  return payload.summary;
}

export async function getScoreSummary(): Promise<ScoreSummary> {
  return requestJson<ScoreSummary>('/summary');
}

export async function registerUser(input: RegisterInput): Promise<AuthUser> {
  const payload = await requestJson<{ user: AuthUser }>('/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return payload.user;
}

export async function loginUser(input: LoginInput): Promise<AuthUser> {
  const payload = await requestJson<{ user: AuthUser }>('/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return payload.user;
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<PasswordResetResponse> {
  return requestJson<PasswordResetResponse>('/forgot-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function verifyResetCode(input: VerifyResetCodeInput): Promise<AuthUser> {
  const payload = await requestJson<{ user: AuthUser }>('/verify-reset-code', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return payload.user;
}

export async function checkBackendHealth() {
  return requestJson<{ ok: boolean; database: string }>('/health');
}
