import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useAuth } from '@/lib/AuthContext';
import { useWords } from '@/hooks/useWords';
import { useTags } from '@/hooks/useTags';

export default function EditWordScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { words, updateWord, deleteWord } = useWords();
  const { tags, createTag } = useTags();

  const [word, setWord] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (id && words.length > 0) {
      const existingWord = words.find((w) => w.id === id);
      if (existingWord) {
        setWord(existingWord.word);
        setMeaning(existingWord.meaning);
        setExample(existingWord.example || '');
        setSelectedTags(existingWord.tags?.map((t) => t.id) || []);
      }
      setInitialLoading(false);
    }
  }, [id, words]);

  const handleSubmit = async () => {
    if (!word.trim() || !meaning.trim()) {
      Alert.alert('エラー', '単語と意味は必須です');
      return;
    }

    if (!id) return;

    setLoading(true);
    const result = await updateWord(id, {
      word: word.trim(),
      meaning: meaning.trim(),
      example: example.trim() || null,
      tag_ids: selectedTags,
    });
    setLoading(false);

    if (result) {
      Alert.alert('成功', '単語を更新しました', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('エラー', '単語の更新に失敗しました');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      '単語を削除',
      'この単語を削除しますか？この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            const result = await deleteWord(id);
            if (result) {
              router.back();
            } else {
              Alert.alert('エラー', '単語の削除に失敗しました');
            }
          },
        },
      ]
    );
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;

    const existingTag = tags.find(
      (t) => t.name.toLowerCase() === newTagName.trim().toLowerCase()
    );

    if (existingTag) {
      if (!selectedTags.includes(existingTag.id)) {
        setSelectedTags([...selectedTags, existingTag.id]);
      }
    } else {
      const newTag = await createTag({ name: newTagName.trim() });
      if (newTag) {
        setSelectedTags([...selectedTags, newTag.id]);
      }
    }

    setNewTagName('');
    setShowTagInput(false);
  };

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter((tid) => tid !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.messageText}>ログインしてください</Text>
      </View>
    );
  }

  if (initialLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          {/* 英単語 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>英単語 *</Text>
            <TextInput
              style={styles.input}
              value={word}
              onChangeText={setWord}
              placeholder="例: accomplish"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* 意味 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>意味 *</Text>
            <TextInput
              style={styles.input}
              value={meaning}
              onChangeText={setMeaning}
              placeholder="例: 達成する、成し遂げる"
              placeholderTextColor="#9ca3af"
            />
          </View>

          {/* 例文 */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>例文（任意）</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={example}
              onChangeText={setExample}
              placeholder="例: We accomplished our goal ahead of schedule."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* タグ */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>タグ（任意）</Text>
            <View style={styles.tagsContainer}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag.id}
                  style={[
                    styles.tagChip,
                    selectedTags.includes(tag.id) && styles.tagChipSelected,
                    { borderColor: tag.color },
                  ]}
                  onPress={() => toggleTag(tag.id)}
                >
                  <Text
                    style={[
                      styles.tagChipText,
                      selectedTags.includes(tag.id)
                        ? { color: '#fff' }
                        : { color: tag.color },
                    ]}
                  >
                    {tag.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.addTagButton}
                onPress={() => setShowTagInput(true)}
              >
                <FontAwesome name="plus" size={14} color="#6366f1" />
                <Text style={styles.addTagText}>新規タグ</Text>
              </TouchableOpacity>
            </View>

            {showTagInput && (
              <View style={styles.newTagContainer}>
                <TextInput
                  style={styles.newTagInput}
                  value={newTagName}
                  onChangeText={setNewTagName}
                  placeholder="タグ名"
                  placeholderTextColor="#9ca3af"
                  autoFocus
                />
                <TouchableOpacity
                  style={styles.newTagSubmit}
                  onPress={handleAddTag}
                >
                  <FontAwesome name="check" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.newTagCancel}
                  onPress={() => {
                    setNewTagName('');
                    setShowTagInput(false);
                  }}
                >
                  <FontAwesome name="times" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 削除ボタン */}
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <FontAwesome name="trash-o" size={18} color="#ef4444" />
            <Text style={styles.deleteButtonText}>この単語を削除</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 保存ボタン */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <FontAwesome name="check" size={18} color="#fff" />
              <Text style={styles.submitButtonText}>変更を保存</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 16,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  tagChipSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  tagChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
    gap: 6,
  },
  addTagText: {
    fontSize: 14,
    color: '#6366f1',
  },
  newTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  newTagInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
  },
  newTagSubmit: {
    backgroundColor: '#6366f1',
    padding: 12,
    borderRadius: 8,
  },
  newTagCancel: {
    padding: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    gap: 8,
    marginTop: 12,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
