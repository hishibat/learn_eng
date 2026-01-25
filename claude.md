# 英語学習アプリ（Learn English）

## プロジェクト概要

英語の単語やイディオムを効果的に暗記するためのiPhone対応アプリ。
Duolingoを参考にしたUI/UXで、間隔反復学習（SRS）を活用した効率的な学習体験を提供する。

## 現在のステータス

### Phase 1（MVP）: 完了

| 機能 | 状態 |
|------|------|
| Google OAuth認証 | 完了 |
| 単語登録・編集・削除 | 完了 |
| タグ管理 | 完了 |
| フラッシュカード学習 | 完了 |
| 4択クイズ | 完了 |
| SRS（間隔反復学習） | 完了 |
| 画像から単語取り込み（Gemini API） | 完了 |
| 統計画面 | 完了 |

### Phase 2: 計画中

- [ ] スペル入力形式
- [ ] 詳細な統計・分析

## デプロイ環境

**重要: Vercel + GitHub連携は設定済み。pushすると自動デプロイされる。**

### Vercel（本番稼働中・GitHub連携済み）

- **プロジェクト名**: `learn_eng`
- **GitHub連携**: 済（pushで自動デプロイ）
- **ビルドコマンド**: `npx expo export -p web`
- **出力ディレクトリ**: `dist`
- **リライト**: SPA対応（全ルート → `/index.html`）
- **環境変数**: Vercelダッシュボードで設定済み

### Supabase（本番稼働中）

- **Project ID**: `flqthyltwkqusjkmwcee`
- **URL**: `https://flqthyltwkqusjkmwcee.supabase.co`
- **認証**: Google OAuth
- **RLS**: 全テーブルで有効

### 環境変数

```bash
# .env（ローカル開発用）
EXPO_PUBLIC_SUPABASE_URL=https://flqthyltwkqusjkmwcee.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...（設定済み）

# Vercel環境変数 → 設定済み（ダッシュボードで管理）
```

### OAuth設定

| プラットフォーム | リダイレクトURL |
|------------------|-----------------|
| Web | `https://{vercel-domain}/auth/callback` |
| Native | `learneng://auth/callback` |

## 技術スタック

| レイヤー | 技術 | バージョン |
|----------|------|------------|
| フロントエンド | Expo (React Native) | ~54.0.31 |
| バックエンド/DB | Supabase (PostgreSQL) | - |
| 認証 | Supabase Auth (Google OAuth) | - |
| AI画像解析 | Google Gemini API | - |
| 言語 | TypeScript | ~5.9.2 |
| ホスティング | Vercel | - |

## ディレクトリ構成

```
learn_eng/
├── app/                    # Expo Router ページ
│   ├── (tabs)/             # メインタブ画面
│   │   ├── index.tsx       # ホーム
│   │   ├── words.tsx       # 単語一覧
│   │   └── profile.tsx     # プロフィール
│   ├── auth/
│   │   └── callback.tsx    # OAuth コールバック
│   ├── add-word.tsx        # 単語追加
│   ├── edit-word.tsx       # 単語編集
│   ├── study.tsx           # 学習画面
│   ├── statistics.tsx      # 統計画面
│   ├── import-image.tsx    # 画像取り込み
│   ├── import-preview.tsx  # 取り込みプレビュー
│   ├── settings.tsx        # 設定（Gemini APIキー）
│   └── login.tsx           # ログイン
├── hooks/                  # カスタムフック
│   ├── useWords.ts         # 単語CRUD
│   ├── useStudy.ts         # 学習ロジック
│   ├── useTags.ts          # タグ管理
│   ├── useSettings.ts      # 設定管理
│   └── useImageImport.ts   # 画像取り込み
├── lib/                    # ユーティリティ
│   ├── supabase.ts         # Supabase クライアント
│   ├── AuthContext.tsx     # 認証コンテキスト
│   ├── srs.ts              # SM-2アルゴリズム
│   └── gemini.ts           # Gemini API
├── types/                  # TypeScript型定義
│   └── database.ts
├── supabase/               # DBスキーマ
│   └── schema.sql
└── constants/              # 定数
    └── Colors.ts
```

## データベース設計

### テーブル構成（7テーブル + 2ビュー）

```sql
-- 単語テーブル
words (
  id, user_id, word, meaning, pronunciation, example,
  created_at, updated_at
)

-- タグテーブル
tags (
  id, user_id, name, color, created_at
)

-- 単語-タグ中間テーブル
word_tags (word_id, tag_id)

-- 学習記録テーブル（SRS用）
learning_records (
  id, user_id, word_id,
  ease_factor, interval_days, repetitions,
  next_review, last_reviewed,
  total_mistakes, consecutive_correct,  -- Phase 2用
  created_at, updated_at
)

-- 学習セッション記録
study_sessions (
  id, user_id, studied_count, correct_count,
  duration_seconds, created_at
)

-- 間違い記録（Phase 2用）
mistake_records (
  id, user_id, word_id, study_mode, created_at
)

-- ビュー
words_due_for_review   -- 復習対象の単語
words_with_tags        -- 単語とタグを結合
```

### セキュリティ

- 全テーブルでRLS有効
- ユーザーは自分のデータのみアクセス可能
- CUD操作は `auth.uid() = user_id` で保護

## SRSアルゴリズム（SM-2）

1. 学習時に「忘れた」「曖昧」「覚えてた」「簡単」を選択
2. 回答に応じて `ease_factor` と `interval_days` を更新
3. `next_review` を計算して保存
4. 「今日の学習」では `next_review <= 今日` の単語を出題

## 開発コマンド

```bash
# 開発サーバー起動
npx expo start

# キャッシュクリアして起動
npx expo start --clear

# Web ブラウザ
npx expo start --web

# 本番ビルド（Web）
npx expo export -p web

# Lint
npm run lint
```

## 開発ルール

- TypeScriptを使用（strict mode）
- コンポーネントは関数コンポーネント + Hooks
- スタイリングはReact Native StyleSheet
- 状態管理は React Context + useReducer
- カスタムスキーム: `learneng://`
