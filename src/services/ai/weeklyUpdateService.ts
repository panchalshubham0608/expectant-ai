import { endOfWeek, formatISO, startOfWeek } from 'date-fns';
import { WEEKLY_UPDATE_PROMPT } from '../../prompts/weekly_update_prompt';
import { DEFAULT_GEMINI_MODEL, getGeminiClient } from './geminiCore';

export interface WeeklyUpdateRequest {
  pregnancyWeek: number;
  startDate: string;
  endDate: string;
}

export interface WeeklyUpdateResponse {
  week: number;

  header: string;
  subtitle: string;

  baby: {
    title: string;
    description: string;
  };

  sizeComparison: {
    object: string;
    emoji: string;
    description: string;
  };

  highlights: Array<{
    title: string;
    description: string;
  }>;

  bodyChanges: Array<{
    title: string;
    description: string;
  }>;

  tip: {
    title: string;
    content: string;
  };

  coupleMoment: {
    title: string;
    content: string;
  };

  comingUp: {
    title: string;
    content: string;
  };

  emoji: string;
}

/**
 * Generates the weekly update content using the Gemini API based on the provided prompt.
 * @param request - The request object containing the pregnancy week and date range.
 * @param userApiKey - Optional user-provided API key for Gemini.
 * @returns A promise that resolves to the structured weekly update content.
 */
async function generateWeeklyUpdateContent(
  request: WeeklyUpdateRequest,
  userApiKey?: string,
): Promise<WeeklyUpdateResponse> {
  const ai = getGeminiClient(userApiKey);
  const env = typeof process !== 'undefined' && process.env ? process.env : (import.meta as any).env;
  const model = env?.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  const userPrompt = `Please generate a weekly update for the following specifics:
- Pregnancy Week: ${request.pregnancyWeek}
- Start Date: ${request.startDate}
- End Date: ${request.endDate}
`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: userPrompt,
      config: {
        systemInstruction: WEEKLY_UPDATE_PROMPT.trim(),
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            week: { type: 'NUMBER' },
            header: { type: 'STRING' },
            subtitle: { type: 'STRING' },
            baby: {
              type: 'OBJECT',
              properties: { title: { type: 'STRING' }, description: { type: 'STRING' } },
              required: ['title', 'description'],
            },
            sizeComparison: {
              type: 'OBJECT',
              properties: {
                object: { type: 'STRING' },
                emoji: { type: 'STRING' },
                description: { type: 'STRING' },
              },
              required: ['object', 'emoji', 'description'],
            },
            highlights: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: { title: { type: 'STRING' }, description: { type: 'STRING' } },
                required: ['title', 'description'],
              },
            },
            bodyChanges: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: { title: { type: 'STRING' }, description: { type: 'STRING' } },
                required: ['title', 'description'],
              },
            },
            tip: {
              type: 'OBJECT',
              properties: { title: { type: 'STRING' }, content: { type: 'STRING' } },
              required: ['title', 'content'],
            },
            coupleMoment: {
              type: 'OBJECT',
              properties: { title: { type: 'STRING' }, content: { type: 'STRING' } },
              required: ['title', 'content'],
            },
            comingUp: {
              type: 'OBJECT',
              properties: { title: { type: 'STRING' }, content: { type: 'STRING' } },
              required: ['title', 'content'],
            },
            emoji: { type: 'STRING' },
          },
          required: [
            'week',
            'header',
            'subtitle',
            'baby',
            'sizeComparison',
            'highlights',
            'bodyChanges',
            'tip',
            'coupleMoment',
            'comingUp',
            'emoji',
          ],
        },
      },
    });

    if (!response.text) {
      throw new Error('Gemini returned an empty response for the weekly update.');
    }

    return JSON.parse(response.text) as WeeklyUpdateResponse;
  } catch (error: any) {
    console.error('Failed to generate weekly update content:', error);
    throw new Error(`Failed to generate weekly update content: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Generates weekly update content and visuals using the Gemini API.
 * This function purely returns the AI response and does not interact with Firestore.
 */
export const generateWeeklyUpdate = async (pregnancyWeek: number, userApiKey?: string): Promise<WeeklyUpdateResponse> => {
  const today = new Date();
  const request: WeeklyUpdateRequest = {
    pregnancyWeek,
    startDate: formatISO(startOfWeek(today), { representation: 'date' }),
    endDate: formatISO(endOfWeek(today), { representation: 'date' }),
  };

  return await generateWeeklyUpdateContent(request, userApiKey);
};
