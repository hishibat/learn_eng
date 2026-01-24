-- =============================================
-- 英語学習アプリ データベーススキーマ
-- =============================================

-- UUID拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- テーブル作成
-- =============================================

-- 単語テーブル
CREATE TABLE IF NOT EXISTS words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  meaning TEXT NOT NULL,
  example TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- タグテーブル
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- 単語-タグ中間テーブル
CREATE TABLE IF NOT EXISTS word_tags (
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (word_id, tag_id)
);

-- 学習記録テーブル（SRS用）
CREATE TABLE IF NOT EXISTS learning_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  ease_factor REAL DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  repetitions INTEGER DEFAULT 0,
  next_review TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_reviewed TIMESTAMP WITH TIME ZONE,
  total_mistakes INTEGER DEFAULT 0,
  consecutive_correct INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, word_id)
);

-- 学習セッション記録
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  studied_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 間違い記録テーブル（Phase 2）
CREATE TABLE IF NOT EXISTS mistake_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  study_mode TEXT NOT NULL CHECK (study_mode IN ('flashcard', 'quiz', 'spelling')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- インデックス作成
-- =============================================

CREATE INDEX IF NOT EXISTS idx_words_user_id ON words(user_id);
CREATE INDEX IF NOT EXISTS idx_words_created_at ON words(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_user_id ON learning_records(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_records_next_review ON learning_records(next_review);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at ON study_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mistake_records_user_id ON mistake_records(user_id);
CREATE INDEX IF NOT EXISTS idx_mistake_records_word_id ON mistake_records(word_id);
CREATE INDEX IF NOT EXISTS idx_mistake_records_created_at ON mistake_records(created_at DESC);

-- =============================================
-- updated_at 自動更新トリガー
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_words_updated_at
  BEFORE UPDATE ON words
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_records_updated_at
  BEFORE UPDATE ON learning_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Row Level Security (RLS) 設定
-- =============================================

-- RLSを有効化
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mistake_records ENABLE ROW LEVEL SECURITY;

-- words テーブルのポリシー
CREATE POLICY "Users can view own words"
  ON words FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own words"
  ON words FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own words"
  ON words FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own words"
  ON words FOR DELETE
  USING (auth.uid() = user_id);

-- tags テーブルのポリシー
CREATE POLICY "Users can view own tags"
  ON tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags"
  ON tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON tags FOR DELETE
  USING (auth.uid() = user_id);

-- word_tags テーブルのポリシー
CREATE POLICY "Users can view own word_tags"
  ON word_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM words WHERE words.id = word_tags.word_id AND words.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own word_tags"
  ON word_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM words WHERE words.id = word_tags.word_id AND words.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own word_tags"
  ON word_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM words WHERE words.id = word_tags.word_id AND words.user_id = auth.uid()
    )
  );

-- learning_records テーブルのポリシー
CREATE POLICY "Users can view own learning_records"
  ON learning_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning_records"
  ON learning_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning_records"
  ON learning_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own learning_records"
  ON learning_records FOR DELETE
  USING (auth.uid() = user_id);

-- study_sessions テーブルのポリシー
CREATE POLICY "Users can view own study_sessions"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own study_sessions"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- mistake_records テーブルのポリシー（Phase 2）
CREATE POLICY "Users can view own mistake_records"
  ON mistake_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mistake_records"
  ON mistake_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mistake_records"
  ON mistake_records FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 便利なビュー
-- =============================================

-- 今日復習が必要な単語を取得するビュー
CREATE OR REPLACE VIEW words_due_for_review AS
SELECT
  w.*,
  lr.ease_factor,
  lr.interval_days,
  lr.repetitions,
  lr.next_review,
  lr.last_reviewed
FROM words w
LEFT JOIN learning_records lr ON w.id = lr.word_id AND w.user_id = lr.user_id
WHERE lr.next_review IS NULL OR lr.next_review <= NOW();

-- 単語とタグを結合したビュー
CREATE OR REPLACE VIEW words_with_tags AS
SELECT
  w.*,
  COALESCE(
    json_agg(
      json_build_object('id', t.id, 'name', t.name, 'color', t.color)
    ) FILTER (WHERE t.id IS NOT NULL),
    '[]'
  ) as tags
FROM words w
LEFT JOIN word_tags wt ON w.id = wt.word_id
LEFT JOIN tags t ON wt.tag_id = t.id
GROUP BY w.id;

-- =============================================
-- Phase 2 マイグレーション
-- =============================================

-- learning_records に間違い追跡用カラムを追加
-- 注意: このALTER文は既存テーブルがある場合のみ実行
-- 新規セットアップの場合は上記のCREATE TABLE文を修正してください
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'learning_records' AND column_name = 'total_mistakes'
  ) THEN
    ALTER TABLE learning_records ADD COLUMN total_mistakes INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'learning_records' AND column_name = 'consecutive_correct'
  ) THEN
    ALTER TABLE learning_records ADD COLUMN consecutive_correct INTEGER DEFAULT 0;
  END IF;
END $$;
