import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { DailyStats, WordDifficulty, TagMastery, DetailedStats } from '../types/database';

export function useStatistics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 日別学習統計を取得（過去30日）
  const fetchDailyStats = useCallback(async (days: number = 30): Promise<DailyStats[]> => {
    if (!user) return [];

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const { data: sessions, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('studied_count, correct_count, created_at')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (sessionsError) throw sessionsError;

      // 日付ごとに集計
      const dailyMap = new Map<string, { studied: number; correct: number }>();

      (sessions || []).forEach((session) => {
        const date = new Date(session.created_at).toISOString().split('T')[0];
        const existing = dailyMap.get(date) || { studied: 0, correct: 0 };
        dailyMap.set(date, {
          studied: existing.studied + session.studied_count,
          correct: existing.correct + session.correct_count,
        });
      });

      // 全日付を埋める
      const result: DailyStats[] = [];
      const currentDate = new Date(startDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      while (currentDate <= today) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const stats = dailyMap.get(dateStr) || { studied: 0, correct: 0 };
        result.push({
          date: dateStr,
          studied_count: stats.studied,
          correct_count: stats.correct,
          accuracy: stats.studied > 0 ? Math.round((stats.correct / stats.studied) * 100) : 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return result;
    } catch (err) {
      console.error('Error fetching daily stats:', err);
      return [];
    }
  }, [user]);

  // 難しい単語TOP10を取得
  const fetchDifficultWords = useCallback(async (limit: number = 10): Promise<WordDifficulty[]> => {
    if (!user) return [];

    try {
      const { data: records, error: recordsError } = await supabase
        .from('learning_records')
        .select(`
          word_id,
          total_mistakes,
          repetitions,
          words!inner (word, meaning)
        `)
        .eq('user_id', user.id)
        .gt('total_mistakes', 0)
        .order('total_mistakes', { ascending: false })
        .limit(limit);

      if (recordsError) throw recordsError;

      return (records || []).map((record: any) => ({
        word_id: record.word_id,
        word: record.words.word,
        meaning: record.words.meaning,
        mistake_count: record.total_mistakes || 0,
        accuracy: record.repetitions > 0
          ? Math.round(((record.repetitions - record.total_mistakes) / record.repetitions) * 100)
          : 0,
      }));
    } catch (err) {
      console.error('Error fetching difficult words:', err);
      return [];
    }
  }, [user]);

  // タグ別習得率を取得
  const fetchTagMastery = useCallback(async (): Promise<TagMastery[]> => {
    if (!user) return [];

    try {
      // タグごとの単語数と習得済み単語数を取得
      const { data: tags, error: tagsError } = await supabase
        .from('tags')
        .select('id, name, color')
        .eq('user_id', user.id);

      if (tagsError) throw tagsError;

      const result: TagMastery[] = [];

      for (const tag of tags || []) {
        // このタグに紐づく単語IDを取得
        const { data: wordTags, error: wordTagsError } = await supabase
          .from('word_tags')
          .select('word_id')
          .eq('tag_id', tag.id);

        if (wordTagsError) throw wordTagsError;

        const wordIds = (wordTags || []).map((wt) => wt.word_id);

        if (wordIds.length === 0) {
          result.push({
            tag_id: tag.id,
            tag_name: tag.name,
            tag_color: tag.color,
            total_words: 0,
            mastered_words: 0,
            mastery_rate: 0,
          });
          continue;
        }

        // 習得済み（interval_days >= 21）の単語数を取得
        const { count: masteredCount, error: masteredError } = await supabase
          .from('learning_records')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('word_id', wordIds)
          .gte('interval_days', 21);

        if (masteredError) throw masteredError;

        result.push({
          tag_id: tag.id,
          tag_name: tag.name,
          tag_color: tag.color,
          total_words: wordIds.length,
          mastered_words: masteredCount || 0,
          mastery_rate: wordIds.length > 0
            ? Math.round(((masteredCount || 0) / wordIds.length) * 100)
            : 0,
        });
      }

      return result.sort((a, b) => b.total_words - a.total_words);
    } catch (err) {
      console.error('Error fetching tag mastery:', err);
      return [];
    }
  }, [user]);

  // 連続学習日数（ストリーク）を計算
  const calculateStreak = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      const { data: sessions, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      if (!sessions || sessions.length === 0) return 0;

      // 日付のセットを作成
      const studyDates = new Set<string>();
      sessions.forEach((session) => {
        const date = new Date(session.created_at).toISOString().split('T')[0];
        studyDates.add(date);
      });

      // 今日からさかのぼって連続日数をカウント
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const currentDate = new Date(today);

      // 今日学習していない場合は昨日から開始
      const todayStr = currentDate.toISOString().split('T')[0];
      if (!studyDates.has(todayStr)) {
        currentDate.setDate(currentDate.getDate() - 1);
      }

      while (true) {
        const dateStr = currentDate.toISOString().split('T')[0];
        if (studyDates.has(dateStr)) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }

      return streak;
    } catch (err) {
      console.error('Error calculating streak:', err);
      return 0;
    }
  }, [user]);

  // 合計学習時間を取得（分単位）
  const fetchTotalStudyTime = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      const { data: sessions, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('duration_seconds')
        .eq('user_id', user.id);

      if (sessionsError) throw sessionsError;

      const totalSeconds = (sessions || []).reduce(
        (sum, session) => sum + (session.duration_seconds || 0),
        0
      );

      return Math.round(totalSeconds / 60);
    } catch (err) {
      console.error('Error fetching total study time:', err);
      return 0;
    }
  }, [user]);

  // 全体の正答率を計算
  const fetchAverageAccuracy = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    try {
      const { data: sessions, error: sessionsError } = await supabase
        .from('study_sessions')
        .select('studied_count, correct_count')
        .eq('user_id', user.id);

      if (sessionsError) throw sessionsError;

      const totals = (sessions || []).reduce(
        (acc, session) => ({
          studied: acc.studied + session.studied_count,
          correct: acc.correct + session.correct_count,
        }),
        { studied: 0, correct: 0 }
      );

      return totals.studied > 0
        ? Math.round((totals.correct / totals.studied) * 100)
        : 0;
    } catch (err) {
      console.error('Error fetching average accuracy:', err);
      return 0;
    }
  }, [user]);

  // 詳細統計をすべて取得
  const fetchDetailedStats = useCallback(async (): Promise<DetailedStats | null> => {
    if (!user) return null;

    try {
      setLoading(true);
      setError(null);

      // 並列で各統計を取得
      const [
        dailyStats,
        difficultWords,
        tagMastery,
        streak,
        totalStudyTimeMinutes,
        averageAccuracy,
        basicStats,
      ] = await Promise.all([
        fetchDailyStats(30),
        fetchDifficultWords(10),
        fetchTagMastery(),
        calculateStreak(),
        fetchTotalStudyTime(),
        fetchAverageAccuracy(),
        fetchBasicStats(),
      ]);

      return {
        ...basicStats,
        dailyStats,
        difficultWords,
        tagMastery,
        totalStudyTimeMinutes,
        averageAccuracy,
        streak,
      };
    } catch (err) {
      console.error('Error fetching detailed stats:', err);
      setError(err instanceof Error ? err.message : '統計の取得に失敗しました');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, fetchDailyStats, fetchDifficultWords, fetchTagMastery, calculateStreak, fetchTotalStudyTime, fetchAverageAccuracy]);

  // 基本統計を取得（useStudyと同様）
  const fetchBasicStats = useCallback(async () => {
    if (!user) {
      return {
        totalWords: 0,
        masteredWords: 0,
        learningWords: 0,
        newWords: 0,
        todayStudied: 0,
        streak: 0,
      };
    }

    try {
      const { count: totalWords } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: masteredWords } = await supabase
        .from('learning_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('interval_days', 21);

      const { count: learningWords } = await supabase
        .from('learning_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gt('interval_days', 0)
        .lt('interval_days', 21);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todaySessions } = await supabase
        .from('study_sessions')
        .select('studied_count')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      const todayStudied = (todaySessions || []).reduce(
        (sum, session) => sum + session.studied_count,
        0
      );

      return {
        totalWords: totalWords || 0,
        masteredWords: masteredWords || 0,
        learningWords: learningWords || 0,
        newWords: (totalWords || 0) - (masteredWords || 0) - (learningWords || 0),
        todayStudied,
        streak: 0,
      };
    } catch (err) {
      console.error('Error fetching basic stats:', err);
      return {
        totalWords: 0,
        masteredWords: 0,
        learningWords: 0,
        newWords: 0,
        todayStudied: 0,
        streak: 0,
      };
    }
  }, [user]);

  return {
    loading,
    error,
    fetchDailyStats,
    fetchDifficultWords,
    fetchTagMastery,
    calculateStreak,
    fetchTotalStudyTime,
    fetchAverageAccuracy,
    fetchDetailedStats,
  };
}
