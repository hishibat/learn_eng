export interface Word {
  id: string;
  user_id: string;
  word: string;
  meaning: string;
  pronunciation: string | null;
  example: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface WordTag {
  word_id: string;
  tag_id: string;
}

export interface LearningRecord {
  id: string;
  user_id: string;
  word_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string;
  last_reviewed: string | null;
  total_mistakes: number;
  consecutive_correct: number;
  created_at: string;
  updated_at: string;
}

// 学習モード（Phase 2）
export type StudyMode = 'flashcard' | 'quiz' | 'spelling';

// 間違い記録（Phase 2）
export interface MistakeRecord {
  id: string;
  user_id: string;
  word_id: string;
  study_mode: StudyMode;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  studied_count: number;
  correct_count: number;
  duration_seconds: number;
  created_at: string;
}

export interface WordWithTags extends Word {
  tags: Tag[];
}

export interface WordWithLearningRecord extends Word {
  ease_factor: number | null;
  interval_days: number | null;
  repetitions: number | null;
  next_review: string | null;
  last_reviewed: string | null;
  total_mistakes: number | null;
  consecutive_correct: number | null;
}

// 間違い回数付き単語（Phase 2）
export interface WordWithMistakes extends Word {
  mistake_count: number;
  last_mistake_at: string | null;
}

// 単語作成用の入力型
export interface CreateWordInput {
  word: string;
  meaning: string;
  pronunciation?: string;
  example?: string;
  tag_ids?: string[];
}

// 単語更新用の入力型
export interface UpdateWordInput {
  word?: string;
  meaning?: string;
  pronunciation?: string | null;
  example?: string | null;
  tag_ids?: string[];
}

// タグ作成用の入力型
export interface CreateTagInput {
  name: string;
  color?: string;
}

// 画像取込用の入力型
export interface ImportWordInput {
  word: string;
  meaning: string;
  pronunciation?: string;
  example?: string;
}

// 画像取込結果の型
export interface ImageImportResult {
  words: ImportWordInput[];
  success: boolean;
  error?: string;
}

// 学習結果の品質評価
export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;
// 0: 完全に忘れた
// 1: 間違えた
// 2: 間違えたが思い出した
// 3: 正解だが難しかった
// 4: 正解
// 5: 簡単だった

// SRS計算結果
export interface SRSResult {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReview: Date;
}

// 学習セッションの統計
export interface StudyStats {
  totalWords: number;
  masteredWords: number;
  learningWords: number;
  newWords: number;
  todayStudied: number;
  streak: number;
}

// =============================================
// Phase 2: 統計関連の型
// =============================================

// 日別学習統計
export interface DailyStats {
  date: string;
  studied_count: number;
  correct_count: number;
  accuracy: number;
}

// 難しい単語（間違いが多い）
export interface WordDifficulty {
  word_id: string;
  word: string;
  meaning: string;
  mistake_count: number;
  accuracy: number;
}

// タグ別習得率
export interface TagMastery {
  tag_id: string;
  tag_name: string;
  tag_color: string;
  total_words: number;
  mastered_words: number;
  mastery_rate: number;
}

// 詳細統計
export interface DetailedStats extends StudyStats {
  dailyStats: DailyStats[];
  difficultWords: WordDifficulty[];
  tagMastery: TagMastery[];
  totalStudyTimeMinutes: number;
  averageAccuracy: number;
}
