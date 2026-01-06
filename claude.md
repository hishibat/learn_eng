# 英語学習アプリ（Learn English）

## プロジェクト概要

英語の単語やイディオムを効果的に暗記するためのiPhone対応アプリ。
Duolingoを参考にしたUI/UXで、間隔反復学習（SRS）を活用した効率的な学習体験を提供する。

## 要件定義

### ターゲットユーザー
- ビジネス英語を学びたい社会人
- 自分で選んだ単語を効率的に暗記したい人

### 機能要件

#### Phase 1（MVP）
1. **ユーザー認証**
   - Googleアカウントでログイン
   - 複数端末でのデータ同期

2. **単語登録・管理**
   - 英単語（必須）
   - 日本語の意味（必須）
   - 例文（任意）
   - カテゴリ/タグ（任意）
   - 全て手入力（AI自動補完なし）

3. **学習機能**
   - フラッシュカード形式
   - SRS（間隔反復学習）アルゴリズム
   - 「今日の学習」機能

4. **進捗表示**
   - 基本的な学習進捗の可視化

#### Phase 2（MVP後）
- 4択クイズ形式
- スペル入力形式
- 詳細な統計・分析

### 非機能要件
- オフライン対応: 不要（オンライン環境前提）
- 新規単語登録: 1日5〜15個目安（制限なし）

## 技術スタック

| レイヤー | 技術 | バージョン |
|----------|------|------------|
| フロントエンド | Expo (React Native) | 最新安定版 |
| バックエンド/DB | Supabase (PostgreSQL) | - |
| 認証 | Supabase Auth (Google OAuth) | - |
| 言語 | TypeScript | 最新安定版 |

### 選定理由

**Expo (React Native)**
- iPhone対応が容易
- 開発経験がなくても取り組みやすい
- ストア公開が簡単

**Supabase**
- Google認証が組み込みで簡単
- PostgreSQL（SQL対応、堅牢）
- 無料枠: 5万MAU、500MB DB
- Row Level Security（セキュリティ）

## データベース設計

### テーブル構成

```sql
-- ユーザー（Supabase Authで管理）

-- 単語テーブル
words (
  id: uuid PRIMARY KEY,
  user_id: uuid REFERENCES auth.users,
  word: text NOT NULL,          -- 英単語
  meaning: text NOT NULL,       -- 日本語の意味
  example: text,                -- 例文
  created_at: timestamp,
  updated_at: timestamp
)

-- タグテーブル
tags (
  id: uuid PRIMARY KEY,
  user_id: uuid REFERENCES auth.users,
  name: text NOT NULL,          -- タグ名
  created_at: timestamp
)

-- 単語-タグ中間テーブル
word_tags (
  word_id: uuid REFERENCES words,
  tag_id: uuid REFERENCES tags,
  PRIMARY KEY (word_id, tag_id)
)

-- 学習記録テーブル（SRS用）
learning_records (
  id: uuid PRIMARY KEY,
  user_id: uuid REFERENCES auth.users,
  word_id: uuid REFERENCES words,
  ease_factor: float DEFAULT 2.5,    -- 難易度係数
  interval: int DEFAULT 0,            -- 次回までの間隔（日）
  repetitions: int DEFAULT 0,         -- 復習回数
  next_review: timestamp,             -- 次回復習日
  last_reviewed: timestamp,
  created_at: timestamp,
  updated_at: timestamp
)

-- 学習セッション記録
study_sessions (
  id: uuid PRIMARY KEY,
  user_id: uuid REFERENCES auth.users,
  studied_count: int,           -- 学習した単語数
  correct_count: int,           -- 正解数
  duration_seconds: int,        -- 学習時間
  created_at: timestamp
)
```

## ディレクトリ構成（予定）

```
learn_eng/
├── app/                    # Expo Router ページ
│   ├── (auth)/            # 認証関連画面
│   ├── (tabs)/            # メインタブ画面
│   └── _layout.tsx
├── components/            # 再利用可能なコンポーネント
│   ├── ui/               # 基本UIコンポーネント
│   └── features/         # 機能別コンポーネント
├── lib/                   # ユーティリティ・設定
│   ├── supabase.ts       # Supabase クライアント
│   └── srs.ts            # SRSアルゴリズム
├── hooks/                 # カスタムフック
├── types/                 # TypeScript型定義
├── constants/             # 定数
└── assets/               # 画像・フォント
```

## SRSアルゴリズム

SM-2アルゴリズムをベースに実装:

1. 学習時に「覚えていた」「曖昧」「忘れた」を選択
2. 回答に応じてease_factorとintervalを更新
3. next_reviewを計算して保存
4. 「今日の学習」ではnext_review <= 今日の単語を出題

## 開発ルール

- TypeScriptを使用（strict mode）
- コンポーネントは関数コンポーネント + Hooks
- スタイリングはReact Native StyleSheet
- 状態管理は React Context + useReducer（必要に応じて）
