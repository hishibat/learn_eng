import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { MistakeHistoryItem, WordMistakeSummary, StudyMode } from '../types/database';

interface FetchMistakeHistoryOptions {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

type DateFilter = 'today' | 'week' | 'month' | 'all';

export function useMistakeReview() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 日付フィルターから開始日を計算
  const getStartDateFromFilter = (filter: DateFilter): Date | undefined => {
    const now = new Date();
    switch (filter) {
      case 'today':
        now.setHours(0, 0, 0, 0);
        return now;
      case 'week':
        now.setDate(now.getDate() - 7);
        now.setHours(0, 0, 0, 0);
        return now;
      case 'month':
        now.setDate(now.getDate() - 30);
        now.setHours(0, 0, 0, 0);
        return now;
      case 'all':
        return undefined;
    }
  };

  // 間違い履歴を取得
  const fetchMistakeHistory = useCallback(async (
    options?: FetchMistakeHistoryOptions
  ): Promise<MistakeHistoryItem[]> => {
    if (!user) return [];

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('mistake_records')
        .select(`
          id,
          word_id,
          study_mode,
          created_at,
          words!inner (
            word,
            meaning
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (options?.startDate) {
        query = query.gte('created_at', options.startDate.toISOString());
      }
      if (options?.endDate) {
        query = query.lte('created_at', options.endDate.toISOString());
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      return (data || []).map((item: any) => ({
        id: item.id,
        word_id: item.word_id,
        word: item.words.word,
        meaning: item.words.meaning,
        study_mode: item.study_mode as StudyMode,
        created_at: item.created_at,
      }));
    } catch (err) {
      console.error('Error fetching mistake history:', err);
      setError(err instanceof Error ? err.message : '間違い履歴の取得に失敗しました');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 日付フィルターを使用して間違い履歴を取得
  const fetchMistakesByFilter = useCallback(async (
    filter: DateFilter,
    limit?: number
  ): Promise<MistakeHistoryItem[]> => {
    const startDate = getStartDateFromFilter(filter);
    return fetchMistakeHistory({ startDate, limit });
  }, [fetchMistakeHistory]);

  // 単語ごとの間違いサマリーを取得
  const fetchMistakeSummary = useCallback(async (): Promise<WordMistakeSummary[]> => {
    if (!user) return [];

    try {
      setLoading(true);
      setError(null);

      // 間違い記録を単語ごとに集計
      const { data, error: fetchError } = await supabase
        .from('mistake_records')
        .select(`
          word_id,
          created_at,
          words!inner (
            word,
            meaning
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // 単語ごとに集計
      const summaryMap = new Map<string, {
        word_id: string;
        word: string;
        meaning: string;
        count: number;
        lastMistake: string;
      }>();

      (data || []).forEach((item: any) => {
        const wordId = item.word_id;
        if (summaryMap.has(wordId)) {
          summaryMap.get(wordId)!.count++;
        } else {
          summaryMap.set(wordId, {
            word_id: wordId,
            word: item.words.word,
            meaning: item.words.meaning,
            count: 1,
            lastMistake: item.created_at,
          });
        }
      });

      // 間違い回数の多い順にソート
      return Array.from(summaryMap.values())
        .map((item) => ({
          word_id: item.word_id,
          word: item.word,
          meaning: item.meaning,
          mistake_count: item.count,
          last_mistake_at: item.lastMistake,
        }))
        .sort((a, b) => b.mistake_count - a.mistake_count);
    } catch (err) {
      console.error('Error fetching mistake summary:', err);
      setError(err instanceof Error ? err.message : '間違いサマリーの取得に失敗しました');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 特定の単語の間違い詳細を取得
  const fetchWordMistakeDetails = useCallback(async (
    wordId: string
  ): Promise<MistakeHistoryItem[]> => {
    if (!user) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('mistake_records')
        .select(`
          id,
          word_id,
          study_mode,
          created_at,
          words!inner (
            word,
            meaning
          )
        `)
        .eq('user_id', user.id)
        .eq('word_id', wordId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      return (data || []).map((item: any) => ({
        id: item.id,
        word_id: item.word_id,
        word: item.words.word,
        meaning: item.words.meaning,
        study_mode: item.study_mode as StudyMode,
        created_at: item.created_at,
      }));
    } catch (err) {
      console.error('Error fetching word mistake details:', err);
      return [];
    }
  }, [user]);

  return {
    loading,
    error,
    fetchMistakeHistory,
    fetchMistakesByFilter,
    fetchMistakeSummary,
    fetchWordMistakeDetails,
    getStartDateFromFilter,
  };
}
