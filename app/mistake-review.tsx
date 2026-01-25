import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useAuth } from '@/lib/AuthContext';
import { useMistakeReview } from '@/hooks/useMistakeReview';
import { WordMistakeSummary, MistakeHistoryItem } from '@/types/database';

type DateFilter = 'today' | 'week' | 'month' | 'all';

const filterLabels: Record<DateFilter, string> = {
  today: '今日',
  week: '今週',
  month: '今月',
  all: '全期間',
};

const modeLabels: Record<string, string> = {
  flashcard: 'カード',
  quiz: '4択',
  spelling: 'スペル',
};

export default function MistakeReviewScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    loading,
    fetchMistakesByFilter,
    fetchMistakeSummary,
    fetchWordMistakeDetails,
  } = useMistakeReview();

  const [filter, setFilter] = useState<DateFilter>('week');
  const [viewMode, setViewMode] = useState<'history' | 'summary'>('summary');
  const [mistakeHistory, setMistakeHistory] = useState<MistakeHistoryItem[]>([]);
  const [mistakeSummary, setMistakeSummary] = useState<WordMistakeSummary[]>([]);
  const [selectedWord, setSelectedWord] = useState<WordMistakeSummary | null>(null);
  const [wordDetails, setWordDetails] = useState<MistakeHistoryItem[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, filter, viewMode]);

  const loadData = async () => {
    if (viewMode === 'history') {
      const history = await fetchMistakesByFilter(filter, 100);
      setMistakeHistory(history);
    } else {
      const summary = await fetchMistakeSummary();
      setMistakeSummary(summary);
    }
  };

  const handleWordPress = async (item: WordMistakeSummary) => {
    setSelectedWord(item);
    setDetailsLoading(true);
    const details = await fetchWordMistakeDetails(item.word_id);
    setWordDetails(details);
    setDetailsLoading(false);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      return '1時間以内';
    } else if (diffHours < 24) {
      return `${diffHours}時間前`;
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <FontAwesome name="lock" size={48} color="#9ca3af" />
        <Text style={styles.messageText}>ログインしてください</Text>
      </View>
    );
  }

  const renderHistoryItem = ({ item }: { item: MistakeHistoryItem }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyContent}>
        <Text style={styles.wordText}>{item.word}</Text>
        <Text style={styles.meaningText}>{item.meaning}</Text>
        <View style={styles.historyMeta}>
          <View style={styles.modeBadge}>
            <Text style={styles.modeBadgeText}>{modeLabels[item.study_mode] || item.study_mode}</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
    </View>
  );

  const renderSummaryItem = ({ item }: { item: WordMistakeSummary }) => (
    <TouchableOpacity
      style={styles.summaryItem}
      onPress={() => handleWordPress(item)}
    >
      <View style={styles.summaryContent}>
        <View style={styles.summaryHeader}>
          <Text style={styles.wordText}>{item.word}</Text>
          <View style={styles.mistakeCountBadge}>
            <FontAwesome name="times" size={12} color="#ef4444" />
            <Text style={styles.mistakeCountText}>{item.mistake_count}</Text>
          </View>
        </View>
        <Text style={styles.meaningText}>{item.meaning}</Text>
        <Text style={styles.dateText}>最後の間違い: {formatDate(item.last_mistake_at)}</Text>
      </View>
      <FontAwesome name="chevron-right" size={16} color="#9ca3af" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>間違い振り返り</Text>
      </View>

      {/* ビューモード切り替え */}
      <View style={styles.viewModeSelector}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'summary' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('summary')}
        >
          <Text style={[styles.viewModeText, viewMode === 'summary' && styles.viewModeTextActive]}>
            単語別
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'history' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('history')}
        >
          <Text style={[styles.viewModeText, viewMode === 'history' && styles.viewModeTextActive]}>
            履歴
          </Text>
        </TouchableOpacity>
      </View>

      {/* 日付フィルター（履歴モードのみ） */}
      {viewMode === 'history' && (
        <View style={styles.filterContainer}>
          {(['today', 'week', 'month', 'all'] as DateFilter[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, filter === f && styles.filterButtonActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {filterLabels[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* コンテンツ */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : viewMode === 'history' ? (
        mistakeHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="check-circle" size={48} color="#10b981" />
            <Text style={styles.emptyText}>この期間の間違いはありません</Text>
          </View>
        ) : (
          <FlatList
            data={mistakeHistory}
            renderItem={renderHistoryItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        mistakeSummary.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="check-circle" size={48} color="#10b981" />
            <Text style={styles.emptyText}>間違えた単語はありません</Text>
          </View>
        ) : (
          <FlatList
            data={mistakeSummary}
            renderItem={renderSummaryItem}
            keyExtractor={(item) => item.word_id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {/* 単語詳細モーダル */}
      <Modal
        visible={selectedWord !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedWord(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedWord?.word}</Text>
              <TouchableOpacity
                onPress={() => setSelectedWord(null)}
                style={styles.modalCloseButton}
              >
                <FontAwesome name="times" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalMeaning}>{selectedWord?.meaning}</Text>
            <View style={styles.modalStats}>
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatValue}>{selectedWord?.mistake_count}</Text>
                <Text style={styles.modalStatLabel}>間違い回数</Text>
              </View>
            </View>

            <Text style={styles.modalSectionTitle}>間違い履歴</Text>
            {detailsLoading ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <FlatList
                data={wordDetails}
                renderItem={({ item }) => (
                  <View style={styles.detailItem}>
                    <View style={styles.modeBadge}>
                      <Text style={styles.modeBadgeText}>{modeLabels[item.study_mode] || item.study_mode}</Text>
                    </View>
                    <Text style={styles.detailDate}>{formatDate(item.created_at)}</Text>
                  </View>
                )}
                keyExtractor={(item) => item.id}
                style={styles.detailsList}
              />
            )}

            <TouchableOpacity
              style={styles.practiceButton}
              onPress={() => {
                setSelectedWord(null);
                router.push({ pathname: '/study', params: { practice: 'true' } });
              }}
            >
              <FontAwesome name="play" size={16} color="#fff" />
              <Text style={styles.practiceButtonText}>この単語を練習</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  viewModeSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  viewModeButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  viewModeTextActive: {
    color: '#fff',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  filterText: {
    fontSize: 13,
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    textAlign: 'center',
  },
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  historyContent: {
    flex: 1,
  },
  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryContent: {
    flex: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  meaningText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  modeBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modeBadgeText: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '500',
  },
  mistakeCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  mistakeCountText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  // モーダルスタイル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalMeaning: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  modalStats: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  modalStatItem: {
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  modalStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  detailsList: {
    maxHeight: 200,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  detailDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  practiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  practiceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
