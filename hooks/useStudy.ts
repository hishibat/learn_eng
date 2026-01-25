import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { WordWithLearningRecord, LearningRecord, StudyStats, StudyMode, ModeCompletionStatus } from '../types/database';
import { calculateSRS, SimpleReviewOption, simpleToQuality } from '../lib/srs';

// 今日の日付を YYYY-MM-DD 形式で取得
const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export function useStudy() {
  const { user } = useAuth();
  const [todayWords, setTodayWords] = useState<WordWithLearningRecord[]>([]);
  const [allWords, setAllWords] = useState<WordWithLearningRecord[]>([]);
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

      // learning_recordsを別クエリで取得（リレーションのorder制約を回避）
      const { data: records, error: recordsError } = await supabase
        .from('learning_records')
        .select(`
          *,
          words!inner (*)
        `)
        .eq('user_id', user.id)
        .lte('next_review', now)
        .order('next_review', { ascending: true });

      if (recordsError) throw recordsError;

      const data = records?.map((record: any) => ({
        ...record.words,
        learning_records: [record],
      }));
      const fetchError = null;

      if (fetchError) throw fetchError;

      const wordsWithRecords: WordWithLearningRecord[] = (data || []).map((item: any) => ({
        ...item,
        ease_factor: item.learning_records?.[0]?.ease_factor ?? null,
        interval_days: item.learning_records?.[0]?.interval_days ?? null,
        repetitions: item.learning_records?.[0]?.repetitions ?? null,
        next_review: item.learning_records?.[0]?.next_review ?? null,
        last_reviewed: item.learning_records?.[0]?.last_reviewed ?? null,
        total_mistakes: item.learning_records?.[0]?.total_mistakes ?? 0,
        consecutive_correct: item.learning_records?.[0]?.consecutive_correct ?? 0,
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

  // 全単語を取得（4択クイズの選択肢生成用）
  const fetchAllWords = useCallback(async () => {
    if (!user) {
      setAllWords([]);
      return;
    }

    try {
      const { data: words, error: wordsError } = await supabase
        .from('words')
        .select('*')
        .eq('user_id', user.id);

      if (wordsError) throw wordsError;

      setAllWords((words || []).map((word: any) => ({
        ...word,
        ease_factor: null,
        interval_days: null,
        repetitions: null,
        next_review: null,
        last_reviewed: null,
        total_mistakes: 0,
        consecutive_correct: 0,
      })));
    } catch (err) {
      console.error('Error fetching all words:', err);
    }
  }, [user]);

  // 学習結果を記録
  const recordReview = async (
    wordId: string,
    reviewOption: SimpleReviewOption,
    studyMode: StudyMode = 'flashcard'
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

      // 間違い追跡用の更新値を計算
      const isCorrect = reviewOption !== 'forgot';
      const newTotalMistakes = isCorrect
        ? (currentRecord.total_mistakes || 0)
        : (currentRecord.total_mistakes || 0) + 1;
      const newConsecutiveCorrect = isCorrect
        ? (currentRecord.consecutive_correct || 0) + 1
        : 0;

      // 学習記録を更新
      const { error: updateError } = await supabase
        .from('learning_records')
        .update({
          ease_factor: result.easeFactor,
          interval_days: result.intervalDays,
          repetitions: result.repetitions,
          next_review: result.nextReview.toISOString(),
          last_reviewed: new Date().toISOString(),
          total_mistakes: newTotalMistakes,
          consecutive_correct: newConsecutiveCorrect,
        })
        .eq('id', currentRecord.id);

      if (updateError) throw updateError;

      // 間違えた場合はmistake_recordsにも記録
      if (!isCorrect) {
        await recordMistake(wordId, studyMode);
      }

      return true;
    } catch (err) {
      console.error('Error recording review:', err);
      setError(err instanceof Error ? err.message : '学習記録の保存に失敗しました');
      return false;
    }
  };

  // 間違いを記録
  const recordMistake = async (
    wordId: string,
    studyMode: StudyMode
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: insertError } = await supabase
        .from('mistake_records')
        .insert({
          user_id: user.id,
          word_id: wordId,
          study_mode: studyMode,
        });

      if (insertError) throw insertError;
      return true;
    } catch (err) {
      console.error('Error recording mistake:', err);
      return false;
    }
  };

  // 間違いの多い単語を優先的に取得
  const fetchPriorityWords = useCallback(async (limit: number = 10): Promise<WordWithLearningRecord[]> => {
    if (!user) return [];

    try {
      // learning_recordsからtotal_mistakesでソートして取得
      const { data: records, error: recordsError } = await supabase
        .from('learning_records')
        .select(`
          *,
          words!inner (*)
        `)
        .eq('user_id', user.id)
        .gt('total_mistakes', 0)
        .order('total_mistakes', { ascending: false })
        .limit(limit);

      if (recordsError) throw recordsError;

      return (records || []).map((record: any) => ({
        ...record.words,
        ease_factor: record.ease_factor,
        interval_days: record.interval_days,
        repetitions: record.repetitions,
        next_review: record.next_review,
        last_reviewed: record.last_reviewed,
        total_mistakes: record.total_mistakes || 0,
        consecutive_correct: record.consecutive_correct || 0,
      }));
    } catch (err) {
      console.error('Error fetching priority words:', err);
      return [];
    }
  }, [user]);

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

  // 今日のモード完了状況を取得
  const checkModeCompletions = useCallback(async (): Promise<ModeCompletionStatus> => {
    if (!user) {
      return { flashcard: false, quiz: false, spelling: false };
    }

    try {
      const todayDate = getTodayDateString();
      const { data, error: fetchError } = await supabase
        .from('daily_mode_completions')
        .select('study_mode')
        .eq('user_id', user.id)
        .eq('study_date', todayDate);

      if (fetchError) throw fetchError;

      const completedModes = new Set((data || []).map((d: any) => d.study_mode));
      return {
        flashcard: completedModes.has('flashcard'),
        quiz: completedModes.has('quiz'),
        spelling: completedModes.has('spelling'),
      };
    } catch (err) {
      console.error('Error checking mode completions:', err);
      return { flashcard: false, quiz: false, spelling: false };
    }
  }, [user]);

  // モード完了を記録
  const markModeCompleted = async (mode: StudyMode, wordCount: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const todayDate = getTodayDateString();
      const { error: upsertError } = await supabase
        .from('daily_mode_completions')
        .upsert({
          user_id: user.id,
          study_date: todayDate,
          study_mode: mode,
          word_count: wordCount,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,study_date,study_mode',
        });

      if (upsertError) throw upsertError;
      return true;
    } catch (err) {
      console.error('Error marking mode completed:', err);
      return false;
    }
  };

  // 練習モード用: 今日学習した単語を取得（SRS関係なく全単語から）
  const fetchPracticeWords = useCallback(async (): Promise<WordWithLearningRecord[]> => {
    if (!user) return [];

    try {
      // 全単語を取得してシャッフル
      const { data: records, error: recordsError } = await supabase
        .from('learning_records')
        .select(`
          *,
          words!inner (*)
        `)
        .eq('user_id', user.id)
        .order('last_reviewed', { ascending: true, nullsFirst: true });

      if (recordsError) throw recordsError;

      return (records || []).map((record: any) => ({
        ...record.words,
        ease_factor: record.ease_factor,
        interval_days: record.interval_days,
        repetitions: record.repetitions,
        next_review: record.next_review,
        last_reviewed: record.last_reviewed,
        total_mistakes: record.total_mistakes || 0,
        consecutive_correct: record.consecutive_correct || 0,
      }));
    } catch (err) {
      console.error('Error fetching practice words:', err);
      return [];
    }
  }, [user]);

  // 7日前・30日前の間違い単語を取得
  const fetchMistakeReviewWords = useCallback(async (): Promise<{
    sevenDayReview: WordWithLearningRecord[];
    thirtyDayReview: WordWithLearningRecord[];
  }> => {
    if (!user) {
      return { sevenDayReview: [], thirtyDayReview: [] };
    }

    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStart = new Date(sevenDaysAgo);
      sevenDaysAgoStart.setHours(0, 0, 0, 0);
      const sevenDaysAgoEnd = new Date(sevenDaysAgo);
      sevenDaysAgoEnd.setHours(23, 59, 59, 999);

      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStart = new Date(thirtyDaysAgo);
      thirtyDaysAgoStart.setHours(0, 0, 0, 0);
      const thirtyDaysAgoEnd = new Date(thirtyDaysAgo);
      thirtyDaysAgoEnd.setHours(23, 59, 59, 999);

      // 7日前の間違い
      const { data: sevenDayData, error: sevenDayError } = await supabase
        .from('mistake_records')
        .select(`
          word_id,
          words!inner (*)
        `)
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgoStart.toISOString())
        .lte('created_at', sevenDaysAgoEnd.toISOString());

      if (sevenDayError) throw sevenDayError;

      // 30日前の間違い
      const { data: thirtyDayData, error: thirtyDayError } = await supabase
        .from('mistake_records')
        .select(`
          word_id,
          words!inner (*)
        `)
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgoStart.toISOString())
        .lte('created_at', thirtyDaysAgoEnd.toISOString());

      if (thirtyDayError) throw thirtyDayError;

      // 重複を除去してWordWithLearningRecordに変換
      const uniqueSevenDay = Array.from(
        new Map((sevenDayData || []).map((d: any) => [d.word_id, d.words])).values()
      ).map((word: any) => ({
        ...word,
        ease_factor: null,
        interval_days: null,
        repetitions: null,
        next_review: null,
        last_reviewed: null,
        total_mistakes: 0,
        consecutive_correct: 0,
      }));

      const uniqueThirtyDay = Array.from(
        new Map((thirtyDayData || []).map((d: any) => [d.word_id, d.words])).values()
      ).map((word: any) => ({
        ...word,
        ease_factor: null,
        interval_days: null,
        repetitions: null,
        next_review: null,
        last_reviewed: null,
        total_mistakes: 0,
        consecutive_correct: 0,
      }));

      return {
        sevenDayReview: uniqueSevenDay,
        thirtyDayReview: uniqueThirtyDay,
      };
    } catch (err) {
      console.error('Error fetching mistake review words:', err);
      return { sevenDayReview: [], thirtyDayReview: [] };
    }
  }, [user]);

  // 練習用: SRSを更新せずに記録のみ
  const recordPracticeReview = async (
    wordId: string,
    isCorrect: boolean,
    studyMode: StudyMode = 'flashcard'
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      // 間違えた場合はmistake_recordsに記録
      if (!isCorrect) {
        await recordMistake(wordId, studyMode);
      }
      return true;
    } catch (err) {
      console.error('Error recording practice review:', err);
      return false;
    }
  };

  return {
    todayWords,
    allWords,
    loading,
    error,
    fetchTodayWords,
    fetchAllWords,
    recordReview,
    recordMistake,
    fetchPriorityWords,
    saveStudySession,
    getStudyStats,
    checkModeCompletions,
    markModeCompleted,
    fetchPracticeWords,
    fetchMistakeReviewWords,
    recordPracticeReview,
  };
}
