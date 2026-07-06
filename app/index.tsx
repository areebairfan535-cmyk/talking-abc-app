import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { loadAuthUser } from '@/lib/auth';

export default function IndexScreen() {
  const [target, setTarget] = useState<'/home-menu' | '/login' | null>(null);

  useEffect(() => {
    let active = true;
    loadAuthUser().then((user) => {
      if (active) {
        setTarget(user ? '/home-menu' : '/login');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (!target) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#6d28d9" />
      </View>
    );
  }

  return <Redirect href={target} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f4f1',
  },
});
