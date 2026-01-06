export interface Word {
  id: string;
  user_id: string;
  word: string;
  meaning: string;
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
  created_at: string;
  updated_at: string;
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
}

// 単語作成用の入力型
export interface CreateWordInput {
  word: string;
  meaning: string;
  example?: string;
  tag_ids?: string[];
}

// 単語更新用の入力型
export interface UpdateWordInput {
  word?: string;
  meaning?: string;
  example?: string | null;
  tag_ids?: string[];
}

// タグ作成用の入力型
export interface CreateTagInput {
  name: string;
  color?: string;
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
