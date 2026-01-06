# Supabase セットアップガイド

このガイドでは、英語学習アプリのバックエンドとしてSupabaseをセットアップする手順を説明します。

## 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com/) にアクセス
2. GitHubアカウントでサインイン
3. 「New Project」をクリック
4. プロジェクト情報を入力:
   - **Name**: `learn-english`（任意）
   - **Database Password**: 強力なパスワードを設定（保存しておくこと）
   - **Region**: `Northeast Asia (Tokyo)` を選択
5. 「Create new project」をクリック（作成に数分かかります）

## 2. データベーススキーマの設定

1. プロジェクトダッシュボードで「SQL Editor」を開く
2. `supabase/schema.sql` の内容をコピー
3. SQL Editorに貼り付けて「Run」を実行

## 3. Google認証の設定

### 3.1 Google Cloud Consoleでの設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを使用）
3. 「APIとサービス」→「認証情報」に移動
4. 「認証情報を作成」→「OAuth クライアント ID」を選択
5. アプリケーションの種類: 「ウェブ アプリケーション」
6. 承認済みのリダイレクト URI に以下を追加:
   ```
   https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback
   ```
   （`<YOUR_PROJECT_REF>` はSupabaseプロジェクトのリファレンスID）
7. 作成後、**クライアントID** と **クライアントシークレット** をメモ

### 3.2 Supabaseでの設定

1. Supabaseダッシュボード →「Authentication」→「Providers」
2. 「Google」を有効化
3. Google Cloud Consoleで取得した情報を入力:
   - **Client ID**: GoogleのクライアントID
   - **Client Secret**: Googleのクライアントシークレット
4. 「Save」をクリック

## 4. 環境変数の設定

1. Supabaseダッシュボード →「Settings」→「API」
2. 以下の情報をコピー:
   - **Project URL**: `https://<YOUR_PROJECT_REF>.supabase.co`
   - **anon public key**: `eyJ...`（公開鍵）

3. プロジェクトルートに `.env` ファイルを作成:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<YOUR_PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<YOUR_ANON_KEY>
```

## 5. Row Level Security (RLS) の確認

スキーマ適用後、各テーブルにRLSポリシーが設定されていることを確認:

1. 「Table Editor」で各テーブルを選択
2. 「Policies」タブでポリシーが存在することを確認

## トラブルシューティング

### 認証エラーが発生する場合
- Google Cloud ConsoleのリダイレクトURIが正しいか確認
- Supabaseの認証設定が有効になっているか確認

### データが保存されない場合
- RLSポリシーが正しく設定されているか確認
- ブラウザのコンソールでエラーを確認

## 次のステップ

環境変数を設定したら、アプリを起動できます:

```bash
npx expo start
```
