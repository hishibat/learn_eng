import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useAuth } from '@/lib/AuthContext';
import { useStudy } from '@/hooks/useStudy';
import { StudyStats, ModeCompletionStatus, WordWithLearningRecord } from '@/types/database';

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    todayWords,
    loading: studyLoading,
    fetchTodayWords,
    getStudyStats,
    checkModeCompletions,
    fetchMistakeReviewWords,
  } = useStudy();
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [modeCompletions, setModeCompletions] = useState<ModeCompletionStatus>({
    flashcard: false,
    quiz: false,
    spelling: false,
  });
  const [mistakeReviewData, setMistakeReviewData] = useState<{
    sevenDayReview: WordWithLearningRecord[];
    thirtyDayReview: WordWithLearningRecord[];
  }>({ sevenDayReview: [], thirtyDayReview: [] });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    fetchTodayWords();
    const studyStats = await getStudyStats();
    setStats(studyStats);
    const completions = await checkModeCompletions();
    setModeCompletions(completions);
    const reviewWords = await fetchMistakeReviewWords();
    setMistakeReviewData(reviewWords);
  };

  const completedModesCount = Object.values(modeCompletions).filter(Boolean).length;

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.welcomeContainer}>
          <FontAwesome name="graduation-cap" size={64} color="#6366f1" />
          <Text style={styles.welcomeTitle}>英語学習アプリ</Text>
          <Text style={styles.welcomeSubtitle}>
            効果的に単語を覚えましょう
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <FontAwesome name="google" size={20} color="#fff" />
            <Text style={styles.loginButtonText}>Googleでログイン</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>こんにちは!</Text>
        <Text style={styles.subtitle}>今日も学習を続けましょう</Text>
      </View>

      {/* 今日の学習カード */}
      <TouchableOpacity
        style={styles.studyCard}
        onPress={() => router.push('/study')}
      >
        <View style={styles.studyCardContent}>
          <View style={styles.studyCardLeft}>
            <FontAwesome name="play-circle" size={48} color="#fff" />
          </View>
          <View style={styles.studyCardRight}>
            <Text style={styles.studyCardTitle}>今日の学習</Text>
            {studyLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.studyCardCount}>
                {todayWords.length > 0
                  ? `${todayWords.length}単語を復習`
                  : '復習完了 - 練習モードで学習'}
              </Text>
            )}
          </View>
        </View>
        {/* モード完了バッジ */}
        {completedModesCount > 0 && (
          <View style={styles.completionBadges}>
            {modeCompletions.flashcard && (
              <View style={styles.completionBadge}>
                <FontAwesome name="clone" size={10} color="#fff" />
              </View>
            )}
            {modeCompletions.quiz && (
              <View style={styles.completionBadge}>
                <FontAwesome name="list-ul" size={10} color="#fff" />
              </View>
            )}
            {modeCompletions.spelling && (
              <View style={styles.completionBadge}>
                <FontAwesome name="keyboard-o" size={10} color="#fff" />
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* 間違い復習セクション */}
      {(mistakeReviewData.sevenDayReview.length > 0 || mistakeReviewData.thirtyDayReview.length > 0) && (
        <View style={styles.mistakeReviewSection}>
          <Text style={styles.sectionTitle}>過去の間違いを復習</Text>
          {mistakeReviewData.sevenDayReview.length > 0 && (
            <TouchableOpacity
              style={styles.mistakeReviewCard}
              onPress={() => router.push({ pathname: '/study', params: { practice: 'true' } })}
            >
              <View style={styles.mistakeReviewIcon}>
                <FontAwesome name="calendar" size={20} color="#f59e0b" />
              </View>
              <View style={styles.mistakeReviewContent}>
                <Text style={styles.mistakeReviewTitle}>1週間前の間違い</Text>
                <Text style={styles.mistakeReviewCount}>
                  {mistakeReviewData.sevenDayReview.length}単語
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
          {mistakeReviewData.thirtyDayReview.length > 0 && (
            <TouchableOpacity
              style={styles.mistakeReviewCard}
              onPress={() => router.push({ pathname: '/study', params: { practice: 'true' } })}
            >
              <View style={styles.mistakeReviewIcon}>
                <FontAwesome name="calendar-o" size={20} color="#8b5cf6" />
              </View>
              <View style={styles.mistakeReviewContent}>
                <Text style={styles.mistakeReviewTitle}>1か月前の間違い</Text>
                <Text style={styles.mistakeReviewCount}>
                  {mistakeReviewData.thirtyDayReview.length}単語
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 統計カード */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.totalWords || 0}</Text>
          <Text style={styles.statLabel}>総単語数</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.masteredWords || 0}</Text>
          <Text style={styles.statLabel}>習得済み</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.todayStudied || 0}</Text>
          <Text style={styles.statLabel}>今日の学習</Text>
        </View>
      </View>

      {/* クイックアクション */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>クイックアクション</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/add-word')}
        >
          <FontAwesome name="plus-circle" size={24} color="#6366f1" />
          <Text style={styles.actionButtonText}>新しい単語を追加</Text>
          <FontAwesome name="chevron-right" size={16} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.importButton]}
          onPress={() => router.push("/import-image" as any)}
        >
          <FontAwesome name="camera" size={24} color="#10B981" />
          <Text style={styles.actionButtonText}>画像から取り込み</Text>
          <FontAwesome name="chevron-right" size={16} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.mistakeButton]}
          onPress={() => router.push("/mistake-review" as any)}
        >
          <FontAwesome name="exclamation-circle" size={24} color="#ef4444" />
          <Text style={styles.actionButtonText}>間違い振り返り</Text>
          <FontAwesome name="chevron-right" size={16} color="#9ca3af" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/words')}
        >
          <FontAwesome name="list" size={24} color="#6366f1" />
          <Text style={styles.actionButtonText}>単語一覧を見る</Text>
          <FontAwesome name="chevron-right" size={16} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 24,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 32,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 12,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 4,
  },
  studyCard: {
    backgroundColor: '#6366f1',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  studyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studyCardLeft: {
    marginRight: 16,
  },
  studyCardRight: {
    flex: 1,
  },
  studyCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  studyCardCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  actionsContainer: {
    marginTop: 24,
    marginHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  importButton: {
    borderLeftWidth: 3,
    borderLeftColor: "#10B981",
  },
  mistakeButton: {
    borderLeftWidth: 3,
    borderLeftColor: "#ef4444",
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },
  // モード完了バッジ
  completionBadges: {
    flexDirection: 'row',
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 6,
  },
  completionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // 間違い復習セクション
  mistakeReviewSection: {
    marginTop: 20,
    marginHorizontal: 20,
  },
  mistakeReviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  mistakeReviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mistakeReviewContent: {
    flex: 1,
  },
  mistakeReviewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  mistakeReviewCount: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
});
