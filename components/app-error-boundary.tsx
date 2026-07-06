import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ErrorBoundaryProps = {
  error: Error;
  retry: () => Promise<void>;
};

// Rendered by expo-router whenever a screen throws during render.
export function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.iconBubble}>
        <Ionicons name="sad-outline" size={40} color="#fff" />
      </View>
      <Text style={styles.title}>Oops! Something broke.</Text>
      <Text style={styles.message}>Do not worry — you can try again.</Text>
      {__DEV__ ? <Text style={styles.detail}>{error.message}</Text> : null}
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.85}
        onPress={() => retry()}
        accessibilityRole="button"
        accessibilityLabel="Try again"
      >
        <Ionicons name="refresh" size={20} color="#fff" />
        <Text style={styles.buttonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f4f1',
    paddingHorizontal: 28,
  },
  iconBubble: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#2f2550',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  detail: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#6d28d9',
    borderRadius: 16,
    paddingHorizontal: 24,
    height: 54,
    marginTop: 26,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },
});
