import { useState } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { extractWordsFromImage } from '../lib/gemini';
import { ImportWordInput, ImageImportResult } from '../types/database';

export type ImageSource = 'camera' | 'gallery';

const isWeb = Platform.OS === 'web';

interface UseImageImportReturn {
  selectedImage: string | null;
  extractedWords: ImportWordInput[];
  loading: boolean;
  error: string | null;
  pickImage: (source: ImageSource) => Promise<boolean>;
  extractWords: (apiKey: string) => Promise<ImageImportResult>;
  updateWord: (index: number, field: keyof ImportWordInput, value: string) => void;
  removeWord: (index: number) => void;
  reset: () => void;
}

export function useImageImport(): UseImageImportReturn {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMimeType, setSelectedMimeType] = useState<string>('image/jpeg');
  const [extractedWords, setExtractedWords] = useState<ImportWordInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermissions = async (source: ImageSource): Promise<boolean> => {
    // Webではパーミッションリクエストは不要
    if (isWeb) {
      return true;
    }

    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setError('カメラへのアクセス許可が必要です');
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setError('写真ライブラリへのアクセス許可が必要です');
        return false;
      }
    }
    return true;
  };

  const pickImage = async (source: ImageSource): Promise<boolean> => {
    setError(null);
    
    const hasPermission = await requestPermissions(source);
    if (!hasPermission) return false;

    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      };

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled || !result.assets?.[0]) {
        return false;
      }

      const asset = result.assets[0];
      setSelectedImage(asset.base64 || null);
      setSelectedMimeType(asset.mimeType || 'image/jpeg');
      setExtractedWords([]);
      return true;
    } catch (err) {
      console.error('Error picking image:', err);
      setError('画像の選択中にエラーが発生しました');
      return false;
    }
  };

  const extractWords = async (apiKey: string): Promise<ImageImportResult> => {
    if (!selectedImage) {
      const result: ImageImportResult = {
        words: [],
        success: false,
        error: '画像が選択されていません',
      };
      setError(result.error || null);
      return result;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await extractWordsFromImage(selectedImage, apiKey, selectedMimeType);
      
      if (result.success) {
        setExtractedWords(result.words);
      } else {
        setError(result.error || '単語の抽出に失敗しました');
      }
      
      return result;
    } catch (err) {
      console.error('Error extracting words:', err);
      const errorMsg = '単語の抽出中にエラーが発生しました';
      setError(errorMsg);
      return {
        words: [],
        success: false,
        error: errorMsg,
      };
    } finally {
      setLoading(false);
    }
  };

  const updateWord = (index: number, field: keyof ImportWordInput, value: string) => {
    setExtractedWords((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeWord = (index: number) => {
    setExtractedWords((prev) => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    setSelectedImage(null);
    setExtractedWords([]);
    setLoading(false);
    setError(null);
  };

  return {
    selectedImage,
    extractedWords,
    loading,
    error,
    pickImage,
    extractWords,
    updateWord,
    removeWord,
    reset,
  };
}
