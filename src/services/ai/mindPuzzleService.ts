import { MIND_PUZZLES_SYSTEM_PROMPT } from '../../prompts/mind_puzzles';
import {
  PUZZLES_PER_KIND,
  sanitizeConnectionsPuzzle,
  sanitizeDailyMindPuzzles,
  sanitizeRiddlePuzzle,
  sanitizeWordScramblePuzzle,
  type ConnectionsPuzzle,
  type DailyMindPuzzles,
  type MindPuzzleKind,
  type RiddlePuzzle,
  type WordScramblePuzzle,
} from '../../models/mindPuzzle';
import {
  getFallbackConnectionsPuzzles,
  getFallbackRiddlePuzzles,
  getFallbackWordScramblePuzzles,
} from '../../utils/fallbackMindPuzzles';
import { DEFAULT_GEMINI_MODEL, getGeminiClient } from './geminiCore';

export const CONNECTIONS_PUZZLE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: {
      type: 'STRING',
      description: 'Short, warm title for this 4x4 word connections puzzle.',
    },
    themeHint: {
      type: 'STRING',
      description:
        'One inviting sentence hinting at the vibe of the puzzle without giving away exact categories.',
    },
    groups: {
      type: 'ARRAY',
      description: 'Exactly 4 groups of 4 unique words each (16 completely unique words total).',
      items: {
        type: 'OBJECT',
        properties: {
          category: { type: 'STRING' },
          difficulty: {
            type: 'STRING',
            enum: ['gentle', 'cozy', 'clever', 'tricky'],
          },
          words: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
        required: ['category', 'difficulty', 'words'],
      },
    },
  },
  required: ['title', 'themeHint', 'groups'],
} as const;

export const WORD_SCRAMBLE_PUZZLE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: {
      type: 'STRING',
      description: 'Short, warm title for this 4-word unscramble puzzle.',
    },
    theme: {
      type: 'STRING',
      description: 'The cozy theme uniting all 4 words.',
    },
    items: {
      type: 'ARRAY',
      description:
        'Exactly 4 single-word uppercase A-Z entries (4–9 letters each) with clear clues.',
      items: {
        type: 'OBJECT',
        properties: {
          word: {
            type: 'STRING',
            description: 'Single common English word, uppercase A-Z letters only, 4-9 characters.',
          },
          clue: {
            type: 'STRING',
            description: 'Warm, helpful clue that does not contain the answer word.',
          },
        },
        required: ['word', 'clue'],
      },
    },
  },
  required: ['title', 'theme', 'items'],
} as const;

export const RIDDLE_PUZZLE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: {
      type: 'STRING',
      description: 'Short inviting title for the brain teaser.',
    },
    category: {
      type: 'STRING',
      description: 'Short label like "Cozy Riddle", "Wordplay", "Pattern Spark", or "Number Logic".',
    },
    question: {
      type: 'STRING',
      description: 'An engaging, gentle riddle or light pattern/logic puzzle.',
    },
    options: {
      type: 'ARRAY',
      description: 'Exactly 4 distinct short answer options.',
      items: { type: 'STRING' },
    },
    correctIndex: {
      type: 'INTEGER',
      description: '0-based index (0, 1, 2, or 3) of the single unambiguously correct option.',
    },
    hint: {
      type: 'STRING',
      description: 'A gentle nudge toward the right answer without stating it outright.',
    },
    explanation: {
      type: 'STRING',
      description: 'A warm 1-2 sentence explanation of why the answer fits.',
    },
  },
  required: ['title', 'category', 'question', 'options', 'correctIndex', 'hint', 'explanation'],
} as const;

export const DAILY_MIND_PUZZLES_SCHEMA = {
  type: 'OBJECT',
  properties: {
    connections: {
      type: 'ARRAY',
      description: `Exactly ${PUZZLES_PER_KIND} distinct Calm Word Connections puzzles with varied themes.`,
      items: CONNECTIONS_PUZZLE_SCHEMA,
    },
    wordScramble: {
      type: 'ARRAY',
      description: `Exactly ${PUZZLES_PER_KIND} distinct Cozy Word Unscrambler puzzles with varied themes.`,
      items: WORD_SCRAMBLE_PUZZLE_SCHEMA,
    },
    riddle: {
      type: 'ARRAY',
      description: `Exactly ${PUZZLES_PER_KIND} distinct Gentle Brain Teasers mixing riddles, wordplay, and patterns.`,
      items: RIDDLE_PUZZLE_SCHEMA,
    },
  },
  required: ['connections', 'wordScramble', 'riddle'],
} as const;

const getModelName = (): string => {
  const env = typeof process !== 'undefined' && process.env ? process.env : import.meta.env;
  return (env?.VITE_GEMINI_MODEL as string | undefined) || DEFAULT_GEMINI_MODEL;
};

const pickThemeInspiration = (): string => {
  const themes = [
    'botanical gardens, morning light, and nature',
    'music, lullabies, melodies, and cozy sounds',
    'comforting kitchens, fruits, spices, and herbal teas',
    'stars, seasons, clouds, and calm skies',
    'art, colors, textiles, and handmade crafts',
    'world landmarks, peaceful rivers, and gentle travel',
    'stories, fairy tales, books, and warm family traditions',
    'cozy nursery essentials, soft fabrics, and gentle beginnings',
  ];
  return themes[Math.floor(Math.random() * themes.length)];
};

export interface SinglePuzzleResultMap {
  connections: ConnectionsPuzzle;
  wordScramble: WordScramblePuzzle;
  riddle: RiddlePuzzle;
}

const topUpList = <T extends { title: string }>(
  items: T[],
  fallbacks: T[],
  targetCount: number
): T[] => {
  const result = items.slice(0, targetCount);
  if (result.length >= targetCount) return result;

  const usedTitles = new Set(result.map((r) => r.title.toLowerCase()));
  for (const fb of fallbacks) {
    if (result.length >= targetCount) break;
    if (!usedTitles.has(fb.title.toLowerCase())) {
      result.push(fb);
      usedTitles.add(fb.title.toLowerCase());
    }
  }
  for (const fb of fallbacks) {
    if (result.length >= targetCount) break;
    result.push(fb);
  }
  return result;
};

/**
 * Generates ONE specific mind puzzle via Gemini without touching the daily digest
 * or any other puzzle in today's set.
 */
export const generateSingleMindPuzzle = async <K extends MindPuzzleKind>(
  kind: K,
  options: { pregnancyWeek?: number; avoidTitles?: string[] } = {},
  userApiKey?: string
): Promise<SinglePuzzleResultMap[K]> => {
  const ai = getGeminiClient(userApiKey);
  const model = getModelName();
  const inspiration = pickThemeInspiration();

  const schemaByKind = {
    connections: CONNECTIONS_PUZZLE_SCHEMA,
    wordScramble: WORD_SCRAMBLE_PUZZLE_SCHEMA,
    riddle: RIDDLE_PUZZLE_SCHEMA,
  } as const;

  const promptByKind: Record<MindPuzzleKind, string> = {
    connections:
      'Create ONE fresh "Calm Word Connections" puzzle (4 groups of 4 completely unique words = 16 unique words total).',
    wordScramble:
      'Create ONE fresh "Cozy Word Unscrambler" puzzle with 4 uppercase A-Z single English words (4–9 letters each) and warm clues.',
    riddle:
      'Create ONE fresh gentle riddle, light wordplay, or pattern brain teaser with 4 distinct options, an unambiguous correctIndex (0–3), a helpful hint, and a warm explanation.',
  };

  const avoidList = (options.avoidTitles ?? [])
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6);

  const userPrompt = [
    promptByKind[kind],
    options.pregnancyWeek ? `Context: Expectant parent in pregnancy week ${options.pregnancyWeek}.` : '',
    `Creative inspiration for variety: ${inspiration}.`,
    avoidList.length > 0
      ? `Choose a completely fresh topic/angle different from these current puzzles: ${avoidList.join(', ')}.`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const parseAndValidate = (rawText: string): SinglePuzzleResultMap[K] | null => {
    const parsed: unknown = JSON.parse(rawText);
    if (kind === 'connections') {
      return sanitizeConnectionsPuzzle(parsed) as SinglePuzzleResultMap[K] | null;
    }
    if (kind === 'wordScramble') {
      return sanitizeWordScramblePuzzle(parsed) as SinglePuzzleResultMap[K] | null;
    }
    return sanitizeRiddlePuzzle(parsed) as SinglePuzzleResultMap[K] | null;
  };

  let lastError: Error | null = null;

  // Retry once if the model occasionally slips on uniqueness or word-format constraints
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: MIND_PUZZLES_SYSTEM_PROMPT.trim(),
          responseMimeType: 'application/json',
          responseSchema: schemaByKind[kind],
        },
      });

      if (!response.text) {
        throw new Error('Gemini returned an empty response for this puzzle.');
      }

      const validated = parseAndValidate(response.text);
      if (validated) {
        return validated;
      }

      lastError = new Error('Generated puzzle did not pass validation.');
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error('Unknown puzzle generation error');
      if (lastError.message.toLowerCase().includes('api key')) {
        break;
      }
    }
  }

  throw new Error(
    lastError?.message || 'Could not generate a new puzzle right now. Please try again.'
  );
};

/**
 * Generates a full set of 12 daily mind puzzles (4 Connections, 4 Word Scrambles, 4 Brain Teasers)
 * via Gemini without regenerating the rest of the daily digest.
 */
export const generateMindPuzzlesSet = async (
  options: { pregnancyWeek?: number } = {},
  userApiKey?: string
): Promise<DailyMindPuzzles> => {
  const ai = getGeminiClient(userApiKey);
  const model = getModelName();
  const totalCount = PUZZLES_PER_KIND * 3;

  const userPrompt = [
    `Create a calm, varied set of ${totalCount} mind puzzles for today so an expectant parent can play anytime throughout the day:`,
    `- ${PUZZLES_PER_KIND} distinct "connections" puzzles (each having 4 groups of 4 completely unique words)`,
    `- ${PUZZLES_PER_KIND} distinct "wordScramble" puzzles (each having 4 single uppercase A-Z words with clues)`,
    `- ${PUZZLES_PER_KIND} distinct "riddle" brain teasers (mixing cozy riddles, light wordplay, and gentle pattern/number puzzles)`,
    options.pregnancyWeek ? `Context: Expectant parent in pregnancy week ${options.pregnancyWeek}.` : '',
    'Use diverse, uplifting themes across all 12 puzzles (nature, music, food & tea, skies, seasons, art, travel, stories, cozy nursery, everyday wonders).',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: MIND_PUZZLES_SYSTEM_PROMPT.trim(),
        responseMimeType: 'application/json',
        responseSchema: DAILY_MIND_PUZZLES_SCHEMA,
      },
    });

    if (!response.text) {
      throw new Error('Gemini returned an empty response for daily puzzles.');
    }

    const parsed: unknown = JSON.parse(response.text);
    const sanitized = sanitizeDailyMindPuzzles(parsed);

    return {
      connections: topUpList(
        sanitized?.connections ?? [],
        getFallbackConnectionsPuzzles(PUZZLES_PER_KIND),
        PUZZLES_PER_KIND
      ),
      wordScramble: topUpList(
        sanitized?.wordScramble ?? [],
        getFallbackWordScramblePuzzles(PUZZLES_PER_KIND),
        PUZZLES_PER_KIND
      ),
      riddle: topUpList(
        sanitized?.riddle ?? [],
        getFallbackRiddlePuzzles(PUZZLES_PER_KIND),
        PUZZLES_PER_KIND
      ),
      updatedAt: Date.now(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to generate daily puzzles: ${msg}`, { cause: err });
  }
};
