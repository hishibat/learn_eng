import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useAuth } from '@/lib/AuthContext';
import { useStatistics } from '@/hooks/useStatistics';
import { DetailedStats, DailyStats, WordDifficulty, TagMastery } from '@/types/database';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 40;
const CHART_HEIGHT = 150;

// 簡易バーチャート（日別学習グラフ）
function DailyChart({ data }: { data: DailyStats[] }) {
  if (data.length === 0) return null;

  const maxStudied = Math.max(...data.map((d) => d.studied_count), 1);
  const recentData = data.slice(-14); // 直近14日を表示

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>日別学習数（直近14日）</Text>
      <View style={styles.barChart}>
        {recentData.map((day, index) => {
          const height = (day.studied_count / maxStudied) * CHART_HEIGHT;
          const date = new Date(day.date);
          const dayLabel = `${date.getMonth() + 1}/${date.getDate()}`;

          return (
            <View key={day.date} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(height, 2),
                      backgroundColor: day.studied_count > 0 ? '#6366f1' : '#e5e7eb',
                    },
                  ]}
                />
              </View>
              {index % 2 === 0 && (
                <Text style={styles.barLabel}>{dayLabel}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// 正答率推移グラフ
function AccuracyChart({ data }: { data: DailyStats[] }) {
  const recentData = data.slice(-14).filter((d) => d.studied_count > 0);

  if (recentData.length === 0) {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>正答率推移</Text>
        <Text style={styles.noDataText}>データがありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>正答率推移</Text>
      <View style={styles.accuracyChart}>
        {recentData.map((day, index) => {
          const height = (day.accuracy / 100) * (CHART_HEIGHT - 20);
          const date = new Date(day.date);
          const dayLabel = `${date.getMonth() + 1}/${date.getDate()}`;

          return (
            <View key={day.date} style={styles.accuracyBarContainer}>
              <Text style={styles.accuracyValue}>{day.accuracy}%</Text>
              <View style={styles.accuracyBarWrapper}>
                <View
                  style={[
                    styles.accuracyBar,
                    {
                      height: Math.max(height, 4),
                      backgroundColor:
                        day.accuracy >= 80
                          ? '#10b981'
                          : day.accuracy >= 60
                          ? '#f59e0b'
                          : '#ef4444',
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// 難しい単語リスト
function DifficultWordsList({ words }: { words: WordDifficulty[] }) {
  if (words.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <FontAwesome name="exclamation-triangle" size={16} color="#f59e0b" /> 難しい単語TOP10
        </Text>
        <Text style={styles.noDataText}>間違えた単語がありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        <FontAwesome name="exclamation-triangle" size={16} color="#f59e0b" /> 難しい単語TOP10
      </Text>
      {words.map((word, index) => (
        <View key={word.word_id} style={styles.difficultWordItem}>
          <View style={styles.wordRank}>
            <Text style={styles.rankNumber}>{index + 1}</Text>
          </View>
          <View style={styles.wordInfo}>
            <Text style={styles.wordText}>{word.word}</Text>
            <Text style={styles.wordMeaning}>{word.meaning}</Text>
          </View>
          <View style={styles.mistakeInfo}>
            <Text style={styles.mistakeCount}>{word.mistake_count}回</Text>
            <Text style={styles.mistakeLabel}>間違い</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// タグ別習得率
function TagMasteryList({ tags }: { tags: TagMastery[] }) {
  if (tags.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <FontAwesome name="tags" size={16} color="#6366f1" /> タグ別習得率
        </Text>
        <Text style={styles.noDataText}>タグがありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        <FontAwesome name="tags" size={16} color="#6366f1" /> タグ別習得率
      </Text>
      {tags.map((tag) => (
        <View key={tag.tag_id} style={styles.tagItem}>
          <View style={styles.tagHeader}>
            <View style={[styles.tagBadge, { backgroundColor: tag.tag_color }]}>
              <Text style={styles.tagBadgeText}>{tag.tag_name}</Text>
            </View>
            <Text style={styles.tagStats}>
              {tag.mastered_words}/{tag.total_words}語 習得
            </Text>
          </View>
          <View style={styles.tagProgressBar}>
            <View
              style={[
                styles.tagProgressFill,
                {
                  width: `${tag.mastery_rate}%`,
                  backgroundColor: tag.tag_color,
                },
              ]}
            />
          </View>
          <Text style={styles.tagMasteryRate}>{tag.mastery_rate}%</Text>
        </View>
      ))}
    </View>
  );
}

export default function StatisticsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { loading, error, fetchDetailedStats } = useStatistics();
  const [stats, setStats] = useState<DetailedStats | null>(null);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  const loadStats = async () => {
    const detailedStats = await fetchDetailedStats();
    setStats(detailedStats);
  };

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>ログインしてください</Text>
      </View>
    );
  }

  if (loading || !stats) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>統計を読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* サマリーカード */}
      <View style={styles.summarySection}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <FontAwesome name="fire" size={24} color="#ef4444" />
            <Text style={styles.summaryValue}>{stats.streak}</Text>
            <Text style={styles.summaryLabel}>連続日数</Text>
          </View>
          <View style={styles.summaryCard}>
            <FontAwesome name="clock-o" size={24} color="#6366f1" />
            <Text style={styles.summaryValue}>{stats.totalStudyTimeMinutes}</Text>
            <Text style={styles.summaryLabel}>総学習時間(分)</Text>
          </View>
          <View style={styles.summaryCard}>
            <FontAwesome name="percent" size={24} color="#10b981" />
            <Text style={styles.summaryValue}>{stats.averageAccuracy}%</Text>
            <Text style={styles.summaryLabel}>平均正答率</Text>
          </View>
        </View>
      </View>

      {/* 単語統計 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <FontAwesome name="book" size={16} color="#6366f1" /> 単語統計
        </Text>
        <View style={styles.wordStatsGrid}>
          <View style={styles.wordStatItem}>
            <Text style={styles.wordStatValue}>{stats.totalWords}</Text>
            <Text style={styles.wordStatLabel}>総単語数</Text>
          </View>
          <View style={styles.wordStatItem}>
            <Text style={[styles.wordStatValue, { color: '#10b981' }]}>
              {stats.masteredWords}
            </Text>
            <Text style={styles.wordStatLabel}>習得済み</Text>
          </View>
          <View style={styles.wordStatItem}>
            <Text style={[styles.wordStatValue, { color: '#f59e0b' }]}>
              {stats.learningWords}
            </Text>
            <Text style={styles.wordStatLabel}>学習中</Text>
          </View>
          <View style={styles.wordStatItem}>
            <Text style={[styles.wordStatValue, { color: '#9ca3af' }]}>
              {stats.newWords}
            </Text>
            <Text style={styles.wordStatLabel}>新規</Text>
          </View>
        </View>
      </View>

      {/* 日別学習グラフ */}
      <DailyChart data={stats.dailyStats} />

      {/* 正答率推移 */}
      <AccuracyChart data={stats.dailyStats} />

      {/* 難しい単語TOP10 */}
      <DifficultWordsList words={stats.difficultWords} />

      {/* タグ別習得率 */}
      <TagMasteryList tags={stats.tagMastery} />

      <View style={styles.footer} />
    </ScrollView>
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
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 16,
  },
  summarySection: {
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  wordStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  wordStatItem: {
    flex: 1,
    minWidth: '40%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  wordStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  wordStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: CHART_HEIGHT + 30,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 12,
    borderRadius: 6,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 9,
    color: '#9ca3af',
    marginTop: 4,
  },
  accuracyChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
  },
  accuracyBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  accuracyValue: {
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 4,
  },
  accuracyBarWrapper: {
    height: CHART_HEIGHT - 20,
    justifyContent: 'flex-end',
  },
  accuracyBar: {
    width: 16,
    borderRadius: 8,
    minHeight: 4,
  },
  noDataText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },
  difficultWordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  wordRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  wordInfo: {
    flex: 1,
  },
  wordText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  wordMeaning: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  mistakeInfo: {
    alignItems: 'flex-end',
  },
  mistakeCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  mistakeLabel: {
    fontSize: 10,
    color: '#9ca3af',
  },
  tagItem: {
    marginBottom: 16,
  },
  tagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  tagStats: {
    fontSize: 12,
    color: '#6b7280',
  },
  tagProgressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tagProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  tagMasteryRate: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 4,
  },
  footer: {
    height: 40,
  },
});
