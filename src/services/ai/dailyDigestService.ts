import { DAILY_DIGEST_PROMPT } from '../../prompts/daily_digest';
import { getGeminiClient, DEFAULT_GEMINI_MODEL } from './geminiCore';

export type DailyDigestCategory =
  | 'baby-fact'
  | 'body-fact'
  | 'pregnancy-tip'
  | 'did-you-know'
  | 'milestone'
  | 'couple';

export type BabyNameGender = 'Boy' | 'Girl' | 'Unisex';

export interface BabyNameSuggestion {
  name: string;
  meaning: string;
  gender: BabyNameGender;
}

export interface SpiritualSloka {
  source: string;
  originalScript: string;
  transliteration: string;
  translation: string;
  reflection: string;
}

export interface DailyDigestRequest {
  pregnancyWeek: number;
  pregnancyDay: number;
  category: DailyDigestCategory;
  date: string;
  recentMoments?: string[];
  babyNameContext?: string;
  babyNameCount?: number;
  recentBabyNames?: string[];
  spiritualSlokaContext?: string;
  recentSlokas?: string[];
}

export interface DailyDigestResponse {
  category: DailyDigestCategory;
  header: string;
  notification: string;
  card: {
    title: string;
    content: string;
  };
  emoji: string;
  babyNames?: BabyNameSuggestion[];
  spiritualSloka?: SpiritualSloka;
}

export const generateDailyDigest = async (
  request: DailyDigestRequest,
  userApiKey?: string
): Promise<DailyDigestResponse> => {
  const ai = getGeminiClient(userApiKey);
  const env = typeof process !== 'undefined' && process.env ? process.env : (import.meta as any).env;
  const model = env?.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  const shouldGenerateBabyNames = Boolean(
    request.babyNameContext?.trim() && request.babyNameCount && request.babyNameCount > 0
  );
  const shouldGenerateSpiritualSloka = Boolean(request.spiritualSlokaContext?.trim());

  const userPrompt = `Please generate a daily pregnancy digest for the following specifics:
- Pregnancy Week: ${request.pregnancyWeek}
- Pregnancy Day: ${request.pregnancyDay}
- Category: ${request.category}
- Date: ${request.date}
${request.recentMoments && request.recentMoments.length > 0 ? `\nDo not repeat topics or facts from the following recent moments:\n${request.recentMoments.map((m, i) => `${i + 1}. ${m}`).join('\n')}` : ''}${
    shouldGenerateBabyNames
      ? `\n\nAlso generate ${request.babyNameCount} baby name suggestion(s) based on the user's customized preferences:
- Baby Name Context & Preferences: ${request.babyNameContext!.trim()}
- Number of Baby Names to Generate (N): ${request.babyNameCount}
${request.recentBabyNames && request.recentBabyNames.length > 0 ? `- Previously Suggested Baby Names (do not repeat): ${request.recentBabyNames.join(', ')}` : ''}`
      : ''
  }${
    shouldGenerateSpiritualSloka
      ? `\n\nAlso generate ONE daily spiritual sloka/verse based on the user's spiritual theme and preferences:
- Spiritual Theme & Preferences: ${request.spiritualSlokaContext!.trim()}
${request.recentSlokas && request.recentSlokas.length > 0 ? `- Previously Suggested Slokas (do not repeat): ${request.recentSlokas.join(' | ')}` : ''}`
      : ''
  }
`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: userPrompt,
      config: {
        systemInstruction: DAILY_DIGEST_PROMPT.trim(),
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            category: {
              type: 'STRING',
              enum: ['baby-fact', 'body-fact', 'pregnancy-tip', 'did-you-know', 'milestone', 'couple'],
            },
            header: { type: 'STRING' },
            notification: { type: 'STRING' },
            card: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                content: { type: 'STRING' },
              },
              required: ['title', 'content'],
            },
            emoji: { type: 'STRING' },
            babyNames: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' },
                  meaning: { type: 'STRING' },
                  gender: {
                    type: 'STRING',
                    enum: ['Boy', 'Girl', 'Unisex'],
                  },
                },
                required: ['name', 'meaning', 'gender'],
              },
            },
            spiritualSloka: {
              type: 'OBJECT',
              properties: {
                source: { type: 'STRING' },
                originalScript: { type: 'STRING' },
                transliteration: { type: 'STRING' },
                translation: { type: 'STRING' },
                reflection: { type: 'STRING' },
              },
              required: ['source', 'originalScript', 'transliteration', 'translation', 'reflection'],
            },
          },
          required: [
            'category',
            'header',
            'notification',
            'card',
            'emoji',
            ...(shouldGenerateBabyNames ? ['babyNames'] : []),
            ...(shouldGenerateSpiritualSloka ? ['spiritualSloka'] : []),
          ],
        },
      },
    });

    if (!response.text) {
      throw new Error('Gemini returned an empty response for the daily digest.');
    }

    return JSON.parse(response.text) as DailyDigestResponse;
  } catch (error: any) {
    throw new Error(`Failed to generate daily digest: ${error.message || 'Unknown error'}`);
  }
};
