import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

// expo-router renders this whenever a screen throws during render.
export { AppErrorBoundary as ErrorBoundary } from '@/components/app-error-boundary';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{ headerShown: false, headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen name="verify-code" options={{ headerShown: false }} />
        <Stack.Screen name="home-menu" />
        <Stack.Screen name="learn" />
        <Stack.Screen name="letter/[letter]" />
        <Stack.Screen name="play-game" />
        <Stack.Screen name="my-score" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
