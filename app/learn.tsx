import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { alphabetItems } from '@/constants/alphabet';
import { getScoreSummary, markLetterLearned, type ScoreSummary } from '@/lib/database';

export default function LearnScreen() {
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [summary, setSummary] = useState<ScoreSummary>({
    lettersLearned: 0,
    gamesPlayed: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    score: 0,
  });

  const loadSummary = useCallback(() => {
    getScoreSummary()
      .then(setSummary)
      .catch((error) => {
        console.warn('Could not load score summary', error);
      });
  }, []);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const speak = (text: string) => {
    Speech.stop();
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.1,
      rate: 0.55,
    });
  };

  const selectLetter = (index: number) => {
    const selectedItem = alphabetItems[index];

    setCurrentIndex(index);
    speak(`${selectedItem.letter} for ${selectedItem.word}`);
    markLetterLearned(selectedItem)
      .then(setSummary)
      .catch((error) => {
        console.warn('Could not save learned letter', error);
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#6d28d9" />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.headerBackButton}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Go back to home menu"
            onPress={() => router.replace('/home-menu')}
          >
            <Ionicons name="chevron-back" size={23} color="#6d28d9" />
          </TouchableOpacity>
          <View style={styles.headerIcon}>
            <Ionicons name="book-outline" size={28} color="#fff" />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Learn ABC</Text>
            <Text style={styles.headerSubtitle}>Build alphabet confidence</Text>
          </View>
        </View>

        <View style={styles.learnSection}>
          <Text style={styles.sectionSubtitle}>Learn letters from A to Z. Tap the speaker to hear each word slowly.</Text>

          <View style={styles.letterGrid}>
            {alphabetItems.map((alphabetItem, index) => {
              const isActive = index === currentIndex;

              return (
                <TouchableOpacity
                  key={alphabetItem.letter}
                  style={[
                    styles.letterCard,
                    { backgroundColor: alphabetItem.color },
                    isActive && styles.activeLetterCard,
                  ]}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`${alphabetItem.letter} for ${alphabetItem.word}. Tap to hear it.`}
                  onPress={() => selectLetter(index)}
                >
                  <Text style={styles.letter}>{alphabetItem.letter}</Text>
                  <Text style={styles.phrase}>
                    {alphabetItem.letter} for {alphabetItem.word}
                  </Text>
                  <Text style={styles.picture} accessibilityElementsHidden importantForAccessibility="no">
                    {alphabetItem.picture}
                  </Text>
                  <TouchableOpacity
                    style={styles.smallSpeaker}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Hear ${alphabetItem.letter}`}
                    onPress={() => selectLetter(index)}
                  >
                    <Ionicons name="volume-high" size={16} color="#fff" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.nextButton} activeOpacity={0.85} onPress={() => router.push('/play-game')}>
            <Text style={styles.nextButtonText}>Next: 2. Play Game</Text>
            <Ionicons name="arrow-forward" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.scoreSection}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="star" size={30} color="#f59e0b" />
            <Text style={styles.sectionTitle}>My Score</Text>
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Letters learned</Text>
            <Text style={styles.scoreValue}>{summary.lettersLearned}/26</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Games played</Text>
            <Text style={styles.scoreValue}>{summary.gamesPlayed}</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Correct answers</Text>
            <Text style={styles.scoreValue}>{summary.correctAnswers}</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Wrong answers</Text>
            <Text style={styles.scoreValue}>{summary.wrongAnswers}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6d28d9',
  },
  screen: {
    flex: 1,
    backgroundColor: '#f7f4f1',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 0,
    paddingBottom: 28,
  },
  topHeader: {
    width: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#6d28d9',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 54,
    paddingBottom: 18,
    marginHorizontal: -18,
    marginBottom: 16,
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
  headerStep: {
    color: '#ede9fe',
    fontSize: 14,
    fontWeight: '900',
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
  learnSection: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#9a8f86',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  scoreSection: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    marginTop: 18,
    shadowColor: '#9a8f86',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#333',
    fontSize: 28,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: '#626262',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 14,
  },
  letterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 8,
    rowGap: 10,
    marginTop: 16,
  },
  letterCard: {
    width: '31%',
    minWidth: 88,
    minHeight: 154,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  activeLetterCard: {
    borderWidth: 3,
    borderColor: '#6d28d9',
  },
  letter: {
    color: '#27272a',
    fontSize: 36,
    fontWeight: '900',
  },
  phrase: {
    color: '#4c1d95',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 3,
    minHeight: 28,
    textAlign: 'center',
  },
  smallSpeaker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#6d28d9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  picture: {
    fontSize: 38,
    marginTop: 5,
  },
  nextButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#6d28d9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee7df',
    paddingVertical: 13,
  },
  scoreLabel: {
    color: '#626262',
    fontSize: 16,
    fontWeight: '700',
  },
  scoreValue: {
    color: '#4c1d95',
    fontSize: 17,
    fontWeight: '900',
  },
});
