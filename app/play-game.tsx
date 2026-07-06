import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { alphabetItems } from '@/constants/alphabet';
import { recordGameAttempt, type ScoreSummary } from '@/lib/database';

type BalloonOption = {
  letter: string;
  color: string;
  left: number | `${number}%`;
  bottom?: number;
};

type GameRound = {
  targetLetter: string;
  targetWord: string;
  prompt: string;
  instruction: string;
  options: string[];
};

type GameSelection = 'menu' | 'balloon' | 'feedMonster' | 'trainLetter' | 'alphabetQuiz';

type GameInfo = {
  key: GameSelection;
  title: string;
  subtitle: string;
};

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const gameOptions: GameInfo[] = [
  {
    key: 'balloon',
    title: 'Balloon Pops',
    subtitle: 'Tap the right letter balloon.',
  },
  {
    key: 'feedMonster',
    title: 'Feed the Monster',
    subtitle: 'Give the monster the correct letter.',
  },
  {
    key: 'trainLetter',
    title: 'Which letter is missing?',
    subtitle: 'Tap the letter that fills the gap.',
  },
  {
    key: 'alphabetQuiz',
    title: 'Alphabet Quiz',
    subtitle: 'Answer fun alphabet questions.',
  },
];

const balloonColors = ['#ef4444', '#14b8a6', '#0ea5e9', '#f59e0b', '#7c3aed'];
const maxRatingStars = 5;
const monsterFoodStartOffsets = [-120, -40, 40, 120];
const balloonPositions: { left: `${number}%`; bottom: number }[] = [
  { left: '9%', bottom: 152 },
  { left: '72%', bottom: 148 },
  { left: '38%', bottom: 98 },
  { left: '16%', bottom: 26 },
  { left: '72%', bottom: 34 },
];

function shuffleItems<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

const firstGameRound: GameRound = {
  targetLetter: 'A',
  targetWord: 'Apple',
  prompt: 'Pop the letter A',
  instruction: 'Tap the A balloon',
  options: ['A', 'B', 'C', 'D'],
};

function createGameRound(previousRound?: GameRound): GameRound {
  const targetIndex = Math.floor(Math.random() * alphabetItems.length);
  const target = alphabetItems[targetIndex];
  const wrongLetters = shuffleItems(alphabetItems.filter((item) => item.letter !== target.letter))
    .slice(0, 3)
    .map((item) => item.letter);
  const options = shuffleItems([target.letter, ...wrongLetters]);

  const round: GameRound = {
    targetLetter: target.letter,
    targetWord: target.word,
    prompt: `Pop the letter ${target.letter}`,
    instruction: `Tap the ${target.letter} balloon`,
    options,
  };

  return previousRound && previousRound.targetLetter === round.targetLetter
    ? createGameRound(previousRound)
    : round;
}

function createTrainLetterRound(previousRound?: GameRound): GameRound {
  const targetIndex = 2 + Math.floor(Math.random() * (alphabetItems.length - 3));
  const target = alphabetItems[targetIndex];
  const wrongLetters = shuffleItems(alphabetItems.filter((item) => item.letter !== target.letter))
    .slice(0, 2)
    .map((item) => item.letter);
  const options = shuffleItems([target.letter, ...wrongLetters]);

  const round: GameRound = {
    targetLetter: target.letter,
    targetWord: target.word,
    prompt: 'Which letter is missing?',
    instruction: 'Tap the letter that fills the gap.',
    options,
  };

  return previousRound && previousRound.targetLetter === round.targetLetter
    ? createTrainLetterRound(previousRound)
    : round;
}

function createRoundForGame(selectedGame: GameSelection, previousRound?: GameRound): GameRound {
  if (selectedGame === 'trainLetter') return createTrainLetterRound(previousRound);

  return createGameRound(previousRound);
}

function createBalloonOptions(targetLetter: string): BalloonOption[] {
  const wrongLetters = shuffleItems(alphabetItems.filter((item) => item.letter !== targetLetter))
    .slice(0, 4)
    .map((item) => item.letter);

  return shuffleItems([targetLetter, ...wrongLetters]).map((letter, index) => ({
    letter,
    color: balloonColors[index % balloonColors.length],
    left: balloonPositions[index % balloonPositions.length].left,
    bottom: balloonPositions[index % balloonPositions.length].bottom,
  }));
}

function getEarnedStars(correctAnswers: number, gamesPlayed: number) {
  if (gamesPlayed <= 0) return 0;

  return Math.max(0, Math.min(maxRatingStars, Math.round((correctAnswers / gamesPlayed) * maxRatingStars)));
}

function createEmptyScoreSummary(): ScoreSummary {
  return {
    lettersLearned: 0,
    gamesPlayed: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    score: 0,
  };
}

export default function PlayGameScreen() {
  const nextQuestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answeredLettersRef = useRef<Set<string>>(new Set());
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [hasAnsweredCorrectly, setHasAnsweredCorrectly] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameSelection>('menu');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [gameRound, setGameRound] = useState<GameRound>(firstGameRound);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [sessionSummary, setSessionSummary] = useState<ScoreSummary>(createEmptyScoreSummary);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const popScaleRefs = useRef<Record<string, Animated.Value>>({});
  const popOpacityRefs = useRef<Record<string, Animated.Value>>({});
  const popBurstRefs = useRef<Record<string, Animated.Value>>({});
  const monsterFeedAnim = useRef(new Animated.Value(0)).current;
  const trainLetterAnim = useRef(new Animated.Value(0)).current;
  const menuPulseAnim = useRef(new Animated.Value(0)).current;
  const roundIntroAnim = useRef(new Animated.Value(1)).current;
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const [poppedLetters, setPoppedLetters] = useState<string[]>([]);
  const [monsterFeedingLetter, setMonsterFeedingLetter] = useState<string | null>(null);
  const [monsterFeedingIndex, setMonsterFeedingIndex] = useState(0);
  const [trainFlyingLetter, setTrainFlyingLetter] = useState<string | null>(null);
  const [trainGapLetter, setTrainGapLetter] = useState<string | null>(null);

  useEffect(() => {
    setGameRound(createGameRound());

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const menuPulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(menuPulseAnim, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(menuPulseAnim, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    menuPulseLoop.start();

    return () => {
      floatLoop.stop();
      menuPulseLoop.stop();
      Speech.stop();
      if (nextQuestionTimer.current) {
        clearTimeout(nextQuestionTimer.current);
      }
    };
  }, [floatAnim, menuPulseAnim]);

  useEffect(() => {
    if (selectedGame === 'menu') return;

    roundIntroAnim.setValue(0);
    Animated.timing(roundIntroAnim, {
      toValue: 1,
      duration: 440,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [gameRound.targetLetter, roundIntroAnim, selectedGame]);

  useEffect(() => {
    if (!feedback) return;

    feedbackAnim.setValue(0);
    Animated.spring(feedbackAnim, {
      toValue: 1,
      friction: 5,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [feedback, feedbackAnim]);

  const speak = (text: string) => {
    Speech.stop();
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.1,
      rate: 0.55,
    });
  };

  const showNextQuestion = () => {
    if (nextQuestionTimer.current) {
      clearTimeout(nextQuestionTimer.current);
      nextQuestionTimer.current = null;
    }

    setGameRound((previousRound) => createRoundForGame(selectedGame, previousRound));
    setSelectedAnswer(null);
    setHasAnsweredCorrectly(false);
    setFeedback(null);
    setPoppedLetters([]);
    setMonsterFeedingLetter(null);
    monsterFeedAnim.setValue(0);
    setTrainFlyingLetter(null);
    setTrainGapLetter(null);
    trainLetterAnim.setValue(0);
    answeredLettersRef.current.clear();
    setQuestionNumber((value) => value + 1);
  };

  const stopPendingRound = useCallback(() => {
    if (nextQuestionTimer.current) {
      clearTimeout(nextQuestionTimer.current);
      nextQuestionTimer.current = null;
    }

    setMonsterFeedingLetter(null);
    monsterFeedAnim.setValue(0);
    setTrainFlyingLetter(null);
    setTrainGapLetter(null);
    trainLetterAnim.setValue(0);
  }, [monsterFeedAnim, trainLetterAnim]);

  const handleBackNavigation = useCallback(() => {
    stopPendingRound();

    if (selectedGame === 'menu') {
      router.replace('/home-menu');
      return true;
    }

    setSelectedGame('menu');
    return true;
  }, [selectedGame, stopPendingRound]);

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', handleBackNavigation);

    return () => {
      backSubscription.remove();
    };
  }, [handleBackNavigation]);

  const startGame = (game: GameSelection) => {
    stopPendingRound();
    setSessionSummary(createEmptyScoreSummary());
    setQuestionNumber(1);
    setSelectedGame(game);
  };

  useEffect(() => {
    if (selectedGame !== 'menu') {
      setGameRound((previousRound) => createRoundForGame(selectedGame, previousRound));
      setSelectedAnswer(null);
      setHasAnsweredCorrectly(false);
      setFeedback(null);
      setSessionSummary(createEmptyScoreSummary());
      setQuestionNumber(1);
      setPoppedLetters([]);
      setMonsterFeedingLetter(null);
      monsterFeedAnim.setValue(0);
      setTrainFlyingLetter(null);
      setTrainGapLetter(null);
      trainLetterAnim.setValue(0);
      answeredLettersRef.current.clear();
    }
  }, [selectedGame, monsterFeedAnim, trainLetterAnim]);

  const feedMonsterLetter = (letter: string, index: number) => {
    setMonsterFeedingLetter(letter);
    setMonsterFeedingIndex(index);
    monsterFeedAnim.setValue(0);
    Animated.timing(monsterFeedAnim, {
      toValue: 1,
      duration: 680,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const flyTrainLetterToGap = (letter: string) => {
    setTrainFlyingLetter(letter);
    setTrainGapLetter(null);
    trainLetterAnim.setValue(0);
    Animated.timing(trainLetterAnim, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setTrainGapLetter(letter);
      setTrainFlyingLetter(null);
      trainLetterAnim.setValue(0);
    });
  };

  const answerQuestion = (answer: string) => {
    if (hasAnsweredCorrectly) {
      return;
    }

    if (answeredLettersRef.current.has(answer)) {
      setSelectedAnswer(answer);
      return;
    }

    answeredLettersRef.current.add(answer);
    const isCorrect = answer === gameRound.targetLetter;
    setSelectedAnswer(answer);
    setSessionSummary((currentSummary) => ({
      ...currentSummary,
      gamesPlayed: currentSummary.gamesPlayed + 1,
      correctAnswers: currentSummary.correctAnswers + (isCorrect ? 1 : 0),
      wrongAnswers: currentSummary.wrongAnswers + (isCorrect ? 0 : 1),
    }));

    if (isCorrect) {
      setHasAnsweredCorrectly(true);
      setFeedback('Good job!');
      speak(`Good job. ${gameRound.prompt}`);
    } else {
      setFeedback('Wrong! Try again.');
      speak(`Try again. ${gameRound.instruction}`);
    }

    recordGameAttempt({
      mode: selectedGame,
      targetLetter: gameRound.targetLetter,
      targetWord: gameRound.targetWord,
      selectedAnswer: answer,
      correctAnswer: gameRound.targetLetter,
      isCorrect,
    })
      .then(() => undefined)
      .catch((error) => {
        console.warn('Could not save game attempt', error);
      });

    if (isCorrect) {
      if (nextQuestionTimer.current) {
        clearTimeout(nextQuestionTimer.current);
      }

      const nextQuestionDelay = selectedGame === 'trainLetter' ? 2700 : 1200;

      nextQuestionTimer.current = setTimeout(() => {
        showNextQuestion();
        nextQuestionTimer.current = null;
      }, nextQuestionDelay);
    }
  };

  const balloonOptions = useMemo(() => createBalloonOptions(gameRound.targetLetter), [gameRound.targetLetter]);
  const earnedStars = getEarnedStars(sessionSummary.correctAnswers, sessionSummary.gamesPlayed);
  const currentAlphabetItem = useMemo(
    () => alphabetItems.find((item) => item.letter === gameRound.targetLetter) ?? alphabetItems[0],
    [gameRound.targetLetter]
  );
  const trainLetters = useMemo(() => {
    const targetIndex = alphabetItems.findIndex((item) => item.letter === gameRound.targetLetter);
    const start = Math.max(0, Math.min(targetIndex - 2, alphabetItems.length - 4));
    const sequence = [
      alphabetItems[start]?.letter ?? '',
      alphabetItems[start + 1]?.letter ?? '',
      '?',
      alphabetItems[start + 3]?.letter ?? '',
    ];
    return sequence;
  }, [gameRound.targetLetter]);
  const currentGameTitle =
    selectedGame === 'balloon'
      ? 'Balloon Pops'
      : selectedGame === 'feedMonster'
      ? 'Feed the Monster'
      : selectedGame === 'trainLetter'
      ? 'Which letter is missing?'
      : selectedGame === 'alphabetQuiz'
      ? 'Alphabet Quiz'
      : 'Choose a Game';

  const currentGameSubtitle =
    selectedGame === 'balloon'
      ? 'Tap the right balloon and learn letters.'
      : selectedGame === 'feedMonster'
      ? 'Feed the monster the correct letter.'
      : selectedGame === 'trainLetter'
      ? 'Tap the letter that fills the gap.'
      : selectedGame === 'alphabetQuiz'
      ? 'Answer the quiz questions.'
      : 'Pick a game to start.';
  const menuCardScale = menuPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });
  const menuBadgeLift = menuPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
  const roundIntroStyle = {
    opacity: roundIntroAnim,
    transform: [
      {
        translateY: roundIntroAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
      {
        scale: roundIntroAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.97, 1],
        }),
      },
    ],
  };
  const feedbackPopStyle = {
    opacity: feedback ? feedbackAnim : 1,
    transform: [
      {
        scale: feedback
          ? feedbackAnim.interpolate({
              inputRange: [0, 0.72, 1],
              outputRange: [0.82, 1.12, 1],
            })
          : 1,
      },
    ],
  };
  const targetPulseStyle = {
    transform: [
      {
        scale: floatAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.05],
        }),
      },
    ],
  };
  const monsterBounceStyle = {
    transform: [
      {
        translateY: floatAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -8],
        }),
      },
      {
        scale: monsterFeedAnim.interpolate({
          inputRange: [0, 0.78, 1],
          outputRange: [1, 1.04, 1],
        }),
      },
    ],
  };
  const trainDriftStyle = {
    transform: [
      {
        translateX: floatAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-3, 3],
        }),
      },
    ],
  };
  const quizBubbleStyle = {
    transform: [
      {
        scale: floatAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.045],
        }),
      },
      {
        rotate: floatAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['-1.5deg', '1.5deg'],
        }),
      },
    ],
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.headerBackButton}
          activeOpacity={0.85}
          onPress={handleBackNavigation}
        >
          <Ionicons name="chevron-back" size={23} color="#6d28d9" />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Ionicons name="game-controller-outline" size={28} color="#fff" />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Play Game</Text>
          <Text style={styles.headerSubtitle}>Choose a learning activity</Text>
        </View>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.gameSection}>
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="game-controller" size={34} color="#6d28d9" />
            <Text style={styles.sectionTitle}>{currentGameTitle}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>{currentGameSubtitle}</Text>

          {selectedGame === 'menu' ? (
            <View>
              <View style={styles.menuSpotlight}>
                <View style={styles.menuSpotlightIcon}>
                  <Ionicons name="sparkles" size={22} color="#ffffff" />
                </View>
                <View style={styles.menuSpotlightCopy}>
                  <Text style={styles.menuSpotlightTitle}>Daily alphabet challenge</Text>
                  <Text style={styles.menuSpotlightText}>Pick any activity and build a winning streak.</Text>
                </View>
              </View>
              <View style={styles.gameMenuGrid}>
              {gameOptions.map((game) => (
                <AnimatedTouchableOpacity
                  key={game.key}
                  style={[
                    styles.gameCard,
                    {
                      transform: [
                        { scale: menuCardScale },
                        {
                          translateY:
                            game.key === 'balloon' || game.key === 'trainLetter' ? menuBadgeLift : 0,
                        },
                      ],
                    },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => startGame(game.key)}
                >
                  <View style={styles.cardSparkOne} />
                  <View style={styles.cardSparkTwo} />
                  <Text style={styles.gameCardTitle}>{game.title}</Text>
                  <Text style={styles.gameCardSubtitle}>{game.subtitle}</Text>
                  <Animated.View style={[styles.gameCardIconBubble, { transform: [{ translateY: menuBadgeLift }] }]}>
                    <Ionicons
                      name={
                        game.key === 'balloon'
                          ? 'balloon'
                          : game.key === 'feedMonster'
                          ? 'restaurant'
                          : game.key === 'trainLetter'
                          ? 'train'
                          : 'help-circle'
                      }
                      size={34}
                      color="#fff"
                    />
                  </Animated.View>
                  <Text style={styles.gameCardIcon}>
                    {game.key === 'balloon'
                      ? '🎈'
                      : game.key === 'feedMonster'
                      ? '🦖'
                      : game.key === 'trainLetter'
                      ? '🚂'
                      : '❓'}
                  </Text>
                </AnimatedTouchableOpacity>
              ))}
              </View>
            </View>
          ) : (
            <>
              {selectedGame !== 'balloon' && selectedGame !== 'feedMonster' && (
                <>
                  <Text style={styles.questionCount}>Question {questionNumber}</Text>

                  <View style={styles.scoreRow}>
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreLabel}>Score</Text>
                      <Text style={styles.scoreValue}>{sessionSummary.correctAnswers}</Text>
                    </View>
                    <View style={styles.starsRow}>
                      {Array.from({ length: maxRatingStars }, (_, starIndex) => {
                        const isEarned = starIndex < earnedStars;

                        return (
                          <Ionicons
                            key={starIndex}
                            name={isEarned ? 'star' : 'star-outline'}
                            size={18}
                            color={isEarned ? '#fde68a' : 'rgba(109,40,217,0.35)'}
                          />
                        );
                      })}
                    </View>
                  </View>
                </>
              )}

              {selectedGame === 'balloon' ? (
                <>
                  <Animated.View style={[styles.balloonField, roundIntroStyle]}>
                    <View style={styles.balloonGlowOne} />
                    <View style={styles.balloonGlowTwo} />
                    <View style={styles.balloonStageTop}>
                      <View style={styles.balloonScorePill}>
                        <Text style={styles.balloonScoreText}>Score: {sessionSummary.correctAnswers}</Text>
                      </View>
                      <View style={styles.balloonStars}>
                        {Array.from({ length: maxRatingStars }, (_, starIndex) => {
                          const isEarned = starIndex < earnedStars;

                          return (
                            <Ionicons
                              key={starIndex}
                              name={isEarned ? 'star' : 'star-outline'}
                              size={18}
                              color={isEarned ? '#facc15' : 'rgba(255,255,255,0.72)'}
                            />
                          );
                        })}
                      </View>
                    </View>
                    <Text style={styles.balloonPrompt}>Pop the letter</Text>
                    <Animated.View style={targetPulseStyle}>
                      <TouchableOpacity style={styles.balloonTargetButton} activeOpacity={0.85} onPress={() => speak(gameRound.targetLetter)}>
                        <Text style={styles.balloonTargetLetter}>{gameRound.targetLetter}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                    <Text style={styles.balloonTargetHint}>tap to hear again</Text>
                    <Text style={styles.balloonSparkle}>+1</Text>
                    {balloonOptions.map((opt) => {
                      const letter = opt.letter;
                      if (poppedLetters.includes(letter)) return null;
                      const isCorrect = letter === gameRound.targetLetter;
                      if (!popScaleRefs.current[letter]) popScaleRefs.current[letter] = new Animated.Value(1);
                      if (!popOpacityRefs.current[letter]) popOpacityRefs.current[letter] = new Animated.Value(1);
                      if (!popBurstRefs.current[letter]) popBurstRefs.current[letter] = new Animated.Value(0);
                      const scale = popScaleRefs.current[letter];
                      const opacity = popOpacityRefs.current[letter];
                      const burst = popBurstRefs.current[letter];
                      const floatY = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
                      const isPopping = isCorrect && selectedAnswer === letter && hasAnsweredCorrectly;

                      return (
                        <Animated.View
                          key={letter}
                          style={[
                            styles.floatingBalloon,
                            {
                              left: opt.left,
                              bottom: opt.bottom ?? 28,
                              transform: [{ translateY: floatY }, { scale }],
                            },
                          ]}
                        >
                          <TouchableOpacity
                            style={styles.balloonTouch}
                            activeOpacity={0.85}
                            onPress={() => {
                              answerQuestion(letter);
                              if (isCorrect) {
                                burst.setValue(0);
                                Animated.sequence([
                                  Animated.parallel([
                                    Animated.timing(scale, { toValue: 0.82, duration: 70, useNativeDriver: true }),
                                    Animated.timing(opacity, { toValue: 1, duration: 70, useNativeDriver: true }),
                                  ]),
                                  Animated.parallel([
                                    Animated.timing(scale, { toValue: 1.55, duration: 130, useNativeDriver: true }),
                                    Animated.timing(opacity, { toValue: 0, duration: 130, useNativeDriver: true }),
                                    Animated.timing(burst, { toValue: 1, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                                  ]),
                                ]).start(() => {
                                  setPoppedLetters((prev) => [...prev, letter]);
                                  scale.setValue(1);
                                  opacity.setValue(1);
                                  burst.setValue(0);
                                });
                              }
                            }}
                          >
                            <View style={styles.balloonInnerWrap}>
                              {isPopping ? (
                                <View pointerEvents="none" style={styles.balloonBurst}>
                                  <Animated.View
                                    style={[
                                      styles.balloonBurstRing,
                                      {
                                        opacity: burst.interpolate({
                                          inputRange: [0, 0.18, 1],
                                          outputRange: [0, 0.95, 0],
                                        }),
                                        transform: [
                                          {
                                            scale: burst.interpolate({
                                              inputRange: [0, 1],
                                              outputRange: [0.25, 1.75],
                                            }),
                                          },
                                        ],
                                      },
                                    ]}
                                  />
                                  {[
                                    { pieceStyle: styles.balloonBurstPieceTop, x: 0, y: -64 },
                                    { pieceStyle: styles.balloonBurstPieceRight, x: 66, y: -8 },
                                    { pieceStyle: styles.balloonBurstPieceBottom, x: 8, y: 62 },
                                    { pieceStyle: styles.balloonBurstPieceLeft, x: -66, y: -6 },
                                    { pieceStyle: styles.balloonBurstPieceTopRight, x: 52, y: -50 },
                                    { pieceStyle: styles.balloonBurstPieceBottomLeft, x: -50, y: 52 },
                                  ].map(({ pieceStyle, x, y }, index) => (
                                    <Animated.View
                                      key={index}
                                      style={[
                                        styles.balloonBurstPiece,
                                        pieceStyle,
                                        {
                                          opacity: burst.interpolate({
                                            inputRange: [0, 0.2, 1],
                                            outputRange: [0, 1, 0],
                                          }),
                                          transform: [
                                            {
                                              translateX: burst.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0, x],
                                              }),
                                            },
                                            {
                                              translateY: burst.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0, y],
                                              }),
                                            },
                                            {
                                              scale: burst.interpolate({
                                                inputRange: [0, 0.35, 1],
                                                outputRange: [0.4, 1.25, 0.75],
                                              }),
                                            },
                                          ],
                                        },
                                      ]}
                                    />
                                  ))}
                                </View>
                              ) : null}
                              <Animated.View style={[styles.balloonShape, { backgroundColor: opt.color, opacity }]}>
                                <View style={styles.balloonShine} />
                                <Text style={styles.balloonGameLetter}>{letter}</Text>
                              </Animated.View>
                              <Animated.View style={[styles.balloonKnot, { borderTopColor: opt.color, opacity }]} />
                              <Animated.View style={[styles.balloonString, { opacity }]} />
                            </View>
                          </TouchableOpacity>
                        </Animated.View>
                      );
                    })}
                  </Animated.View>
                  </>
              ) : selectedGame === 'feedMonster' ? (
                <>
                  <Animated.View style={[styles.monsterStage, roundIntroStyle]}>
                    {monsterFeedingLetter ? (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.monsterFlyingFood,
                          {
                            opacity: monsterFeedAnim.interpolate({
                              inputRange: [0, 0.88, 1],
                              outputRange: [1, 1, 0],
                            }),
                            transform: [
                              {
                                translateX: monsterFeedAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [monsterFoodStartOffsets[monsterFeedingIndex] ?? 0, 0],
                                }),
                              },
                              {
                                translateY: monsterFeedAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0, -150],
                                }),
                              },
                              {
                                scale: monsterFeedAnim.interpolate({
                                  inputRange: [0, 0.82, 1],
                                  outputRange: [1, 0.72, 0.18],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <Text style={styles.monsterFlyingFoodText}>{monsterFeedingLetter}</Text>
                      </Animated.View>
                    ) : null}
                    <View style={styles.monsterStageTop}>
                      <View style={styles.monsterScorePill}>
                        <Text style={styles.monsterScoreText}>Score: {sessionSummary.correctAnswers}</Text>
                      </View>
                      <View style={styles.monsterStars}>
                        {Array.from({ length: maxRatingStars }, (_, starIndex) => {
                          const isEarned = starIndex < earnedStars;

                          return (
                            <Ionicons
                              key={starIndex}
                              name={isEarned ? 'star' : 'star-outline'}
                              size={18}
                              color={isEarned ? '#facc15' : 'rgba(255,255,255,0.72)'}
                            />
                          );
                        })}
                      </View>
                    </View>
                    <Text style={styles.monsterPrompt}>Feed the monster</Text>
                    <View style={styles.monsterCard}>
                      <Animated.View style={[styles.speechBubble, targetPulseStyle]}>
                        <Text style={styles.speechBubbleText}>{gameRound.targetLetter}?</Text>
                        <View style={styles.speechBubbleTail} />
                      </Animated.View>
                      <Animated.View style={[styles.monsterBody, monsterBounceStyle]}>
                        <View style={[styles.monsterArm, styles.monsterArmLeft]} />
                        <View style={[styles.monsterArm, styles.monsterArmRight]} />
                        <View style={[styles.monsterFoot, styles.monsterFootLeft]} />
                        <View style={[styles.monsterFoot, styles.monsterFootRight]} />
                        <View style={[styles.monsterAntenna, styles.antennaLeft]}>
                          <View style={styles.antennaDot} />
                        </View>
                        <View style={[styles.monsterAntenna, styles.antennaRight]}>
                          <View style={styles.antennaDot} />
                        </View>
                        <View style={styles.monsterHead}>
                          <View style={[styles.monsterEye, styles.monsterEyeLeft]}>
                            <View style={styles.monsterPupil} />
                          </View>
                          <View style={[styles.monsterEye, styles.monsterEyeRight]}>
                            <View style={styles.monsterPupil} />
                          </View>
                          <View style={styles.monsterMouthPatch}>
                            <View style={styles.monsterMouth}>
                              <View style={[styles.tooth, styles.toothLeft]} />
                              <View style={[styles.tooth, styles.toothRight]} />
                              {monsterFeedingLetter ? (
                                <Animated.Text
                                  style={[
                                    styles.monsterMouthFoodText,
                                    {
                                      opacity: monsterFeedAnim.interpolate({
                                        inputRange: [0, 0.62, 0.76, 1],
                                        outputRange: [0, 0, 1, 0],
                                      }),
                                      transform: [
                                        {
                                          translateY: monsterFeedAnim.interpolate({
                                            inputRange: [0, 0.76, 1],
                                            outputRange: [-20, -4, 18],
                                          }),
                                        },
                                        {
                                          scale: monsterFeedAnim.interpolate({
                                            inputRange: [0, 0.76, 1],
                                            outputRange: [0.7, 1, 0.55],
                                          }),
                                        },
                                      ],
                                    },
                                  ]}
                                >
                                  {monsterFeedingLetter}
                                </Animated.Text>
                              ) : null}
                              <View style={styles.monsterTongue} />
                            </View>
                          </View>
                        </View>
                      </Animated.View>
                    </View>

                    <View style={styles.monsterFoodRow}>
                      {gameRound.options.map((option, index) => {
                        const isCorrect = option === gameRound.targetLetter;
                        const isSelected = selectedAnswer === option;
                        const showCorrect = hasAnsweredCorrectly && isCorrect;
                        const showWrong = isSelected && !hasAnsweredCorrectly && !isCorrect;
                        const buttonScale = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
                        const optionTextStyles = [
                          styles.optionText,
                          styles.monsterFoodText,
                          showCorrect && styles.optionTextCorrect,
                          showWrong && styles.optionTextWrong,
                        ];

                        return (
                          <Animated.View key={option} style={{ transform: [{ scale: buttonScale }], marginHorizontal: 4 }}>
                            <TouchableOpacity
                              style={[
                                styles.monsterFoodButton,
                                index === 0 && styles.monsterFoodGreen,
                                index === 1 && styles.monsterFoodPink,
                                index === 2 && styles.monsterFoodOrange,
                                index === 3 && styles.monsterFoodBlue,
                                showCorrect && styles.correctOption,
                                showWrong && styles.wrongOption,
                                isSelected && !showCorrect && !showWrong && styles.selectedOption,
                              ]}
                              disabled={hasAnsweredCorrectly}
                              activeOpacity={0.85}
                              onPress={() => {
                                answerQuestion(option);
                                if (isCorrect) {
                                  feedMonsterLetter(option, index);
                                }
                              }}
                            >
                              <Text style={optionTextStyles}>{option}</Text>
                            </TouchableOpacity>
                          </Animated.View>
                        );
                      })}
                    </View>
                    <Text style={styles.monsterInstruction}>tap the food with the right letter</Text>
                  </Animated.View>
                </>
              ) : selectedGame === 'trainLetter' ? (
                <>
                  <Animated.View style={[styles.trainGameWrap, roundIntroStyle]}>
                    <View style={styles.trainArea}>
                      <View style={styles.trainCloudLarge} />
                      <View style={styles.trainCloudSmall} />
                      <View style={styles.trainSmokeStack} />
                      <View style={styles.trainSmokeDot} />
                      <View style={styles.trainSmokeDotTwo} />
                      <Animated.View style={[styles.trainEngine, trainDriftStyle]}>
                        <View style={styles.engineCab} />
                        <View style={styles.engineWindow} />
                        <View style={styles.engineChimney} />
                        <View style={styles.engineBody} />
                        <View style={[styles.engineWheel, styles.engineWheelLeft]} />
                        <View style={[styles.engineWheel, styles.engineWheelRight]} />
                      </Animated.View>
                      <Animated.View style={[styles.trainRow, trainDriftStyle]}>
                        {trainLetters.map((letter, index) => (
                          <View
                            key={`${letter}-${index}`}
                            style={[
                              styles.trainBlock,
                              index === 0 && styles.trainBlockYellow,
                              index === 1 && styles.trainBlockGreen,
                              index === 3 && styles.trainBlockPurple,
                              letter === '?' && styles.trainBlockGap,
                            ]}
                          >
                            <Text
                              style={[
                                styles.trainBlockText,
                                letter === '?' && trainFlyingLetter && styles.trainBlockTextHidden,
                              ]}
                            >
                              {letter === '?' && trainGapLetter ? trainGapLetter : letter}
                            </Text>
                            {letter === '?' && trainFlyingLetter ? (
                              <Animated.Text
                                style={[
                                  styles.trainGapFlyingText,
                                  {
                                    opacity: trainLetterAnim.interpolate({
                                      inputRange: [0, 0.12, 1],
                                      outputRange: [0, 1, 1],
                                    }),
                                    transform: [
                                      {
                                        translateY: trainLetterAnim.interpolate({
                                          inputRange: [0, 1],
                                          outputRange: [66, 0],
                                        }),
                                      },
                                      {
                                        scale: trainLetterAnim.interpolate({
                                          inputRange: [0, 0.78, 1],
                                          outputRange: [0.68, 1.14, 1],
                                        }),
                                      },
                                    ],
                                  },
                                ]}
                              >
                                {trainFlyingLetter}
                              </Animated.Text>
                            ) : null}
                            <View style={styles.trainCarWheelLeft} />
                            <View style={styles.trainCarWheelRight} />
                          </View>
                        ))}
                      </Animated.View>
                      <View style={styles.trainTrack} />
                    </View>

                    <View style={styles.options}>
                      {gameRound.options.map((option) => {
                        const isCorrect = option === gameRound.targetLetter;
                        const isSelected = selectedAnswer === option;
                        const showCorrect = hasAnsweredCorrectly && isCorrect;
                        const showWrong = isSelected && !hasAnsweredCorrectly && !isCorrect;
                        const buttonScale = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
                        const optionTextStyles = [
                          styles.optionText,
                          showCorrect && styles.optionTextCorrect,
                          showWrong && styles.optionTextWrong,
                        ];

                        return (
                          <Animated.View key={option} style={{ transform: [{ scale: buttonScale }], marginHorizontal: 4 }}>
                            <TouchableOpacity
                              style={[
                                styles.optionButton,
                                showCorrect && styles.correctOption,
                                showWrong && styles.wrongOption,
                                isSelected && !showCorrect && !showWrong && styles.selectedOption,
                              ]}
                              disabled={hasAnsweredCorrectly}
                              activeOpacity={0.85}
                              onPress={() => {
                                answerQuestion(option);
                                if (isCorrect) {
                                  flyTrainLetterToGap(option);
                                }
                              }}
                            >
                              <Text style={optionTextStyles}>{option}</Text>
                            </TouchableOpacity>
                          </Animated.View>
                        );
                      })}
                    </View>
                  </Animated.View>
                </>
              ) : (
                <>
                  <Animated.View style={[styles.quizObjectCard, roundIntroStyle]}>
                    <Text style={styles.quizPrompt}>Which letter starts this object?</Text>
                    <Animated.View style={quizBubbleStyle}>
                      <TouchableOpacity
                        style={[styles.quizObjectBubble, { backgroundColor: currentAlphabetItem.color }]}
                        activeOpacity={0.85}
                        onPress={() => speak(`${currentAlphabetItem.word}. ${currentAlphabetItem.letter} for ${currentAlphabetItem.word}`)}
                      >
                        <Text style={styles.quizObjectPicture}>{currentAlphabetItem.picture}</Text>
                      </TouchableOpacity>
                    </Animated.View>
                    <Text style={styles.quizObjectWord}>{currentAlphabetItem.word}</Text>
                    <Text style={styles.quizObjectHint}>tap the object to hear it</Text>
                  </Animated.View>

                  <View style={styles.quizOptions}>
                    {gameRound.options.map((option, index) => {
                      const isCorrect = option === gameRound.targetLetter;
                      const isSelected = selectedAnswer === option;
                      const showCorrect = hasAnsweredCorrectly && isCorrect;
                      const showWrong = isSelected && !hasAnsweredCorrectly && !isCorrect;
                      const buttonScale = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
                      const optionTextStyles = [
                        styles.optionText,
                        showCorrect && styles.optionTextCorrect,
                        showWrong && styles.optionTextWrong,
                      ];

                      return (
                        <Animated.View key={option} style={{ transform: [{ scale: buttonScale }], marginHorizontal: 4 }}>
                          <TouchableOpacity
                            style={[
                              styles.quizOptionButton,
                              showCorrect && styles.correctOption,
                              showWrong && styles.wrongOption,
                              isSelected && !showCorrect && !showWrong && styles.selectedOption,
                            ]}
                            disabled={hasAnsweredCorrectly}
                            activeOpacity={0.85}
                            onPress={() => answerQuestion(option)}
                          >
                            <Text style={optionTextStyles}>{option}</Text>
                          </TouchableOpacity>
                        </Animated.View>
                      );
                    })}
                    </View>
                </>
              )}
              <Animated.Text
                style={[
                  styles.gameHint,
                  feedback === 'Good job!' ? styles.feedbackCorrect : styles.feedbackWrong,
                  feedbackPopStyle,
                ]}
              >
                {feedback ?? 'Tap the right letter.'}
              </Animated.Text>

              <View style={styles.liveScoreBox}>
                <View style={styles.liveScoreItem}>
                  <Text style={styles.liveScoreValue}>{sessionSummary.gamesPlayed}</Text>
                  <Text style={styles.liveScoreLabel}>Games</Text>
                </View>
                <View style={styles.liveScoreItem}>
                  <Text style={styles.liveScoreValue}>{sessionSummary.correctAnswers}</Text>
                  <Text style={styles.liveScoreLabel}>Correct</Text>
                </View>
                <View style={styles.liveScoreItem}>
                  <Text style={styles.liveScoreValue}>{sessionSummary.wrongAnswers}</Text>
                  <Text style={styles.liveScoreLabel}>Wrong</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f7f4f1',
    alignItems: 'center',
  },
  scroll: {
    width: '100%',
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 0,
    paddingBottom: 28,
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
  gameSection: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
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
    fontSize: 32,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: '#626262',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  questionCount: {
    color: '#6d28d9',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 16,
    textAlign: 'center',
  },
  questionBox: {
    backgroundColor: '#eef2ff',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 18,
    marginTop: 14,
    alignItems: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  scoreBadge: {
    backgroundColor: '#3730a3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  scoreLabel: {
    color: '#e0e7ff',
    fontSize: 12,
    fontWeight: '700',
  },
  scoreValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  menuSpotlight: {
    minHeight: 86,
    borderRadius: 20,
    backgroundColor: '#0f766e',
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  menuSpotlightIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  menuSpotlightCopy: {
    flex: 1,
  },
  menuSpotlightTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  menuSpotlightText: {
    color: '#ccfbf1',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
    lineHeight: 18,
  },
  gameMenuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 22,
  },
  gameCard: {
    width: '48%',
    backgroundColor: '#eef2ff',
    borderRadius: 18,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 146,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    shadowColor: '#6d28d9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 5,
    overflow: 'hidden',
  },
  cardSparkOne: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(250,204,21,0.22)',
    top: -12,
    right: -10,
  },
  cardSparkTwo: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(20,184,166,0.18)',
    bottom: 12,
    left: 10,
  },
  gameCardTitle: {
    color: '#1d4ed8',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  gameCardSubtitle: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  gameCardIconBubble: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#6d28d9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  question: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  targetCircle: {
    marginTop: 22,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  centerHint: {
    color: '#dbeafe',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    textTransform: 'lowercase',
  },
  targetLetter: {
    color: '#fff',
    fontSize: 54,
    fontWeight: '900',
  },
  instruction: {
    color: '#4b5563',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  balloonField: {
    width: '100%',
    minHeight: 520,
    marginTop: 18,
    borderRadius: 28,
    backgroundColor: '#082f8f',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 9,
  },
  balloonGlowOne: {
    position: 'absolute',
    width: 150,
    height: 46,
    borderRadius: 30,
    backgroundColor: 'rgba(59,130,246,0.28)',
    top: 170,
    left: 38,
    transform: [{ rotate: '-10deg' }],
  },
  balloonGlowTwo: {
    position: 'absolute',
    width: 170,
    height: 62,
    borderRadius: 36,
    backgroundColor: 'rgba(59,130,246,0.2)',
    bottom: 112,
    right: -8,
    transform: [{ rotate: '-8deg' }],
  },
  balloonStageTop: {
    width: '100%',
    minHeight: 46,
    marginTop: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 5,
  },
  balloonScorePill: {
    minWidth: 110,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#facc15',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 5,
  },
  balloonScoreText: {
    color: '#1e3a8a',
    fontSize: 15,
    fontWeight: '900',
  },
  balloonStars: {
    flexDirection: 'row',
    gap: 3,
  },
  balloonPrompt: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 16,
    zIndex: 5,
  },
  balloonTargetButton: {
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: '#fff7ed',
    borderWidth: 5,
    borderColor: '#fbbf24',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 6,
  },
  balloonTargetLetter: {
    color: '#1d4ed8',
    fontSize: 50,
    fontWeight: '900',
  },
  balloonTargetHint: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
    zIndex: 5,
  },
  balloonSparkle: {
    position: 'absolute',
    top: 274,
    left: '58%',
    color: '#facc15',
    fontSize: 16,
    fontWeight: '900',
    zIndex: 3,
  },
  balloon: {
    position: 'absolute',
    bottom: 22,
    width: 84,
    height: 108,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  balloonTouch: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctBalloon: {
    borderWidth: 5,
    borderColor: '#16a34a',
  },
  wrongBalloon: {
    borderWidth: 5,
    borderColor: '#dc2626',
  },
  balloonLetter: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
  },
  letterBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 10,
    backgroundColor: '#fff',
    zIndex: 30,
  },
  balloonInnerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  balloonBurst: {
    position: 'absolute',
    width: 138,
    height: 138,
    borderRadius: 69,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
  },
  balloonBurstRing: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 5,
    borderColor: 'rgba(250,204,21,0.78)',
  },
  balloonBurstPiece: {
    position: 'absolute',
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#facc15',
  },
  balloonBurstPieceTop: {
    top: 3,
    left: 49,
    backgroundColor: '#f97316',
  },
  balloonBurstPieceRight: {
    top: 47,
    right: 1,
    backgroundColor: '#22c55e',
  },
  balloonBurstPieceBottom: {
    bottom: 2,
    left: 48,
    backgroundColor: '#0ea5e9',
  },
  balloonBurstPieceLeft: {
    top: 47,
    left: 1,
    backgroundColor: '#ec4899',
  },
  balloonBurstPieceTopRight: {
    top: 17,
    right: 16,
    backgroundColor: '#a855f7',
  },
  balloonBurstPieceBottomLeft: {
    bottom: 14,
    left: 18,
    backgroundColor: '#f43f5e',
  },
  balloonRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  balloonRingCorrect: {
    borderColor: 'rgba(16,185,129,0.9)',
  },
  balloonRingWrong: {
    borderColor: 'rgba(239,68,68,0.9)',
  },
  balloonString: {
    width: 2,
    height: 38,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.46)',
  },
  targetBalloon: {
    position: 'absolute',
    bottom: 80,
    width: 120,
    height: 150,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 40,
    overflow: 'visible',
  },
  targetBalloonLetter: {
    fontSize: 72,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingHorizontal: 12,
  },
  optionBalloonSmall: {
    width: 78,
    height: 78,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  floatingBalloon: {
    position: 'absolute',
    width: 76,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
    zIndex: 30,
  },
  balloonShape: {
    width: 58,
    height: 74,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  balloonShine: {
    position: 'absolute',
    top: 13,
    left: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.46)',
  },
  balloonGameLetter: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.16)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  balloonKnot: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  optionLetterSmall: {
    fontSize: 28,
    fontWeight: '900',
  },
  smallLetterBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    backgroundColor: '#fff',
  },
  smallLetterBadgeInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    backgroundColor: '#fff',
  },
  options: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 22,
  },
  optionButton: {
    width: 78,
    height: 78,
    borderRadius: 14,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedOptionButton: {
    backgroundColor: '#c7d2fe',
  },
  quizObjectCard: {
    marginTop: 18,
    borderRadius: 22,
    backgroundColor: '#ecfeff',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#a5f3fc',
  },
  quizPrompt: {
    color: '#164e63',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  quizObjectBubble: {
    width: 178,
    height: 178,
    borderRadius: 89,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    borderWidth: 6,
    borderColor: '#ffffff',
    shadowColor: '#0891b2',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  quizObjectPicture: {
    fontSize: 76,
    textAlign: 'center',
  },
  quizObjectWord: {
    color: '#0f172a',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 14,
    textAlign: 'center',
  },
  quizObjectHint: {
    color: '#0e7490',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
  },
  quizOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  quizOptionButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fbbf24',
  },
  trainGameWrap: {
    width: '100%',
    position: 'relative',
    overflow: 'visible',
  },
  trainArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 10,
    backgroundColor: '#0ea5e9',
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  trainTrack: {
    width: '96%',
    height: 8,
    backgroundColor: '#334155',
    borderRadius: 4,
    marginTop: 10,
    borderBottomWidth: 3,
    borderBottomColor: '#64748b',
  },
  trainCloudLarge: {
    position: 'absolute',
    top: 22,
    left: 28,
    width: 70,
    height: 24,
    borderRadius: 18,
    backgroundColor: '#e0f2fe',
  },
  trainCloudSmall: {
    position: 'absolute',
    top: 34,
    right: 34,
    width: 58,
    height: 20,
    borderRadius: 16,
    backgroundColor: '#e0f2fe',
  },
  trainSmokeStack: {
    position: 'absolute',
    top: 70,
    left: 31,
    width: 12,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#334155',
    zIndex: 3,
  },
  trainSmokeDot: {
    position: 'absolute',
    top: 40,
    left: 38,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
  },
  trainSmokeDotTwo: {
    position: 'absolute',
    top: 24,
    left: 52,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e2e8f0',
  },
  trainEngine: {
    width: 86,
    height: 78,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    position: 'relative',
    alignSelf: 'flex-start',
    marginLeft: 8,
    marginBottom: -74,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  engineBody: {
    width: 70,
    height: 42,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    position: 'absolute',
    bottom: 12,
    left: 8,
  },
  engineCab: {
    width: 34,
    height: 42,
    backgroundColor: '#ef4444',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    position: 'absolute',
    top: 4,
    left: 16,
    zIndex: 2,
  },
  engineWindow: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#bae6fd',
    position: 'absolute',
    top: 12,
    left: 23,
    zIndex: 3,
  },
  engineChimney: {
    width: 18,
    height: 30,
    borderRadius: 5,
    backgroundColor: '#1e293b',
    position: 'absolute',
    top: -12,
    right: 14,
    zIndex: 2,
  },
  engineWheel: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    position: 'absolute',
    bottom: 2,
    borderWidth: 3,
    borderColor: '#94a3b8',
  },
  engineWheelLeft: {
    left: 14,
  },
  engineWheelRight: {
    right: 14,
  },
  trainRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 10,
    paddingLeft: 92,
    zIndex: 5,
  },
  trainBlock: {
    width: 58,
    height: 62,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    position: 'relative',
  },
  trainBlockYellow: {
    backgroundColor: '#eab308',
  },
  trainBlockGreen: {
    backgroundColor: '#22c55e',
  },
  trainBlockPurple: {
    backgroundColor: '#a855f7',
  },
  trainBlockGap: {
    backgroundColor: '#38bdf8',
    borderStyle: 'dashed',
    borderWidth: 3,
    borderColor: '#e0f2fe',
  },
  trainBlockText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
  },
  trainBlockTextHidden: {
    opacity: 0,
  },
  trainGapFlyingText: {
    position: 'absolute',
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
    zIndex: 4,
  },
  trainCarWheelLeft: {
    position: 'absolute',
    bottom: -11,
    left: 10,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#94a3b8',
  },
  trainCarWheelRight: {
    position: 'absolute',
    bottom: -11,
    right: 10,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#94a3b8',
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  monsterStage: {
    width: '100%',
    minHeight: 520,
    marginTop: 18,
    borderRadius: 28,
    backgroundColor: '#159895',
    overflow: 'hidden',
    position: 'relative',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 9,
  },
  monsterFlyingFood: {
    position: 'absolute',
    left: '50%',
    bottom: 72,
    width: 58,
    height: 58,
    marginLeft: -29,
    borderRadius: 29,
    backgroundColor: '#facc15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 20,
  },
  monsterFlyingFoodText: {
    color: '#4c1d95',
    fontSize: 28,
    fontWeight: '900',
  },
  monsterStageTop: {
    width: '100%',
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 6,
  },
  monsterScorePill: {
    minWidth: 110,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#facc15',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 5,
  },
  monsterScoreText: {
    color: '#1e3a8a',
    fontSize: 15,
    fontWeight: '900',
  },
  monsterStars: {
    flexDirection: 'row',
    gap: 3,
  },
  monsterPrompt: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 12,
    zIndex: 5,
  },
  monsterCard: {
    width: '100%',
    minHeight: 292,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 14,
  },
  monsterBody: {
    width: 178,
    height: 214,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  monsterHead: {
    width: 158,
    height: 170,
    borderRadius: 82,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 4,
  },
  monsterArm: {
    position: 'absolute',
    width: 34,
    height: 56,
    borderRadius: 22,
    backgroundColor: '#6d28d9',
    top: 82,
    zIndex: 2,
  },
  monsterArmLeft: {
    left: 2,
    transform: [{ rotate: '18deg' }],
  },
  monsterArmRight: {
    right: 2,
    transform: [{ rotate: '-18deg' }],
  },
  monsterFoot: {
    position: 'absolute',
    width: 42,
    height: 30,
    borderRadius: 18,
    backgroundColor: '#6d28d9',
    bottom: 2,
    zIndex: 1,
  },
  monsterFootLeft: {
    left: 44,
    transform: [{ rotate: '-12deg' }],
  },
  monsterFootRight: {
    right: 44,
    transform: [{ rotate: '12deg' }],
  },
  monsterAntenna: {
    position: 'absolute',
    width: 4,
    height: 50,
    backgroundColor: '#5b21b6',
    top: 6,
    borderRadius: 4,
    alignItems: 'center',
    zIndex: 3,
  },
  antennaLeft: {
    left: 56,
    transform: [{ rotate: '-15deg' }],
  },
  antennaRight: {
    right: 56,
    transform: [{ rotate: '15deg' }],
  },
  antennaDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f59e0b',
    marginTop: -11,
  },
  monsterMouthPatch: {
    position: 'absolute',
    bottom: 22,
    width: 94,
    height: 100,
    borderRadius: 48,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 14,
  },
  monsterMouth: {
    width: 70,
    height: 58,
    borderRadius: 34,
    backgroundColor: '#312e81',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    overflow: 'hidden',
  },
  monsterMouthFoodText: {
    position: 'absolute',
    top: 13,
    color: '#facc15',
    fontSize: 30,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
    zIndex: 1,
  },
  monsterTongue: {
    width: 34,
    height: 20,
    borderRadius: 12,
    backgroundColor: '#fb7185',
  },
  tooth: {
    position: 'absolute',
    width: 12,
    height: 16,
    backgroundColor: '#fff',
    borderRadius: 3,
    top: 6,
    zIndex: 2,
  },
  toothLeft: {
    left: 22,
  },
  toothRight: {
    right: 22,
  },
  speechBubble: {
    position: 'absolute',
    top: 40,
    right: 4,
    minWidth: 74,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
  },
  speechBubbleText: {
    color: '#4c1d95',
    fontSize: 23,
    fontWeight: '900',
  },
  speechBubbleTail: {
    position: 'absolute',
    width: 18,
    height: 18,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 5,
    transform: [{ rotate: '45deg' }],
    bottom: -7,
    left: 8,
  },
  monsterEye: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    position: 'absolute',
    top: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monsterEyeLeft: {
    left: 33,
  },
  monsterEyeRight: {
    right: 33,
  },
  monsterPupil: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#1f2937',
  },
  monsterFoodRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 9,
    marginTop: 26,
    zIndex: 8,
  },
  monsterFoodButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 7,
  },
  monsterFoodGreen: {
    backgroundColor: '#22c55e',
  },
  monsterFoodPink: {
    backgroundColor: '#db2777',
  },
  monsterFoodOrange: {
    backgroundColor: '#f97316',
  },
  monsterFoodBlue: {
    backgroundColor: '#2563eb',
  },
  monsterFoodText: {
    color: '#ffffff',
    fontSize: 27,
  },
  monsterInstruction: {
    color: '#e0f2fe',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 13,
  },
  correctOption: {
    backgroundColor: '#bbf7d0',
    borderWidth: 2,
    borderColor: '#16a34a',
  },
  wrongOption: {
    backgroundColor: '#fecdd3',
    borderWidth: 2,
    borderColor: '#b91c1c',
  },
  optionText: {
    color: '#4c1d95',
    fontSize: 32,
    fontWeight: '900',
  },
  optionTextCorrect: {
    color: '#14532d',
  },
  optionTextWrong: {
    color: '#7f1d1d',
  },
  gameCardIcon: {
    display: 'none',
    fontSize: 1,
    marginTop: 12,
    textAlign: 'center',
  },
  gameHint: {
    color: '#626262',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 16,
    minHeight: 22,
    textAlign: 'center',
  },
  feedbackCorrect: {
    color: '#15803d',
    fontSize: 20,
    fontWeight: '900',
  },
  feedbackWrong: {
    color: '#b91c1c',
    fontSize: 20,
    fontWeight: '900',
  },
  nextQuestionButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#6d28d9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  nextQuestionText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '900',
  },
  liveScoreBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  liveScoreItem: {
    flex: 1,
    minHeight: 70,
    borderRadius: 14,
    backgroundColor: '#f7f4f1',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  liveScoreValue: {
    color: '#4c1d95',
    fontSize: 24,
    fontWeight: '900',
  },
  liveScoreLabel: {
    color: '#626262',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
});
