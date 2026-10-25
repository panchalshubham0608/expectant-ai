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

export interface BabyTalkSuggestion {
  title: string;
  prompt: string;
  script: string;
  nativeScript?: string;
  nativeLanguage?: string;
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
  babyTalkEnabled?: boolean;
  babyTalkContext?: string;
  recentBabyTalks?: string[];
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
  babyTalk?: BabyTalkSuggestion;
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
  const shouldGenerateBabyTalk = Boolean(request.babyTalkEnabled);

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
  }${
    shouldGenerateBabyTalk
      ? `\n\nAlso generate ONE daily "Talking to the Womb" (babyTalk) bonding prompt and read-aloud piece appropriate for this stage of pregnancy:${
          request.babyTalkContext?.trim()
            ? `\n- User's Custom Preferences / Theme: ${request.babyTalkContext.trim()}`
            : ''
        }${
          request.recentBabyTalks && request.recentBabyTalks.length > 0
            ? `\n- Previously Suggested Baby Talk Topics (do not repeat): ${request.recentBabyTalks.join(' | ')}`
            : ''
        }`
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
            babyTalk: {
              type: 'OBJECT',
              properties: {
                title: {
                  type: 'STRING',
                  description: 'Short, inviting title in English for today’s womb-bonding moment.',
                },
                prompt: {
                  type: 'STRING',
                  description: '1-2 gentle sentences in English suggesting how the parents can share this moment.',
                },
                script: {
                  type: 'STRING',
                  description: 'The complete read-aloud content in English.',
                },
                nativeScript: {
                  type: 'STRING',
                  description:
                    'The complete read-aloud content translated/written in the native or second language mentioned in the user preferences (e.g., Hindi). Return an empty string only if no non-English language or cultural context is mentioned.',
                },
                nativeLanguage: {
                  type: 'STRING',
                  description:
                    'The display name of the language in nativeScript (e.g., "Hindi"). Return an empty string if nativeScript is empty.',
                },
              },
              required: ['title', 'prompt', 'script', 'nativeScript', 'nativeLanguage'],
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
            ...(shouldGenerateBabyTalk ? ['babyTalk'] : []),
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
