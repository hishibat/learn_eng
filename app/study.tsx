import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useAuth } from '@/lib/AuthContext';
import { useStudy } from '@/hooks/useStudy';
import { WordWithLearningRecord } from '@/types/database';
import { SimpleReviewOption, formatInterval, calculateSRS, simpleToQuality } from '@/lib/srs';

const { width } = Dimensions.get('window');

export default function StudyScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    todayWords,
    loading,
    fetchTodayWords,
    recordReview,
    saveStudySession,
  } = useStudy();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studiedCount, setStudiedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [sessionComplete, setSessionComplete] = useState(false);

  const flipAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user) {
      fetchTodayWords();
    }
  }, [user]);

  const currentWord: WordWithLearningRecord | undefined = todayWords[currentIndex];

  const flipCard = () => {
    Animated.spring(flipAnimation, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const handleReview = async (option: SimpleReviewOption) => {
    if (!currentWord) return;

    const success = await recordReview(currentWord.id, option);
    if (success) {
      setStudiedCount((prev) => prev + 1);
      if (option !== 'forgot') {
        setCorrectCount((prev) => prev + 1);
      }

      // 次のカードへ
      if (currentIndex < todayWords.length - 1) {
        flipAnimation.setValue(0);
        setIsFlipped(false);
        setCurrentIndex((prev) => prev + 1);
      } else {
        // セッション完了
        const duration = Math.round((Date.now() - startTime) / 1000);
        await saveStudySession(studiedCount + 1, correctCount + (option !== 'forgot' ? 1 : 0), duration);
        setSessionComplete(true);
      }
    }
  };

  const getNextInterval = (option: SimpleReviewOption) => {
    if (!currentWord) return '';
    const quality = simpleToQuality(option);
    const result = calculateSRS(
      quality,
      currentWord.ease_factor || 2.5,
      currentWord.interval_days || 0,
      currentWord.repetitions || 0
    );
    return formatInterval(result.intervalDays);
  };

  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>ログインしてください</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (todayWords.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <FontAwesome name="check-circle" size={64} color="#10b981" />
        <Text style={styles.completeTitle}>復習完了!</Text>
        <Text style={styles.completeText}>
          今日復習する単語はありません
        </Text>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.homeButtonText}>ホームに戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (sessionComplete) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    return (
      <View style={styles.centerContainer}>
        <FontAwesome name="trophy" size={64} color="#f59e0b" />
        <Text style={styles.completeTitle}>セッション完了!</Text>
        <View style={styles.resultContainer}>
          <View style={styles.resultItem}>
            <Text style={styles.resultValue}>{studiedCount}</Text>
            <Text style={styles.resultLabel}>学習した単語</Text>
          </View>
          <View style={styles.resultItem}>
            <Text style={styles.resultValue}>
              {Math.round((correctCount / studiedCount) * 100)}%
            </Text>
            <Text style={styles.resultLabel}>正答率</Text>
          </View>
          <View style={styles.resultItem}>
            <Text style={styles.resultValue}>
              {minutes > 0 ? `${minutes}分${seconds}秒` : `${seconds}秒`}
            </Text>
            <Text style={styles.resultLabel}>学習時間</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.homeButtonText}>ホームに戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 進捗 */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentIndex + 1) / todayWords.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {currentIndex + 1} / {todayWords.length}
        </Text>
      </View>

      {/* フラッシュカード */}
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={flipCard}
        activeOpacity={0.9}
      >
        {/* 表面（英単語） */}
        <Animated.View
          style={[
            styles.card,
            styles.cardFront,
            { transform: [{ rotateY: frontInterpolate }] },
          ]}
        >
          <Text style={styles.cardHint}>タップして意味を見る</Text>
          <Text style={styles.wordText}>{currentWord?.word}</Text>
          {currentWord?.example && (
            <Text style={styles.exampleText}>{currentWord.example}</Text>
          )}
        </Animated.View>

        {/* 裏面（意味） */}
        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            { transform: [{ rotateY: backInterpolate }] },
          ]}
        >
          <Text style={styles.cardHint}>どのくらい覚えていましたか？</Text>
          <Text style={styles.meaningText}>{currentWord?.meaning}</Text>
          <Text style={styles.wordSmall}>{currentWord?.word}</Text>
        </Animated.View>
      </TouchableOpacity>

      {/* 回答ボタン */}
      {isFlipped && (
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.reviewButton, styles.forgotButton]}
            onPress={() => handleReview('forgot')}
          >
            <FontAwesome name="times" size={20} color="#ef4444" />
            <Text style={[styles.buttonLabel, { color: '#ef4444' }]}>忘れた</Text>
            <Text style={styles.intervalText}>{getNextInterval('forgot')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.reviewButton, styles.hardButton]}
            onPress={() => handleReview('hard')}
          >
            <FontAwesome name="meh-o" size={20} color="#f59e0b" />
            <Text style={[styles.buttonLabel, { color: '#f59e0b' }]}>曖昧</Text>
            <Text style={styles.intervalText}>{getNextInterval('hard')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.reviewButton, styles.goodButton]}
            onPress={() => handleReview('good')}
          >
            <FontAwesome name="smile-o" size={20} color="#10b981" />
            <Text style={[styles.buttonLabel, { color: '#10b981' }]}>覚えてた</Text>
            <Text style={styles.intervalText}>{getNextInterval('good')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.reviewButton, styles.easyButton]}
            onPress={() => handleReview('easy')}
          >
            <FontAwesome name="star" size={20} color="#6366f1" />
            <Text style={[styles.buttonLabel, { color: '#6366f1' }]}>簡単</Text>
            <Text style={styles.intervalText}>{getNextInterval('easy')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 32,
  },
  messageText: {
    fontSize: 16,
    color: '#6b7280',
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  completeText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  resultContainer: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 24,
  },
  resultItem: {
    alignItems: 'center',
  },
  resultValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  resultLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  homeButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 32,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    padding: 20,
    paddingBottom: 0,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: width - 40,
    height: 300,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    position: 'absolute',
  },
  cardFront: {
    backgroundColor: '#fff',
  },
  cardBack: {
    backgroundColor: '#6366f1',
  },
  cardHint: {
    position: 'absolute',
    top: 20,
    fontSize: 12,
    color: '#9ca3af',
  },
  wordText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  meaningText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  wordSmall: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 12,
  },
  exampleText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    paddingBottom: 40,
    gap: 8,
  },
  reviewButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  forgotButton: {
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  hardButton: {
    borderColor: '#f59e0b',
    borderWidth: 1,
  },
  goodButton: {
    borderColor: '#10b981',
    borderWidth: 1,
  },
  easyButton: {
    borderColor: '#6366f1',
    borderWidth: 1,
  },
  buttonLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  intervalText: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
});
