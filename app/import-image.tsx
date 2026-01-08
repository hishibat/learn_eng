import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useImageImport, ImageSource } from '../hooks/useImageImport';
import { useSettings } from '../hooks/useSettings';

const isWeb = Platform.OS === 'web';

export default function ImportImageScreen() {
  const {
    selectedImage,
    loading,
    error,
    pickImage,
    extractWords,
    reset,
  } = useImageImport();
  const { geminiApiKey, hasGeminiApiKey } = useSettings();
  const [extracting, setExtracting] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);

  const handlePickImage = async (source: ImageSource) => {
    setShowSourceModal(false);
    await pickImage(source);
  };

  const handleExtract = async () => {
    if (!hasGeminiApiKey() || !geminiApiKey) {
      if (isWeb) {
        if (window.confirm('Gemini APIキーが未設定です。設定画面に移動しますか？')) {
          router.push('/settings');
        }
      } else {
        Alert.alert(
          'APIキー未設定',
          'Gemini APIキーを設定してください',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: '設定へ', onPress: () => router.push('/settings') },
          ]
        );
      }
      return;
    }

    setExtracting(true);
    const result = await extractWords(geminiApiKey);
    setExtracting(false);

    if (result.success && result.words.length > 0) {
      router.push({
        pathname: '/import-preview',
        params: { words: JSON.stringify(result.words) },
      });
    } else {
      const errorMsg = result.error || '画像から単語を抽出できませんでした。別の画像を試してください。';
      if (isWeb) {
        window.alert(errorMsg);
      } else {
        Alert.alert('抽出失敗', errorMsg, [{ text: 'OK' }]);
      }
    }
  };

  const showImageSourceDialog = () => {
    if (isWeb) {
      // Webではカメラは使いにくいので直接ギャラリーから選択
      handlePickImage('gallery');
    } else {
      setShowSourceModal(true);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '画像から取り込み',
          headerBackTitle: '戻る',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/settings')}>
              <Text style={styles.headerButton}>設定</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {!hasGeminiApiKey() && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              Gemini APIキーが設定されていません
            </Text>
            <TouchableOpacity onPress={() => router.push('/settings')}>
              <Text style={styles.warningLink}>設定する</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.imageContainer}>
          {selectedImage ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${selectedImage}` }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderIcon}>📷</Text>
              <Text style={styles.placeholderText}>
                画像を選択してください
              </Text>
            </View>
          )}
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.selectButton]}
            onPress={showImageSourceDialog}
            disabled={loading || extracting}
          >
            <Text style={styles.selectButtonText}>
              {selectedImage ? '別の画像を選択' : '画像を選択'}
            </Text>
          </TouchableOpacity>

          {selectedImage && (
            <>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.extractButton,
                  (!hasGeminiApiKey() || extracting) && styles.buttonDisabled,
                ]}
                onPress={handleExtract}
                disabled={!hasGeminiApiKey() || extracting}
              >
                {extracting ? (
                  <View style={styles.loadingContent}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.extractButtonText}>解析中...</Text>
                  </View>
                ) : (
                  <Text style={styles.extractButtonText}>単語を抽出</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.resetButton]}
                onPress={reset}
                disabled={extracting}
              >
                <Text style={styles.resetButtonText}>リセット</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.helpContainer}>
          <Text style={styles.helpTitle}>使い方</Text>
          <Text style={styles.helpText}>
            1. 「画像を選択」で単語帳やノートの写真を選ぶ{"\n"}
            2. 「単語を抽出」でAIが英単語を認識{"\n"}
            3. 抽出結果を確認・編集して登録
          </Text>
        </View>
      </ScrollView>

      {/* ネイティブ用の画像ソース選択モーダル */}
      {!isWeb && (
        <Modal
          visible={showSourceModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSourceModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSourceModal(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>画像を選択</Text>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handlePickImage('camera')}
              >
                <Text style={styles.modalOptionText}>カメラで撮影</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handlePickImage('gallery')}
              >
                <Text style={styles.modalOptionText}>ギャラリーから選択</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalOption, styles.modalCancel]}
                onPress={() => setShowSourceModal(false)}
              >
                <Text style={styles.modalCancelText}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  headerButton: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '500',
  },
  warningBanner: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  warningText: {
    color: '#92400E',
    fontSize: 14,
  },
  warningLink: {
    color: '#D97706',
    fontWeight: '600',
  },
  imageContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    minHeight: 300,
  },
  previewImage: {
    width: '100%',
    height: 300,
  },
  placeholder: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  selectButtonText: {
    color: '#4F46E5',
    fontSize: 16,
    fontWeight: '600',
  },
  extractButton: {
    backgroundColor: '#4F46E5',
  },
  extractButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  resetButtonText: {
    color: '#6B7280',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  helpContainer: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    color: '#333',
  },
  modalOption: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  modalOptionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#4F46E5',
    fontWeight: '500',
  },
  modalCancel: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});
