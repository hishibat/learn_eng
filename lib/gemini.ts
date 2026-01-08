import { ImageImportResult, ImportWordInput } from '../types/database';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const EXTRACTION_PROMPT = `You are an expert at extracting English vocabulary from handwritten vocabulary notebooks.

## CRITICAL: UNDERSTAND THE NOTEBOOK LAYOUT

This is a vocabulary study notebook with a TWO-COLUMN structure:
- **LEFT COLUMN**: Contains the English words/phrases TO BE LEARNED (these are the vocabulary entries)
- **RIGHT COLUMN**: Contains the Japanese meaning AND example sentences for each word

## ABSOLUTELY CRITICAL RULES

### Rule 1: ONLY the LEFT COLUMN contains vocabulary words to extract
- The LEFT column has the target vocabulary words (usually 1-3 words each)
- ONLY these left-column words should become vocabulary entries
- Count how many distinct vocabulary words are in the left column - this is your target count

### Rule 2: The RIGHT COLUMN is SUPPORTING INFORMATION, NOT vocabulary
- The right column contains: Japanese meanings (日本語の意味) and example sentences (例文)
- NEVER extract words from example sentences as separate vocabulary entries
- Example sentences are complete sentences that USE the vocabulary word
- These sentences should go in the "example" field of the corresponding vocabulary word

### Rule 3: DO NOT split sentences into individual words
- If you see "The weather is beautiful today" next to a vocabulary word, this is an EXAMPLE SENTENCE
- DO NOT create entries for "weather", "beautiful", "today" separately
- Keep the entire sentence as the "example" field

### Rule 4: Match left and right content by visual position
- Look at what's on the same horizontal line or visually grouped together
- The Japanese meaning and example sentence on the right belong to the word on the left

## EXAMPLE OF CORRECT EXTRACTION

If the notebook shows:
\`\`\`
LEFT COLUMN          |  RIGHT COLUMN
---------------------|----------------------------------------
ambitious            |  野心的な。She is an ambitious lawyer.
profound             |  深い、深遠な。a profound impact on society
comprehensive        |  包括的な
\`\`\`

CORRECT output (3 entries):
- "ambitious" with meaning "野心的な" and example "She is an ambitious lawyer."
- "profound" with meaning "深い、深遠な" and example "a profound impact on society"
- "comprehensive" with meaning "包括的な" and no example

WRONG output would be extracting "ambitious", "lawyer", "profound", "impact", "society", "comprehensive" as 6 separate entries.

## EXCLUDE COMPLETELY
- Page numbers, dates, headers
- Individual words from within example sentences
- Japanese text as vocabulary entries

## OUTPUT FORMAT
{
  "words": [
    {
      "word": "vocabulary word from LEFT column",
      "meaning": "Japanese meaning from RIGHT column",
      "pronunciation": "/IPA/ (optional)",
      "example": "Full example sentence from RIGHT column (optional)"
    }
  ],
  "success": true
}

REMEMBER: The number of vocabulary entries should roughly match the number of words in the LEFT column, NOT the total number of English words visible in the image.`;

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
