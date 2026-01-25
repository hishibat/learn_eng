import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Word, WordWithTags, CreateWordInput, UpdateWordInput } from '../types/database';

export function useWords() {
  const { user } = useAuth();
  const [words, setWords] = useState<WordWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWords = useCallback(async () => {
    if (!user) {
      setWords([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('words')
        .select(`
          *,
          word_tags (
            tags (
              id,
              name,
              color
            )
          ),
          learning_records (
            total_mistakes
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // タグデータと間違い回数を整形
      const wordsWithTags: WordWithTags[] = (data || []).map((word: any) => ({
        ...word,
        tags: word.word_tags?.map((wt: any) => wt.tags).filter(Boolean) || [],
        total_mistakes: word.learning_records?.[0]?.total_mistakes ?? 0,
      }));

      setWords(wordsWithTags);
    } catch (err) {
      console.error('Error fetching words:', err);
      setError(err instanceof Error ? err.message : '単語の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  const createWord = async (input: CreateWordInput): Promise<Word | null> => {
    if (!user) return null;

    try {
      setError(null);

      // 単語を作成
      const { data: word, error: insertError } = await supabase
        .from('words')
        .insert({
          user_id: user.id,
          word: input.word,
          meaning: input.meaning,
          pronunciation: input.pronunciation || null,
          example: input.example || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // タグを紐付け
      if (input.tag_ids && input.tag_ids.length > 0) {
        const wordTags = input.tag_ids.map((tag_id) => ({
          word_id: word.id,
          tag_id,
        }));

        const { error: tagError } = await supabase
          .from('word_tags')
          .insert(wordTags);

        if (tagError) throw tagError;
      }

      // 学習記録を初期化
      const { error: recordError } = await supabase
        .from('learning_records')
        .insert({
          user_id: user.id,
          word_id: word.id,
        });

      if (recordError) throw recordError;

      await fetchWords();
      return word;
    } catch (err) {
      console.error('Error creating word:', err);
      setError(err instanceof Error ? err.message : '単語の作成に失敗しました');
      return null;
    }
  };

  const updateWord = async (id: string, input: UpdateWordInput): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);

      const updateData: Partial<Word> = {};
      if (input.word !== undefined) updateData.word = input.word;
      if (input.meaning !== undefined) updateData.meaning = input.meaning;
      if (input.example !== undefined) updateData.example = input.example;
      if (input.pronunciation !== undefined) updateData.pronunciation = input.pronunciation;

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('words')
          .update(updateData)
          .eq('id', id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      }

      // タグを更新
      if (input.tag_ids !== undefined) {
        // 既存のタグを削除
        const { error: deleteError } = await supabase
          .from('word_tags')
          .delete()
          .eq('word_id', id);

        if (deleteError) throw deleteError;

        // 新しいタグを追加
        if (input.tag_ids.length > 0) {
          const wordTags = input.tag_ids.map((tag_id) => ({
            word_id: id,
            tag_id,
          }));

          const { error: tagError } = await supabase
            .from('word_tags')
            .insert(wordTags);

          if (tagError) throw tagError;
        }
      }

      await fetchWords();
      return true;
    } catch (err) {
      console.error('Error updating word:', err);
      setError(err instanceof Error ? err.message : '単語の更新に失敗しました');
      return false;
    }
  };

  const deleteWord = async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('words')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      await fetchWords();
      return true;
    } catch (err) {
      console.error('Error deleting word:', err);
      setError(err instanceof Error ? err.message : '単語の削除に失敗しました');
      return false;
    }
  };

  return {
    words,
    loading,
    error,
    fetchWords,
    createWord,
    updateWord,
    deleteWord,
  };
}
