import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthUser } from '@/lib/database';

const AUTH_USER_KEY = 'talking-abc.auth.user';

// Persist the signed-in user so the session survives an app restart.
export async function saveAuthUser(user: AuthUser): Promise<void> {
  try {
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    // Storage failures should not block navigation.
  }
}

export async function loadAuthUser(): Promise<AuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export async function clearAuthUser(): Promise<void> {
  try {
    await AsyncStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // Ignore — nothing else we can do on logout.
  }
}
