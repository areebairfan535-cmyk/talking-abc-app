import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { clearAuthUser } from '@/lib/auth';

type MenuCardProps = {
  title: string;
  icon: React.ReactNode;
  href?: Href;
  onPress?: () => void;
  danger?: boolean;
  color: string;
  textColor?: string;
};

function MenuItemContent({ title, icon, danger, textColor }: Pick<MenuCardProps, 'title' | 'icon' | 'danger' | 'textColor'>) {
  return (
    <>
      <View style={styles.iconBubble}>{icon}</View>
      <Text style={[styles.menuItemTitle, { color: textColor ?? '#fff' }, danger && styles.dangerText]}>{title}</Text>
    </>
  );
}

function MenuItem({ title, icon, href, onPress, danger, color, textColor }: MenuCardProps) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, { backgroundColor: color }]}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress ?? (() => href && router.push(href))}>
      <MenuItemContent title={title} icon={icon} danger={danger} textColor={textColor} />
    </TouchableOpacity>
  );
}

function handleLogout() {
  Alert.alert('Log out', 'Are you sure you want to log out?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Log out',
      style: 'destructive',
      onPress: async () => {
        await clearAuthUser();
        router.replace('/login');
      },
    },
  ]);
}

export default function HomeMenuScreen() {
  return (
    <View style={styles.screen}>
      <View style={styles.topHeader}>
        <View style={styles.homeIcon}>
          <Ionicons name="home-outline" size={28} color="#fff" />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.homeTitle}>Home Menu</Text>
          <Text style={styles.homeSubtitle}>Choose a learning activity</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.headerCard}>
          <View style={styles.brandMark}>
            <Text style={styles.brandText}>ABC</Text>
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.appTitle}>Talking ABC</Text>
            <Text style={styles.greeting}>Welcome back</Text>
            <View style={styles.gradeBadge}>
              <Ionicons name="school-outline" size={15} color="#4c1d95" />
              <Text style={styles.grade}>Early learner</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.quickStartCard}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Start playing, open the game menu"
          onPress={() => router.push('/play-game')}>
          <View style={styles.quickStartIcon}>
            <Ionicons name="game-controller" size={24} color="#6d28d9" />
          </View>
          <View style={styles.quickStartCopy}>
            <Text style={styles.quickStartTitle}>Start Playing</Text>
            <Text style={styles.quickStartSubtitle}>Open the game menu and choose an activity.</Text>
          </View>
          <Ionicons name="arrow-forward" size={22} color="#6d28d9" />
        </TouchableOpacity>

        <View style={styles.menuGrid}>
          <MenuItem
            title="Learn"
            icon={<Ionicons name="book-outline" size={28} color="#fff" />}
            color="#14b8a6"
            href="/learn"
          />
          <MenuItem
            title="Play Game"
            icon={<Ionicons name="game-controller" size={28} color="#fff" />}
            color="#f59e0b"
            href="/play-game"
          />
          <MenuItem
            title="My Score"
            icon={<Ionicons name="star" size={28} color="#fff" />}
            color="#38bdf8"
            href="/my-score"
          />
          <MenuItem
            title="Logout"
            icon={<MaterialCommunityIcons name="door-open" size={28} color="#fff" />}
            color="#ef4444"
            danger
            onPress={handleLogout}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f7f4f1',
    alignItems: 'center',
  },
  panel: {
    width: '100%',
    maxWidth: 390,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 24,
  },
  topHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#6d28d9',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 54,
    paddingBottom: 18,
    shadowColor: '#6d28d9',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 7,
  },
  homeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  homeTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
  },
  homeSubtitle: {
    color: '#ede9fe',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  headerCard: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#9a8f86',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  brandMark: {
    width: 74,
    height: 74,
    borderRadius: 20,
    backgroundColor: '#6d28d9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
  },
  headerCopy: {
    flex: 1,
  },
  appTitle: {
    color: '#333',
    fontSize: 27,
    fontWeight: '900',
  },
  greeting: {
    color: '#626262',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  gradeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ede9fe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
  },
  grade: {
    color: '#4c1d95',
    fontSize: 13,
    fontWeight: '900',
  },
  menuGrid: {
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignSelf: 'center',
  },
  menuItem: {
    width: '48%',
    minHeight: 138,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#9a8f86',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  menuItemPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  iconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  quickStartCard: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#e9d5ff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 14,
    shadowColor: '#9a8f86',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  quickStartIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStartCopy: {
    flex: 1,
  },
  quickStartTitle: {
    color: '#4c1d95',
    fontSize: 18,
    fontWeight: '900',
  },
  quickStartSubtitle: {
    color: '#4c1d95',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  dangerText: {
    color: '#fff',
  },
});
