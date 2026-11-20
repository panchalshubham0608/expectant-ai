import { MIND_PUZZLES_SYSTEM_PROMPT } from '../../prompts/mind_puzzles';
import {
  DEFAULT_DAILY_MIX_ALLOCATION,
  sanitizeDailyMindPuzzles,
  sanitizeFiveCluesPuzzle,
  sanitizeRebusPuzzle,
  sanitizeRiddlePuzzle,
  sanitizeWordScramblePuzzle,
  type DailyMindPuzzles,
  type DailyMixAllocation,
  type FiveCluesPuzzle,
  type MindPuzzleKind,
  type RebusPuzzle,
  type RiddlePuzzle,
  type WordScramblePuzzle,
} from '../../models/mindPuzzle';
import {
  getFallbackFiveCluesPuzzles,
  getFallbackRebusPuzzles,
  getFallbackRiddlePuzzles,
  getFallbackWordScramblePuzzles,
} from '../../utils/fallbackMindPuzzles';
import { DEFAULT_GEMINI_MODEL, getGeminiClient } from './geminiCore';

export const FIVE_CLUES_PUZZLE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: {
      type: 'STRING',
      description: 'Short, warm non-spoiler title for this 5-Clue Mystery.',
    },
    category: {
      type: 'STRING',
      description: 'Short category label like "World Place", "Kitchen Wonder", "Nature Gem", or "Everyday Invention".',
    },
    clues: {
      type: 'ARRAY',
      description:
        'Exactly 5 progressive clues ordered from subtle/poetic (index 0) to unmistakable (index 4). Never state the answer word in clues 1-4.',
      items: { type: 'STRING' },
    },
    options: {
      type: 'ARRAY',
      description: 'Exactly 4 distinct, plausible short answer choices.',
      items: { type: 'STRING' },
    },
    correctIndex: {
      type: 'INTEGER',
      description: '0-based index (0, 1, 2, or 3) of the single unambiguously correct option.',
    },
    explanation: {
      type: 'STRING',
      description: 'Warm 1-2 sentence reveal tying the clues back to the answer.',
    },
  },
  required: ['title', 'category', 'clues', 'options', 'correctIndex', 'explanation'],
} as const;

export const REBUS_PUZZLE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: {
      type: 'STRING',
      description: 'Short inviting non-spoiler title for this Word Picture (typographic rebus).',
    },
    category: {
      type: 'STRING',
      description: 'Short label like "Word Picture", "Visual Idiom", or "Phrase Play".',
    },
    visual: {
      type: 'OBJECT',
      description: 'Structured typographic arrangement rendered as a clean visual card.',
      properties: {
        layout: {
          type: 'STRING',
          enum: ['stack', 'between', 'repeat', 'size', 'direction', 'split', 'box', 'colorWord'],
        },
        primary: {
          type: 'STRING',
          description: 'Primary word or letters (concise, <= 24 chars).',
        },
        secondary: {
          type: 'STRING',
          description: 'Secondary word (bottom word for stack, middle word for between, right half for split, or box label).',
        },
        accent: {
          type: 'STRING',
          description: 'Right-hand word for "between" layout (e.g. "LINE" or "ME").',
        },
        repeatCount: {
          type: 'INTEGER',
          description: 'How many times to repeat primary (2, 3, or 4) for "repeat" layout.',
        },
        sizeVariant: {
          type: 'STRING',
          enum: ['tiny', 'giant'],
          description: 'Visual scale for "size" layout.',
        },
        direction: {
          type: 'STRING',
          enum: ['upsideDown', 'backwards', 'rising', 'falling'],
          description: 'Visual orientation for "direction" layout.',
        },
        boxPlacement: {
          type: 'STRING',
          enum: ['inside', 'outside'],
          description: 'Placement relative to the drawn box for "box" layout.',
        },
        color: {
          type: 'STRING',
          enum: ['blue', 'green', 'gold', 'silver', 'red', 'rose'],
          description: 'Color token for "colorWord" layout.',
        },
      },
      required: ['layout', 'primary'],
    },
    options: {
      type: 'ARRAY',
      description:
        'Exactly 4 distinct, close look-alike common phrases (1-4 words, <=24 letters each) sharing similar key words so the choice is genuinely tricky.',
      items: { type: 'STRING' },
    },
    correctIndex: {
      type: 'INTEGER',
      description: '0-based index (0, 1, 2, or 3) of the single correct phrase.',
    },
    hint: {
      type: 'STRING',
      description: 'Gentle nudge pointing at the visual trick without giving away the answer.',
    },
    explanation: {
      type: 'STRING',
      description: 'Warm 1-2 sentence explanation of how the visual arrangement spells the phrase.',
    },
  },
  required: ['title', 'category', 'visual', 'options', 'correctIndex', 'hint', 'explanation'],
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

export const buildDailyMindPuzzlesSchema = (
  allocation: DailyMixAllocation = DEFAULT_DAILY_MIX_ALLOCATION
) => ({
  type: 'OBJECT',
  properties: {
    fiveClues: {
      type: 'ARRAY',
      description:
        allocation.fiveClues > 0
          ? `Exactly ${allocation.fiveClues} distinct 5-Clue Mystery puzzles on varied topics.`
          : 'Return an empty array [] (0 puzzles requested).',
      items: FIVE_CLUES_PUZZLE_SCHEMA,
    },
    rebus: {
      type: 'ARRAY',
      description:
        allocation.rebus > 0
          ? `Exactly ${allocation.rebus} distinct Word Picture (typographic rebus) puzzles using varied visual layouts.`
          : 'Return an empty array [] (0 puzzles requested).',
      items: REBUS_PUZZLE_SCHEMA,
    },
    wordScramble: {
      type: 'ARRAY',
      description:
        allocation.wordScramble > 0
          ? `Exactly ${allocation.wordScramble} distinct Cozy Word Unscrambler puzzles with varied themes.`
          : 'Return an empty array [] (0 puzzles requested).',
      items: WORD_SCRAMBLE_PUZZLE_SCHEMA,
    },
    riddle: {
      type: 'ARRAY',
      description:
        allocation.riddle > 0
          ? `Exactly ${allocation.riddle} distinct Gentle Brain Teasers mixing riddles, wordplay, and patterns.`
          : 'Return an empty array [] (0 puzzles requested).',
      items: RIDDLE_PUZZLE_SCHEMA,
    },
  },
  required: ['fiveClues', 'rebus', 'wordScramble', 'riddle'],
});

export const DAILY_MIND_PUZZLES_SCHEMA = buildDailyMindPuzzlesSchema(DEFAULT_DAILY_MIX_ALLOCATION);

const getModelName = (): string => {
  const env = typeof process !== 'undefined' && process.env ? process.env : import.meta.env;
  return (env?.VITE_GEMINI_MODEL as string | undefined) || DEFAULT_GEMINI_MODEL;
};

const pickThemeInspiration = (): string => {
  const themes = [
    'botanical gardens, morning light, and nature wonders',
    'music, lullabies, melodies, and cozy sounds',
    'comforting kitchens, world cuisines, fruits, spices, and herbal teas',
    'stars, seasons, weather phenomena, and calm skies',
    'art, colors, textiles, architecture, and handmade crafts',
    'world landmarks, peaceful rivers, and gentle travel',
    'stories, literature, everyday inventions, and warm family traditions',
    'cozy home comforts, gentle idioms, and everyday discoveries',
  ];
  return themes[Math.floor(Math.random() * themes.length)];
};

export interface SinglePuzzleResultMap {
  fiveClues: FiveCluesPuzzle;
  rebus: RebusPuzzle;
  wordScramble: WordScramblePuzzle;
  riddle: RiddlePuzzle;
}

const topUpList = <T extends { title: string }>(
  items: T[],
  fallbacks: T[],
  targetCount: number
): T[] => {
  if (targetCount <= 0) return [];
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
    fiveClues: FIVE_CLUES_PUZZLE_SCHEMA,
    rebus: REBUS_PUZZLE_SCHEMA,
    wordScramble: WORD_SCRAMBLE_PUZZLE_SCHEMA,
    riddle: RIDDLE_PUZZLE_SCHEMA,
  } as const;

  const promptByKind: Record<MindPuzzleKind, string> = {
    fiveClues:
      'Create ONE fresh "5-Clue Mystery" puzzle with 5 progressive clues ordered from subtle/poetic to unmistakable, 4 distinct options, an unambiguous correctIndex (0–3), and a warm explanation.',
    rebus:
      'Create ONE fresh "Word Picture" (typographic rebus) puzzle using one of the 8 structured visual layouts, 4 distinct phrase options, an unambiguous correctIndex (0–3), a helpful hint, and a clear explanation.',
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
    if (kind === 'fiveClues') {
      return sanitizeFiveCluesPuzzle(parsed) as SinglePuzzleResultMap[K] | null;
    }
    if (kind === 'rebus') {
      return sanitizeRebusPuzzle(parsed) as SinglePuzzleResultMap[K] | null;
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
 * Generates a personalized daily set of mind puzzles matching the requested allocation
 * via Gemini without regenerating the rest of the daily digest.
 */
export const generateMindPuzzlesSet = async (
  options: { pregnancyWeek?: number; allocation?: DailyMixAllocation } = {},
  userApiKey?: string
): Promise<DailyMindPuzzles> => {
  const ai = getGeminiClient(userApiKey);
  const model = getModelName();
  const allocation = options.allocation ?? DEFAULT_DAILY_MIX_ALLOCATION;
  const totalCount =
    allocation.fiveClues + allocation.rebus + allocation.wordScramble + allocation.riddle;

  const requestLines: string[] = [];
  if (allocation.fiveClues > 0) {
    requestLines.push(
      `- ${allocation.fiveClues} distinct "fiveClues" mysteries (each with 5 progressive clues from subtle to clear + 4 options)`
    );
  } else {
    requestLines.push('- 0 "fiveClues" puzzles (return an empty array [])');
  }

  if (allocation.rebus > 0) {
    requestLines.push(
      `- ${allocation.rebus} distinct "rebus" word pictures (using varied visual layouts from the 8 layout types + 4 phrase options)`
    );
  } else {
    requestLines.push('- 0 "rebus" puzzles (return an empty array [])');
  }

  if (allocation.wordScramble > 0) {
    requestLines.push(
      `- ${allocation.wordScramble} distinct "wordScramble" puzzles (each having 4 single uppercase A-Z words with clues)`
    );
  } else {
    requestLines.push('- 0 "wordScramble" puzzles (return an empty array [])');
  }

  if (allocation.riddle > 0) {
    requestLines.push(
      `- ${allocation.riddle} distinct "riddle" brain teasers (mixing cozy riddles, light wordplay, and gentle pattern/number puzzles)`
    );
  } else {
    requestLines.push('- 0 "riddle" puzzles (return an empty array [])');
  }

  const userPrompt = [
    `Create a calm, varied set of ${totalCount} mind puzzles for today so an expectant parent can play anytime throughout the day:`,
    ...requestLines,
    options.pregnancyWeek ? `Context: Expectant parent in pregnancy week ${options.pregnancyWeek}.` : '',
    'Use diverse, uplifting themes across all puzzles (nature, music, world places, food & tea, skies, seasons, art, inventions, stories, everyday wonders).',
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
        responseSchema: buildDailyMindPuzzlesSchema(allocation),
      },
    });

    if (!response.text) {
      throw new Error('Gemini returned an empty response for daily puzzles.');
    }

    const parsed: unknown = JSON.parse(response.text);
    const sanitized = sanitizeDailyMindPuzzles(parsed);

    return {
      fiveClues: topUpList(
        sanitized?.fiveClues ?? [],
        getFallbackFiveCluesPuzzles(allocation.fiveClues),
        allocation.fiveClues
      ),
      rebus: topUpList(
        sanitized?.rebus ?? [],
        getFallbackRebusPuzzles(allocation.rebus),
        allocation.rebus
      ),
      wordScramble: topUpList(
        sanitized?.wordScramble ?? [],
        getFallbackWordScramblePuzzles(allocation.wordScramble),
        allocation.wordScramble
      ),
      riddle: topUpList(
        sanitized?.riddle ?? [],
        getFallbackRiddlePuzzles(allocation.riddle),
        allocation.riddle
      ),
      updatedAt: Date.now(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to generate daily puzzles: ${msg}`, { cause: err });
  }
};
