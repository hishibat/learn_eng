import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

const GEMINI_API_KEY_KEY = 'gemini_api_key';

export function useSettings() {
  const [geminiApiKey, setGeminiApiKeyState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const apiKey = await SecureStore.getItemAsync(GEMINI_API_KEY_KEY);
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
      await SecureStore.setItemAsync(GEMINI_API_KEY_KEY, apiKey);
      setGeminiApiKeyState(apiKey);
      return true;
    } catch (error) {
      console.error('Failed to save API key:', error);
      return false;
    }
  };

  const clearGeminiApiKey = async (): Promise<boolean> => {
    try {
      await SecureStore.deleteItemAsync(GEMINI_API_KEY_KEY);
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
