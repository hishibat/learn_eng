# Learn English - 英語学習アプリ

自分で選んだ単語を効率的に暗記するための iPhone 対応アプリ。
間隔反復学習（SRS: SM-2アルゴリズム）を活用し、科学的に記憶の定着を促進します。

## 主な機能

### 単語管理
- **手動登録**: 英単語・日本語の意味・発音・例文を登録
- **画像から取り込み**: 写真をAIが解析し、英単語を自動抽出（Gemini API）
- **タグ管理**: カテゴリ別に単語を整理

### 学習モード
| モード | 説明 |
|--------|------|
| フラッシュカード | タップで意味を表示。「忘れた」「曖昧」「覚えてた」「簡単」で自己評価 |
| 4択クイズ | 4つの選択肢から正解を選ぶ。即座にフィードバック |

### 間隔反復学習（SRS）
SM-2アルゴリズムに基づき、各単語の最適な復習タイミングを自動計算：
- 覚えている単語 → 復習間隔が延長（1日 → 6日 → 2週間...）
- 忘れた単語 → 翌日に再復習

### 進捗管理
- 総単語数・習得済み・今日の学習数を表示
- 学習セッションごとの正答率・学習時間を記録

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | Expo (React Native) + TypeScript |
| バックエンド | Supabase (PostgreSQL) |
| 認証 | Supabase Auth (Google OAuth) |
| AI画像解析 | Google Gemini API |

## セットアップ

### 前提条件
- Node.js 18以上
- npm または yarn
- Expo Go アプリ（iOS/Android）
- Supabase アカウント
- Google Cloud Console アカウント（認証用）

### 1. リポジトリのクローン

```bash
git clone https://github.com/hishibat/learn_eng.git
cd learn_eng
npm install
```

### 2. Supabase のセットアップ

詳細は [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) を参照。

1. [Supabase](https://supabase.com/) でプロジェクトを作成
2. SQL Editor で `supabase/schema.sql` を実行
3. Google OAuth を設定（Authentication > Providers > Google）

### 3. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集：
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. 開発サーバーの起動

```bash
npx expo start
```

Expo Go アプリでQRコードをスキャンして起動。

## 画像取り込み機能（オプション）

写真から英単語を自動抽出するには、Gemini API キーが必要です。

1. [Google AI Studio](https://aistudio.google.com/) でAPIキーを取得
2. アプリ内の「設定」画面でAPIキーを入力

## プロジェクト構成

```
learn_eng/
├── app/                    # 画面（Expo Router）
│   ├── (tabs)/             # タブ画面
│   │   ├── index.tsx       # ホーム
│   │   ├── words.tsx       # 単語一覧
│   │   └── profile.tsx     # プロフィール
│   ├── add-word.tsx        # 単語追加
│   ├── edit-word.tsx       # 単語編集
│   ├── import-image.tsx    # 画像取り込み
│   ├── study.tsx           # 学習画面
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
└── docs/                   # ドキュメント
```

## データベース構成

```
words              # 単語
├── id
├── user_id
├── word           # 英単語
├── meaning        # 日本語の意味
├── pronunciation  # 発音（IPA）
└── example        # 例文

learning_records   # 学習記録（SRS）
├── word_id
├── ease_factor    # 難易度係数
├── interval_days  # 復習間隔
├── repetitions    # 復習回数
└── next_review    # 次回復習日

tags               # タグ
word_tags          # 単語-タグ中間テーブル
study_sessions     # 学習セッション記録
```

すべてのテーブルに Row Level Security (RLS) が設定されており、ユーザーは自分のデータのみアクセス可能。

## 開発コマンド

```bash
# 開発サーバー起動
npx expo start

# キャッシュクリアして起動
npx expo start --clear

# iOS シミュレータ
npx expo start --ios

# Android エミュレータ
npx expo start --android

# Web ブラウザ
npx expo start --web

# Lint
npm run lint
```

## ロードマップ

### Phase 1（MVP）- 完了
- [x] Google認証
- [x] 単語登録・編集・削除
- [x] フラッシュカード学習
- [x] SRS（間隔反復学習）
- [x] 画像から単語取り込み
- [x] 4択クイズ

### Phase 2 - 計画中
- [ ] スペル入力形式
- [ ] 詳細な統計・分析

## ライセンス

MIT
