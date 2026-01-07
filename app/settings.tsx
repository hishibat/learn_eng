import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSettings } from '../hooks/useSettings';
import { validateApiKey } from '../lib/gemini';

export default function SettingsScreen() {
  const { geminiApiKey, loading, setGeminiApiKey, clearGeminiApiKey, hasGeminiApiKey } = useSettings();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (geminiApiKey) {
      setApiKeyInput(geminiApiKey);
    }
  }, [geminiApiKey]);

  const handleSave = async () => {
    if (!apiKeyInput.trim()) {
      Alert.alert('エラー', 'APIキーを入力してください');
      return;
    }

    if (!validateApiKey(apiKeyInput.trim())) {
      Alert.alert('エラー', 'APIキーの形式が正しくありません。Gemini APIキーは「AI」で始まる必要があります。');
      return;
    }

    setSaving(true);
    const success = await setGeminiApiKey(apiKeyInput.trim());
    setSaving(false);

    if (success) {
      Alert.alert('保存完了', 'APIキーを保存しました', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('エラー', 'APIキーの保存に失敗しました');
    }
  };

  const handleClear = () => {
    Alert.alert(
      '確認',
      'APIキーを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            const success = await clearGeminiApiKey();
            if (success) {
              setApiKeyInput('');
              Alert.alert('完了', 'APIキーを削除しました');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '設定',
          headerBackTitle: '戻る',
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gemini API設定</Text>
            <Text style={styles.description}>
              画像から単語を抽出するためにGemini APIキーが必要です。
              Google AI Studioで無料で取得できます。
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>APIキー</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={apiKeyInput}
                  onChangeText={setApiKeyInput}
                  placeholder="AIza..."
                  secureTextEntry={!showApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => setShowApiKey(!showApiKey)}
                >
                  <Text style={styles.toggleButtonText}>
                    {showApiKey ? '隠す' : '表示'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>ステータス:</Text>
              <Text style={[styles.statusValue, hasGeminiApiKey() ? styles.statusActive : styles.statusInactive]}>
                {hasGeminiApiKey() ? '設定済み' : '未設定'}
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>保存</Text>
                )}
              </TouchableOpacity>

              {hasGeminiApiKey() && (
                <TouchableOpacity
                  style={[styles.button, styles.clearButton]}
                  onPress={handleClear}
                >
                  <Text style={styles.clearButtonText}>削除</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>APIキーの取得方法</Text>
            <Text style={styles.helpText}>
              1. Google AI Studio (aistudio.google.com) にアクセス{'\n'}
              2. Googleアカウントでログイン{'\n'}
              3. 「Get API key」をクリック{'\n'}
              4. 「Create API key」で新しいキーを作成{'\n'}
              5. 生成されたキーをコピーしてここに貼り付け
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  toggleButton: {
    marginLeft: 8,
    padding: 12,
  },
  toggleButtonText: {
    color: '#4F46E5',
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusActive: {
    color: '#10B981',
  },
  statusInactive: {
    color: '#EF4444',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  clearButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  helpSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});
