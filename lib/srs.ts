import { ReviewQuality, SRSResult } from '../types/database';

/**
 * SM-2アルゴリズムに基づいた間隔反復学習の計算
 *
 * 品質評価 (quality):
 * 0: 完全に忘れた - 最初からやり直し
 * 1: 間違えた - 間隔をリセット
 * 2: 間違えたが思い出した - 短い間隔で再学習
 * 3: 正解だが難しかった - 通常の進行
 * 4: 正解 - 標準的な進行
 * 5: 簡単だった - 間隔を延長
 */
export function calculateSRS(
  quality: ReviewQuality,
  currentEaseFactor: number = 2.5,
  currentInterval: number = 0,
  currentRepetitions: number = 0
): SRSResult {
  let easeFactor = currentEaseFactor;
  let interval = currentInterval;
  let repetitions = currentRepetitions;

  // 品質が3未満（間違えた）の場合、最初からやり直し
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    // 正解の場合、間隔を計算
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(currentInterval * easeFactor);
    }
    repetitions += 1;
  }

  // 難易度係数（Ease Factor）の更新
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // 最小値は1.3
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // 次回復習日を計算
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    easeFactor: Math.round(easeFactor * 100) / 100,
    intervalDays: interval,
    repetitions,
    nextReview,
  };
}

/**
 * 簡易版の評価オプション（ユーザー向け）
 * 「忘れた」「曖昧」「覚えていた」の3択に変換
 */
export type SimpleReviewOption = 'forgot' | 'hard' | 'good' | 'easy';

export function simpleToQuality(option: SimpleReviewOption): ReviewQuality {
  switch (option) {
    case 'forgot':
      return 0;
    case 'hard':
      return 3;
    case 'good':
      return 4;
    case 'easy':
      return 5;
  }
}

/**
 * 間隔を人間が読める形式に変換
 */
export function formatInterval(days: number): string {
  if (days === 0) {
    return '今日';
  } else if (days === 1) {
    return '明日';
  } else if (days < 7) {
    return `${days}日後`;
  } else if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${weeks}週間後`;
  } else if (days < 365) {
    const months = Math.round(days / 30);
    return `${months}ヶ月後`;
  } else {
    const years = Math.round(days / 365);
    return `${years}年後`;
  }
}

/**
 * 単語の習熟度を計算（0-100%）
 */
export function calculateMastery(
  repetitions: number,
  easeFactor: number,
  intervalDays: number
): number {
  // 習熟度の計算ロジック
  // - 復習回数、難易度係数、間隔を考慮
  const repetitionScore = Math.min(repetitions / 5, 1) * 40;
  const easeScore = Math.min((easeFactor - 1.3) / 1.7, 1) * 30;
  const intervalScore = Math.min(intervalDays / 30, 1) * 30;

  return Math.round(repetitionScore + easeScore + intervalScore);
}
