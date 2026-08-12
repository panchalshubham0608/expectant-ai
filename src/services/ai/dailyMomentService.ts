import { DAILY_MOMENT_PROMPT } from '../../prompts/daily_moment';
import { getGeminiClient, DEFAULT_GEMINI_MODEL } from './geminiCore';

export type DailyMomentCategory =
  | 'baby-fact'
  | 'body-fact'
  | 'pregnancy-tip'
  | 'did-you-know'
  | 'milestone'
  | 'couple';

export interface DailyMomentRequest {
  pregnancyWeek: number;
  pregnancyDay: number;
  category: DailyMomentCategory;
  date: string;
}

export interface DailyMomentResponse {
  category: DailyMomentCategory;
  header: string;
  notification: string;
  card: {
    title: string;
    content: string;
  };
  emoji: string;
}


export const generateDailyMoment = async (
  request: DailyMomentRequest,
  userApiKey?: string
): Promise<DailyMomentResponse> => {
  const ai = getGeminiClient(userApiKey);
  const env = typeof process !== 'undefined' && process.env ? process.env : (import.meta as any).env;
  const model = env?.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  const userPrompt = `Please generate a daily moment for the following specifics:
- Pregnancy Week: ${request.pregnancyWeek}
- Pregnancy Day: ${request.pregnancyDay}
- Category: ${request.category}
- Date: ${request.date}
`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: userPrompt,
      config: {
        systemInstruction: DAILY_MOMENT_PROMPT.trim(),
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
          },
          required: ['category', 'header', 'notification', 'card', 'emoji'],
        },
      }
    });

    if (!response.text) {
      throw new Error('Gemini returned an empty response for the daily moment.');
    }

    return JSON.parse(response.text) as DailyMomentResponse;
  } catch (error: any) {
    throw new Error(`Failed to generate daily moment: ${error.message || 'Unknown error'}`);
  }
};