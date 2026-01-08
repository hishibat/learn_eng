import { ImageImportResult, ImportWordInput } from '../types/database';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const EXTRACTION_PROMPT = `You are an expert at extracting English vocabulary from handwritten or printed study notes and vocabulary lists.

Your task is to INTELLIGENTLY extract English vocabulary entries from the image, understanding the STRUCTURE of the notes.

## UNDERSTANDING NOTE STRUCTURE

Study notes typically have a consistent layout:
- **Left side**: English word or phrase
- **Right side**: Japanese meaning, and often example sentences
- **Example sentences**: Usually longer text that uses the vocabulary word in context

## CRITICAL RULES

1. **Identify vocabulary entries vs example sentences**:
   - A vocabulary word is typically a single word or short phrase (1-4 words)
   - Example sentences are longer (5+ words) and demonstrate usage of the vocabulary
   - Example sentences should be associated with their corresponding vocabulary word, NOT extracted as separate entries

2. **Group related content together**:
   - Each vocabulary word should include its meaning AND any example sentences written nearby
   - Look for visual grouping (same line, indentation, bullets, numbers)

3. **EXCLUDE non-vocabulary content**:
   - Page numbers (1, 2, 3, Page 1, P.1, etc.)
   - Dates (2024/1/1, January, Monday, etc.)
   - Notebook headers/titles (単語帳, Vocabulary, Notes, etc.)
   - Section markers (Chapter, Unit, Lesson, etc.)
   - Random marks, doodles, or irrelevant text

4. **Quality over quantity**:
   - Only extract actual vocabulary entries intended for learning
   - Skip incomplete or unclear entries
   - If unsure whether something is a vocabulary word, skip it

## OUTPUT FORMAT

For each vocabulary entry, provide:
- **word**: The English word/phrase (1-4 words typically)
- **meaning**: Japanese translation/definition
- **pronunciation**: IPA notation (optional, only if confident)
- **example**: Example sentence if one is written for this word (optional)

Respond ONLY with valid JSON:
{
  "words": [
    {
      "word": "ambitious",
      "meaning": "野心的な、大志を抱いた",
      "pronunciation": "/æmˈbɪʃəs/",
      "example": "She is an ambitious young lawyer."
    },
    {
      "word": "profound",
      "meaning": "深い、深遠な",
      "pronunciation": "/prəˈfaʊnd/",
      "example": ""
    }
  ],
  "success": true
}

Or if there's an error:
{
  "words": [],
  "success": false,
  "error": "Error description in Japanese"
}

REMEMBER: Think about what a human would consider a "vocabulary entry" vs "supporting content". Be intelligent about grouping.`;

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
        example: w.example?.trim() || undefined,
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
