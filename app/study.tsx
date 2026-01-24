import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useAuth } from '@/lib/AuthContext';
import { useStudy } from '@/hooks/useStudy';
import { WordWithLearningRecord, StudyMode } from '@/types/database';
import { SimpleReviewOption, formatInterval, calculateSRS, simpleToQuality } from '@/lib/srs';

const { width } = Dimensions.get('window');

interface QuizOption {
  meaning: string;
  isCorrect: boolean;
}

// 選択肢を生成する関数
function generateQuizOptions(
  currentWord: WordWithLearningRecord,
  allWords: WordWithLearningRecord[]
): QuizOption[] {
  const otherWords = allWords.filter((w) => w.id !== currentWord.id);
  const shuffled = [...otherWords].sort(() => Math.random() - 0.5);
  const wrongOptions = shuffled.slice(0, 3).map((w) => ({
    meaning: w.meaning,
    isCorrect: false,
  }));
  const correctOption: QuizOption = {
    meaning: currentWord.meaning,
    isCorrect: true,
  };
  return [...wrongOptions, correctOption].sort(() => Math.random() - 0.5);
}

// スペル正規化（大文字小文字、空白を無視）
function normalizeSpelling(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

export default function StudyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { user } = useAuth();
  const {
    todayWords,
    allWords,
    loading,
    fetchTodayWords,
    fetchAllWords,
    recordReview,
    saveStudySession,
  } = useStudy();

  const [studyMode, setStudyMode] = useState<StudyMode>(
    (params.mode as StudyMode) || 'flashcard'
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studiedCount, setStudiedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [sessionComplete, setSessionComplete] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  // スペルモード用の状態
  const [spellingInput, setSpellingInput] = useState('');
  const [spellingResult, setSpellingResult] = useState<'correct' | 'incorrect' | null>(null);

  // リトライキュー（間違えた単語を再出題）
  const [retryQueue, setRetryQueue] = useState<WordWithLearningRecord[]>([]);
  const [isRetryPhase, setIsRetryPhase] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const flipAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user) {
      fetchTodayWords();
      fetchAllWords();
    }
  }, [user]);

  // 現在出題中の単語
  const currentWord: WordWithLearningRecord | undefined = isRetryPhase
    ? retryQueue[currentIndex]
    : todayWords[currentIndex];

  // 現在のリスト（通常フェーズかリトライフェーズか）
  const currentList = isRetryPhase ? retryQueue : todayWords;

  const quizOptions = useMemo(() => {
    if (!currentWord || allWords.length < 4) return [];
    return generateQuizOptions(currentWord, allWords);
  }, [currentWord, allWords]);

  const flipCard = () => {
    Animated.spring(flipAnimation, {
      toValue: isFlipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  // 次の単語へ進む、またはリトライフェーズへ移行
  const moveToNext = async (wasCorrect: boolean, word: WordWithLearningRecord) => {
    // 間違えた場合はリトライキューに追加
    if (!wasCorrect && !isRetryPhase) {
      setRetryQueue((prev) => [...prev, word]);
    }

    // リトライフェーズで間違えた場合は、キューの最後に再追加
    if (!wasCorrect && isRetryPhase) {
      setRetryQueue((prev) => [...prev, word]);
      setRetryCount((prev) => prev + 1);
    }

    // 次のカードへ
    if (currentIndex < currentList.length - 1) {
      flipAnimation.setValue(0);
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
      setSpellingInput('');
      setSpellingResult(null);
    } else if (!isRetryPhase && retryQueue.length > 0) {
      // 通常フェーズ終了、リトライフェーズへ
      setIsRetryPhase(true);
      setCurrentIndex(0);
      flipAnimation.setValue(0);
      setIsFlipped(false);
      setSpellingInput('');
      setSpellingResult(null);
    } else {
      // セッション完了
      const duration = Math.round((Date.now() - startTime) / 1000);
      await saveStudySession(studiedCount + 1, correctCount + (wasCorrect ? 1 : 0), duration);
      setSessionComplete(true);
    }
  };

  const handleReview = async (option: SimpleReviewOption) => {
    if (!currentWord) return;

    const success = await recordReview(currentWord.id, option, studyMode);
    if (success) {
      const isCorrect = option !== 'forgot';
      setStudiedCount((prev) => prev + 1);
      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
      }
      await moveToNext(isCorrect, currentWord);
    }
  };

  const handleQuizAnswer = async (optionIndex: number) => {
    if (showResult || !currentWord) return;
    setSelectedAnswer(optionIndex);
    setShowResult(true);
    const isCorrect = quizOptions[optionIndex]?.isCorrect ?? false;
    const reviewOption: SimpleReviewOption = isCorrect ? 'good' : 'forgot';

    setTimeout(async () => {
      const success = await recordReview(currentWord.id, reviewOption, studyMode);
      if (success) {
        setStudiedCount((prev) => prev + 1);
        if (isCorrect) {
          setCorrectCount((prev) => prev + 1);
        }
        setSelectedAnswer(null);
        setShowResult(false);
        await moveToNext(isCorrect, currentWord);
      }
    }, 1500);
  };

  const handleSpellingSubmit = async () => {
    if (!currentWord || spellingResult) return;

    const isCorrect = normalizeSpelling(spellingInput) === normalizeSpelling(currentWord.word);
    setSpellingResult(isCorrect ? 'correct' : 'incorrect');

    const reviewOption: SimpleReviewOption = isCorrect ? 'good' : 'forgot';
    const success = await recordReview(currentWord.id, reviewOption, studyMode);

    if (success) {
      setStudiedCount((prev) => prev + 1);
      if (isCorrect) {
        setCorrectCount((prev) => prev + 1);
      }

      setTimeout(async () => {
        setSpellingResult(null);
        setSpellingInput('');
        await moveToNext(isCorrect, currentWord);
      }, 1500);
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

  if (studyMode === 'quiz' && allWords.length < 4) {
    return (
      <View style={styles.centerContainer}>
        <FontAwesome name="exclamation-circle" size={64} color="#f59e0b" />
        <Text style={styles.completeTitle}>単語が不足しています</Text>
        <Text style={styles.completeText}>4択クイズには最低4つの単語が必要です</Text>
        <TouchableOpacity style={styles.homeButton} onPress={() => setStudyMode('flashcard')}>
          <Text style={styles.homeButtonText}>フラッシュカードで学習</Text>
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
              {studiedCount > 0 ? Math.round((correctCount / studiedCount) * 100) : 0}%
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
        {retryCount > 0 && (
          <View style={styles.retryStats}>
            <FontAwesome name="refresh" size={16} color="#f59e0b" />
            <Text style={styles.retryStatsText}>
              リトライ: {retryCount}回
            </Text>
          </View>
        )}
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* モード切り替え */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, studyMode === 'flashcard' && styles.modeButtonActive]}
          onPress={() => setStudyMode('flashcard')}
        >
          <FontAwesome name="clone" size={16} color={studyMode === 'flashcard' ? '#fff' : '#6366f1'} />
          <Text style={[styles.modeButtonText, studyMode === 'flashcard' && styles.modeButtonTextActive]}>カード</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, studyMode === 'quiz' && styles.modeButtonActive]}
          onPress={() => setStudyMode('quiz')}
          disabled={allWords.length < 4}
        >
          <FontAwesome name="list-ul" size={16} color={studyMode === 'quiz' ? '#fff' : '#6366f1'} />
          <Text style={[styles.modeButtonText, studyMode === 'quiz' && styles.modeButtonTextActive]}>4択</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, studyMode === 'spelling' && styles.modeButtonActive]}
          onPress={() => setStudyMode('spelling')}
        >
          <FontAwesome name="keyboard-o" size={16} color={studyMode === 'spelling' ? '#fff' : '#6366f1'} />
          <Text style={[styles.modeButtonText, studyMode === 'spelling' && styles.modeButtonTextActive]}>スペル</Text>
        </TouchableOpacity>
      </View>

      {/* リトライフェーズ表示 */}
      {isRetryPhase && (
        <View style={styles.retryBanner}>
          <FontAwesome name="refresh" size={14} color="#f59e0b" />
          <Text style={styles.retryBannerText}>
            リトライ中 - 間違えた単語を復習
          </Text>
        </View>
      )}

      {/* 進捗 */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentIndex + 1) / currentList.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {currentIndex + 1} / {currentList.length}
          {isRetryPhase && ' (リトライ)'}
        </Text>
      </View>

      {studyMode === 'flashcard' ? (
        <>
          {/* フラッシュカード */}
          <TouchableOpacity
            style={styles.cardContainer}
            onPress={flipCard}
            activeOpacity={0.9}
          >
            <Animated.View
              style={[styles.card, styles.cardFront, { transform: [{ rotateY: frontInterpolate }] }]}
            >
              <Text style={styles.cardHint}>タップして意味を見る</Text>
              <Text style={styles.wordText}>{currentWord?.word}</Text>
              {currentWord?.example && <Text style={styles.exampleText}>{currentWord.example}</Text>}
            </Animated.View>
            <Animated.View
              style={[styles.card, styles.cardBack, { transform: [{ rotateY: backInterpolate }] }]}
            >
              <Text style={styles.cardHint}>どのくらい覚えていましたか？</Text>
              <Text style={styles.meaningText}>{currentWord?.meaning}</Text>
              <Text style={styles.wordSmall}>{currentWord?.word}</Text>
            </Animated.View>
          </TouchableOpacity>
          {isFlipped && (
            <View style={styles.buttonsContainer}>
              <TouchableOpacity style={[styles.reviewButton, styles.forgotButton]} onPress={() => handleReview('forgot')}>
                <FontAwesome name="times" size={20} color="#ef4444" />
                <Text style={[styles.buttonLabel, { color: '#ef4444' }]}>忘れた</Text>
                <Text style={styles.intervalText}>{getNextInterval('forgot')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.reviewButton, styles.hardButton]} onPress={() => handleReview('hard')}>
                <FontAwesome name="meh-o" size={20} color="#f59e0b" />
                <Text style={[styles.buttonLabel, { color: '#f59e0b' }]}>曖昧</Text>
                <Text style={styles.intervalText}>{getNextInterval('hard')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.reviewButton, styles.goodButton]} onPress={() => handleReview('good')}>
                <FontAwesome name="smile-o" size={20} color="#10b981" />
                <Text style={[styles.buttonLabel, { color: '#10b981' }]}>覚えてた</Text>
                <Text style={styles.intervalText}>{getNextInterval('good')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.reviewButton, styles.easyButton]} onPress={() => handleReview('easy')}>
                <FontAwesome name="star" size={20} color="#6366f1" />
                <Text style={[styles.buttonLabel, { color: '#6366f1' }]}>簡単</Text>
                <Text style={styles.intervalText}>{getNextInterval('easy')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : studyMode === 'quiz' ? (
        <View style={styles.quizContainer}>
          <View style={styles.quizCard}>
            <Text style={styles.quizLabel}>この単語の意味は？</Text>
            <Text style={styles.quizWord}>{currentWord?.word}</Text>
            {currentWord?.pronunciation && <Text style={styles.quizPronunciation}>{currentWord.pronunciation}</Text>}
          </View>
          <View style={styles.optionsContainer}>
            {quizOptions.map((option, index) => {
              let optionStyle = [styles.optionButton];
              let textStyle = [styles.optionText];
              if (showResult) {
                if (option.isCorrect) {
                  optionStyle = [...optionStyle, styles.optionCorrect];
                  textStyle = [...textStyle, styles.optionTextCorrect];
                } else if (selectedAnswer === index) {
                  optionStyle = [...optionStyle, styles.optionWrong];
                  textStyle = [...textStyle, styles.optionTextWrong];
                }
              }
              return (
                <TouchableOpacity key={index} style={optionStyle} onPress={() => handleQuizAnswer(index)} disabled={showResult}>
                  <Text style={styles.optionNumber}>{index + 1}</Text>
                  <Text style={textStyle}>{option.meaning}</Text>
                  {showResult && option.isCorrect && <FontAwesome name="check" size={20} color="#10b981" style={styles.optionIcon} />}
                  {showResult && selectedAnswer === index && !option.isCorrect && <FontAwesome name="times" size={20} color="#ef4444" style={styles.optionIcon} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        // スペルモード
        <View style={styles.spellingContainer}>
          <View style={styles.spellingCard}>
            <Text style={styles.spellingLabel}>この意味の英単語を入力</Text>
            <Text style={styles.spellingMeaning}>{currentWord?.meaning}</Text>
            {currentWord?.pronunciation && (
              <Text style={styles.spellingPronunciation}>{currentWord.pronunciation}</Text>
            )}
          </View>

          <View style={styles.spellingInputContainer}>
            <TextInput
              style={[
                styles.spellingInput,
                spellingResult === 'correct' && styles.spellingInputCorrect,
                spellingResult === 'incorrect' && styles.spellingInputIncorrect,
              ]}
              value={spellingInput}
              onChangeText={setSpellingInput}
              placeholder="英単語を入力..."
              autoCapitalize="none"
              autoCorrect={false}
              editable={!spellingResult}
              onSubmitEditing={handleSpellingSubmit}
              returnKeyType="done"
            />
            {spellingResult && (
              <View style={styles.spellingResultContainer}>
                {spellingResult === 'correct' ? (
                  <View style={styles.spellingResultCorrect}>
                    <FontAwesome name="check-circle" size={24} color="#10b981" />
                    <Text style={styles.spellingResultText}>正解!</Text>
                  </View>
                ) : (
                  <View style={styles.spellingResultIncorrect}>
                    <FontAwesome name="times-circle" size={24} color="#ef4444" />
                    <Text style={styles.spellingResultText}>不正解</Text>
                    <Text style={styles.spellingCorrectAnswer}>
                      正解: {currentWord?.word}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {!spellingResult && (
            <TouchableOpacity
              style={[
                styles.spellingSubmitButton,
                !spellingInput.trim() && styles.spellingSubmitButtonDisabled,
              ]}
              onPress={handleSpellingSubmit}
              disabled={!spellingInput.trim()}
            >
              <Text style={styles.spellingSubmitButtonText}>回答する</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
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
  retryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  retryStatsText: {
    fontSize: 14,
    color: '#f59e0b',
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
  retryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  retryBannerText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '500',
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
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6366f1',
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: '#6366f1',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  quizContainer: {
    flex: 1,
    padding: 20,
  },
  quizCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24,
  },
  quizLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
  },
  quizWord: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  quizPronunciation: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  optionCorrect: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  optionWrong: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  optionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  optionTextCorrect: {
    color: '#10b981',
    fontWeight: '600',
  },
  optionTextWrong: {
    color: '#ef4444',
  },
  optionIcon: {
    marginLeft: 8,
  },
  // スペルモードのスタイル
  spellingContainer: {
    flex: 1,
    padding: 20,
  },
  spellingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24,
  },
  spellingLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
  },
  spellingMeaning: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  spellingPronunciation: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  spellingInputContainer: {
    marginBottom: 16,
  },
  spellingInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    textAlign: 'center',
  },
  spellingInputCorrect: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  spellingInputIncorrect: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  spellingResultContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  spellingResultCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spellingResultIncorrect: {
    alignItems: 'center',
    gap: 4,
  },
  spellingResultText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  spellingCorrectAnswer: {
    fontSize: 16,
    color: '#ef4444',
    marginTop: 8,
  },
  spellingSubmitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  spellingSubmitButtonDisabled: {
    backgroundColor: '#c7d2fe',
  },
  spellingSubmitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
