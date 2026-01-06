import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { WordWithLearningRecord, LearningRecord, StudyStats } from '../types/database';
import { calculateSRS, SimpleReviewOption, simpleToQuality } from '../lib/srs';

export function useStudy() {
  const { user } = useAuth();
  const [todayWords, setTodayWords] = useState<WordWithLearningRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 今日学習すべき単語を取得
  const fetchTodayWords = useCallback(async () => {
    if (!user) {
      setTodayWords([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const now = new Date().toISOString();

      const { data, error: fetchError } = await supabase
        .from('words')
        .select(`
          *,
          learning_records!inner (
            ease_factor,
            interval_days,
            repetitions,
            next_review,
            last_reviewed
          )
        `)
        .eq('user_id', user.id)
        .lte('learning_records.next_review', now)
        .order('learning_records(next_review)', { ascending: true });

      if (fetchError) throw fetchError;

      const wordsWithRecords: WordWithLearningRecord[] = (data || []).map((item: any) => ({
        ...item,
        ease_factor: item.learning_records?.[0]?.ease_factor ?? null,
        interval_days: item.learning_records?.[0]?.interval_days ?? null,
        repetitions: item.learning_records?.[0]?.repetitions ?? null,
        next_review: item.learning_records?.[0]?.next_review ?? null,
        last_reviewed: item.learning_records?.[0]?.last_reviewed ?? null,
        learning_records: undefined,
      }));

      setTodayWords(wordsWithRecords);
    } catch (err) {
      console.error('Error fetching today words:', err);
      setError(err instanceof Error ? err.message : '学習データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 学習結果を記録
  const recordReview = async (
    wordId: string,
    reviewOption: SimpleReviewOption
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);

      // 現在の学習記録を取得
      const { data: currentRecord, error: fetchError } = await supabase
        .from('learning_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('word_id', wordId)
        .single();

      if (fetchError) throw fetchError;

      // SRS計算
      const quality = simpleToQuality(reviewOption);
      const result = calculateSRS(
        quality,
        currentRecord.ease_factor,
        currentRecord.interval_days,
        currentRecord.repetitions
      );

      // 学習記録を更新
      const { error: updateError } = await supabase
        .from('learning_records')
        .update({
          ease_factor: result.easeFactor,
          interval_days: result.intervalDays,
          repetitions: result.repetitions,
          next_review: result.nextReview.toISOString(),
          last_reviewed: new Date().toISOString(),
        })
        .eq('id', currentRecord.id);

      if (updateError) throw updateError;

      return true;
    } catch (err) {
      console.error('Error recording review:', err);
      setError(err instanceof Error ? err.message : '学習記録の保存に失敗しました');
      return false;
    }
  };

  // 学習セッションを保存
  const saveStudySession = async (
    studiedCount: number,
    correctCount: number,
    durationSeconds: number
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);

      const { error: insertError } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          studied_count: studiedCount,
          correct_count: correctCount,
          duration_seconds: durationSeconds,
        });

      if (insertError) throw insertError;

      return true;
    } catch (err) {
      console.error('Error saving study session:', err);
      setError(err instanceof Error ? err.message : 'セッションの保存に失敗しました');
      return false;
    }
  };

  // 学習統計を取得
  const getStudyStats = async (): Promise<StudyStats | null> => {
    if (!user) return null;

    try {
      setError(null);

      // 総単語数を取得
      const { count: totalWords, error: totalError } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (totalError) throw totalError;

      // 習得済み（interval_days >= 21）の単語数
      const { count: masteredWords, error: masteredError } = await supabase
        .from('learning_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('interval_days', 21);

      if (masteredError) throw masteredError;

      // 学習中（0 < interval_days < 21）の単語数
      const { count: learningWords, error: learningError } = await supabase
        .from('learning_records')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gt('interval_days', 0)
        .lt('interval_days', 21);

      if (learningError) throw learningError;

      // 今日学習した単語数
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: todaySessions, error: todayError } = await supabase
        .from('study_sessions')
        .select('studied_count')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString());

      if (todayError) throw todayError;

      const todayStudied = todaySessions?.reduce(
        (sum, session) => sum + session.studied_count,
        0
      ) || 0;

      return {
        totalWords: totalWords || 0,
        masteredWords: masteredWords || 0,
        learningWords: learningWords || 0,
        newWords: (totalWords || 0) - (masteredWords || 0) - (learningWords || 0),
        todayStudied,
        streak: 0, // TODO: 連続学習日数の計算を実装
      };
    } catch (err) {
      console.error('Error getting study stats:', err);
      setError(err instanceof Error ? err.message : '統計の取得に失敗しました');
      return null;
    }
  };

  return {
    todayWords,
    loading,
    error,
    fetchTodayWords,
    recordReview,
    saveStudySession,
    getStudyStats,
  };
}
