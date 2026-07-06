import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getScoreSummary, type ScoreSummary } from '@/lib/database';

export default function MyScoreScreen() {
  const [summary, setSummary] = useState<ScoreSummary>({
    lettersLearned: 0,
    gamesPlayed: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    score: 0,
  });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      getScoreSummary()
        .then((nextSummary) => {
          if (isActive) {
            setSummary(nextSummary);
          }
        })
        .catch((error) => {
          console.warn('Could not load score summary', error);
        });

      return () => {
        isActive = false;
      };
    }, [])
  );

  const progressPercent = Math.min(100, Math.round((summary.lettersLearned / 26) * 100));

  return (
    <View style={styles.screen}>
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.headerBackButton} activeOpacity={0.85} onPress={() => router.replace('/home-menu')}>
          <Ionicons name="chevron-back" size={23} color="#6d28d9" />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Ionicons name="star" size={28} color="#fff" />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>My Score</Text>
          <Text style={styles.headerSubtitle}>Track learning progress</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.scoreCard}>
          <View style={styles.progressBlock}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>ABC progress</Text>
              <Text style={styles.progressValue}>{summary.lettersLearned}/26</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{summary.gamesPlayed}</Text>
              <Text style={styles.statLabel}>Games</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{summary.correctAnswers}</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{summary.wrongAnswers}</Text>
              <Text style={styles.statLabel}>Wrong</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{progressPercent}%</Text>
              <Text style={styles.statLabel}>Learned</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f7f4f1',
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
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#ede9fe',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  headerBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2f2550',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 5,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#9a8f86',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  progressBlock: {
    width: '100%',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressTitle: {
    color: '#626262',
    fontSize: 16,
    fontWeight: '800',
  },
  progressValue: {
    color: '#4c1d95',
    fontSize: 16,
    fontWeight: '900',
  },
  progressTrack: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#eee7df',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 7,
    backgroundColor: '#6d28d9',
  },
  statGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  statBox: {
    width: '48%',
    minHeight: 86,
    borderRadius: 16,
    backgroundColor: '#f7f4f1',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  statValue: {
    color: '#4c1d95',
    fontSize: 28,
    fontWeight: '900',
  },
  statLabel: {
    color: '#626262',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
  },
});
