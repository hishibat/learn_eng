# 英語学習アプリ - トラブルシューティング記録

このドキュメントは、本アプリの開発中に直面したトラブルとその解決方法をまとめたものです。
同様の問題に遭遇した際の参考にしてください。

---

## 目次

1. [react-native-url-polyfill の import エラー](#1-react-native-url-polyfill-の-import-エラー)
2. [Gemini API 429エラー（クォータ超過）](#2-gemini-api-429エラークォータ超過)

---

## 1. react-native-url-polyfill の import エラー

### 発生日
2026-01-06

### 症状
アプリ起動時にエラーが発生し、Supabaseクライアントが初期化できない。

```
Unable to resolve "react-native-url-polyfill/dist/setup"
```

### 原因
`react-native-url-polyfill` パッケージの import パスが間違っていた。
古いドキュメントや記事では `/dist/setup` を使う例があるが、現在のバージョンでは `/auto` を使用する。

### 解決方法

**修正前:**
```typescript
// lib/supabase.ts
import 'react-native-url-polyfill/dist/setup';
```

**修正後:**
```typescript
// lib/supabase.ts
import 'react-native-url-polyfill/auto';
```

### 教訓
- npm パッケージの import パスは、公式ドキュメントやパッケージの README を確認する
- 古い記事のコードをそのままコピペしない
- エラーメッセージの「Unable to resolve」はパスが間違っている可能性が高い

---

## 2. Gemini API 429エラー（クォータ超過）

### 発生日
2026-01-07

### 症状
画像取り込み機能で Gemini API を呼び出すと、429エラーが発生する。
**一度も API コールが成功していないのに** クォータ超過と表示される。

```
ERROR  Gemini API error: {
  "error": {
    "code": 429,
    "message": "You exceeded your current quota...",
    "status": "RESOURCE_EXHAUSTED"
  }
}
```

エラーの詳細を見ると：
```
Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests
limit: 0
model: gemini-2.0-flash
```

### 原因
**Google Cloud Console でクォータが無効になっていた。**

`limit: 0` という表示がポイント。これは「クォータの上限が0に設定されている」という意味であり、
「使い切った」のではなく「そもそも割り当てがない」状態。

### 解決方法

1. **Google Cloud Console** (https://console.cloud.google.com/) にアクセス
2. 左メニューから「APIとサービス」→「割り当て」を選択
3. 「Generative Language API」を検索
4. クォータが「無効」になっている場合は「有効」にする
5. 必要に応じてクォータの上限を設定

### 確認すべきポイント

| チェック項目 | 確認場所 |
|-------------|---------|
| 課金が有効か | Cloud Console → 課金 |
| APIが有効か | Cloud Console → APIとサービス → 有効なAPI |
| クォータが有効か | Cloud Console → APIとサービス → 割り当て |
| APIキーが正しいプロジェクトに紐づいているか | Cloud Console → 認証情報 |

### 教訓
- 429エラー ＝ 「使いすぎ」とは限らない
- `limit: 0` は「クォータが設定されていない/無効」を意味する
- 課金設定だけでなく、**クォータの有効化**も必要
- Google Cloud Console の設定は複数箇所に分かれているので、全て確認する

---

## トラブルシューティングの一般的なアプローチ

### 1. エラーメッセージを正確に読む
- エラーコード（404, 429, 500など）
- 具体的なメッセージ
- スタックトレース

### 2. 「当たり前」を疑う
- 設定したはずのものが本当に設定されているか
- 有効化したはずのものが本当に有効か
- 正しいプロジェクト/環境を見ているか

### 3. 段階的に切り分ける
- 問題の発生箇所を特定
- 最小限の再現手順を確認
- 一つずつ変更して確認

---

## 参考リンク

- [Expo ドキュメント](https://docs.expo.dev/)
- [Supabase ドキュメント](https://supabase.com/docs)
- [Google AI Studio](https://aistudio.google.com/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Gemini API レート制限](https://ai.google.dev/gemini-api/docs/rate-limits)
