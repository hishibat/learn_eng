import { ImageImportResult, ImportWordInput } from '../types/database';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const EXTRACTION_PROMPT = `You are an expert at extracting English vocabulary from images.

Analyze the provided image and extract all English words/phrases with their Japanese meanings and pronunciations (IPA notation).

IMPORTANT RULES:
1. Extract ALL English words visible in the image
2. For each word, provide:
   - word: The English word/phrase exactly as written
   - meaning: Japanese translation/definition
   - pronunciation: IPA phonetic notation (optional, leave empty if unsure)
3. If no English words are found, return an empty array
4. If you cannot read the image clearly, return an error

Respond ONLY with valid JSON in this exact format:
{
  "words": [
    {
      "word": "example",
      "meaning": "例、例題",
      "pronunciation": "/ɪɡˈzæmpəl/"
    }
  ],
  "success": true
}

Or if there's an error:
{
  "words": [],
  "success": false,
  "error": "Error description in Japanese"
}`;

export async function extractWordsFromImage(
  base64Image: string,
  apiKey: string,
  mimeType: string = 'image/jpeg'
): Promise<ImageImportResult> {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: EXTRACTION_PROMPT },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      return {
        words: [],
        success: false,
        error: `APIエラー: ${response.status} - ${errorData.error?.message || '不明なエラー'}`,
      };
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return {
        words: [],
        success: false,
        error: 'APIからの応答が空でした',
      };
    }

    // JSONを抽出（マークダウンコードブロック対応）
    let jsonStr = textContent;
    const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    } else {
      // コードブロックなしの場合、最初の{から最後の}までを抽出
      const startIdx = textContent.indexOf('{');
      const endIdx = textContent.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        jsonStr = textContent.substring(startIdx, endIdx + 1);
      }
    }

    const result: ImageImportResult = JSON.parse(jsonStr);
    
    // 結果の検証
    if (!Array.isArray(result.words)) {
      return {
        words: [],
        success: false,
        error: '不正な応答形式です',
      };
    }

    // 各単語の検証とクリーンアップ
    const validWords: ImportWordInput[] = result.words
      .filter((w) => w.word && w.meaning)
      .map((w) => ({
        word: w.word.trim(),
        meaning: w.meaning.trim(),
        pronunciation: w.pronunciation?.trim() || undefined,
      }));

    return {
      words: validWords,
      success: validWords.length > 0,
      error: validWords.length === 0 ? '画像から単語を抽出できませんでした' : undefined,
    };
  } catch (error) {
    console.error('Error extracting words:', error);
    return {
      words: [],
      success: false,
      error: error instanceof Error ? error.message : '画像の解析中にエラーが発生しました',
    };
  }
}

export function validateApiKey(apiKey: string): boolean {
  // Gemini APIキーは通常39文字
  return apiKey.length >= 30 && apiKey.startsWith('AI');
}
