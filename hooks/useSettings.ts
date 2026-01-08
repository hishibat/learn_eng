import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GEMINI_API_KEY_KEY = 'gemini_api_key';

const isWeb = Platform.OS === 'web';

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export function useSettings() {
  const [geminiApiKey, setGeminiApiKeyState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const apiKey = await getItem(GEMINI_API_KEY_KEY);
      setGeminiApiKeyState(apiKey);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const setGeminiApiKey = async (apiKey: string): Promise<boolean> => {
    try {
      await setItem(GEMINI_API_KEY_KEY, apiKey);
      setGeminiApiKeyState(apiKey);
      return true;
    } catch (error) {
      console.error('Failed to save API key:', error);
      return false;
    }
  };

  const clearGeminiApiKey = async (): Promise<boolean> => {
    try {
      await deleteItem(GEMINI_API_KEY_KEY);
      setGeminiApiKeyState(null);
      return true;
    } catch (error) {
      console.error('Failed to clear API key:', error);
      return false;
    }
  };

  const hasGeminiApiKey = (): boolean => {
    return geminiApiKey !== null && geminiApiKey.length > 0;
  };

  return {
    geminiApiKey,
    loading,
    setGeminiApiKey,
    clearGeminiApiKey,
    hasGeminiApiKey,
    reloadSettings: loadSettings,
  };
}
