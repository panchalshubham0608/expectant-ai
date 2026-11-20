export type MindPuzzleKind = 'fiveClues' | 'rebus' | 'wordScramble' | 'riddle';

export const ALL_MIND_PUZZLE_KINDS: readonly MindPuzzleKind[] = [
  'fiveClues',
  'rebus',
  'wordScramble',
  'riddle',
] as const;

export type DailyMixAllocation = Record<MindPuzzleKind, number>;

/** Default balanced target count per puzzle variety (3 × 4 varieties = 12 daily AI puzzles). */
export const DEFAULT_PUZZLES_PER_KIND = 3;
export const MAX_PUZZLES_PER_KIND = 8;

export const DEFAULT_DAILY_MIX_ALLOCATION: DailyMixAllocation = {
  fiveClues: DEFAULT_PUZZLES_PER_KIND,
  rebus: DEFAULT_PUZZLES_PER_KIND,
  wordScramble: DEFAULT_PUZZLES_PER_KIND,
  riddle: DEFAULT_PUZZLES_PER_KIND,
};

export interface FiveCluesPuzzle {
  id: string;
  title: string;
  category: string;
  clues: [string, string, string, string, string];
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export type RebusVisualLayout =
  | 'stack'
  | 'between'
  | 'repeat'
  | 'size'
  | 'direction'
  | 'split'
  | 'box'
  | 'colorWord';

export type RebusColorToken = 'blue' | 'green' | 'gold' | 'silver' | 'red' | 'rose';
export type RebusDirectionVariant = 'upsideDown' | 'backwards' | 'rising' | 'falling';
export type RebusSizeVariant = 'tiny' | 'giant';
export type RebusBoxPlacement = 'inside' | 'outside';

export interface RebusVisualSpec {
  layout: RebusVisualLayout;
  primary: string;
  secondary?: string;
  accent?: string;
  repeatCount?: number;
  sizeVariant?: RebusSizeVariant;
  direction?: RebusDirectionVariant;
  boxPlacement?: RebusBoxPlacement;
  color?: RebusColorToken;
}

export interface RebusPuzzle {
  id: string;
  title: string;
  category: string;
  visual: RebusVisualSpec;
  options: [string, string, string, string];
  correctIndex: number;
  hint: string;
  explanation: string;
}

export interface WordScrambleItem {
  word: string;
  clue: string;
}

export interface WordScramblePuzzle {
  id: string;
  title: string;
  theme: string;
  items: WordScrambleItem[];
}

export interface RiddlePuzzle {
  id: string;
  title: string;
  category: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  hint: string;
  explanation: string;
}

export interface DailyMindPuzzles {
  fiveClues: FiveCluesPuzzle[];
  rebus: RebusPuzzle[];
  wordScramble: WordScramblePuzzle[];
  riddle: RiddlePuzzle[];
  updatedAt?: number;
}

const VALID_REBUS_LAYOUTS: readonly RebusVisualLayout[] = [
  'stack',
  'between',
  'repeat',
  'size',
  'direction',
  'split',
  'box',
  'colorWord',
] as const;

const VALID_REBUS_COLORS: readonly RebusColorToken[] = [
  'blue',
  'green',
  'gold',
  'silver',
  'red',
  'rose',
] as const;

const VALID_REBUS_DIRECTIONS: readonly RebusDirectionVariant[] = [
  'upsideDown',
  'backwards',
  'rising',
  'falling',
] as const;

const VALID_REBUS_SIZES: readonly RebusSizeVariant[] = ['tiny', 'giant'] as const;
const VALID_REBUS_BOX_PLACEMENTS: readonly RebusBoxPlacement[] = ['inside', 'outside'] as const;

const LIMITS = {
  id: 64,
  title: 80,
  theme: 80,
  category: 64,
  clue: 180,
  rebusWord: 28,
  scrambleWordMin: 3,
  scrambleWordMax: 12,
  question: 360,
  option: 100,
  hint: 220,
  explanation: 360,
} as const;

const cleanString = (value: unknown, maxLen: number): string => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLen);
};

const sanitizeFourDistinctOptions = (
  rawOptions: unknown
): [string, string, string, string] | null => {
  if (!Array.isArray(rawOptions) || rawOptions.length !== 4) return null;
  const options: string[] = [];
  const seen = new Set<string>();
  for (const rawOpt of rawOptions) {
    const opt = cleanString(rawOpt, LIMITS.option);
    if (!opt) return null;
    const key = opt.toLowerCase();
    if (seen.has(key)) return null;
    seen.add(key);
    options.push(opt);
  }
  return [options[0], options[1], options[2], options[3]];
};

export const createPuzzleId = (prefix: MindPuzzleKind): string => {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${randomPart}`;
};

export const sanitizeFiveCluesPuzzle = (raw: unknown): FiveCluesPuzzle | null => {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const title = cleanString(record.title, LIMITS.title) || '5-Clue Mystery';
  const category = cleanString(record.category, LIMITS.category) || 'Mystery';

  if (!Array.isArray(record.clues) || record.clues.length !== 5) return null;
  const clues: string[] = [];
  const seenClues = new Set<string>();
  for (const rawClue of record.clues) {
    const clue = cleanString(rawClue, LIMITS.clue);
    if (!clue) return null;
    const key = clue.toLowerCase();
    if (seenClues.has(key)) return null;
    seenClues.add(key);
    clues.push(clue);
  }

  const options = sanitizeFourDistinctOptions(record.options);
  if (!options) return null;

  const correctIndex =
    typeof record.correctIndex === 'number' && Number.isInteger(record.correctIndex)
      ? record.correctIndex
      : -1;
  if (correctIndex < 0 || correctIndex > 3) return null;

  const explanation =
    cleanString(record.explanation, LIMITS.explanation) ||
    `Every clue points right to "${options[correctIndex]}"!`;

  const id = cleanString(record.id, LIMITS.id) || createPuzzleId('fiveClues');

  return {
    id,
    title,
    category,
    clues: [clues[0], clues[1], clues[2], clues[3], clues[4]],
    options,
    correctIndex,
    explanation,
  };
};

export const sanitizeRebusPuzzle = (raw: unknown): RebusPuzzle | null => {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const title = cleanString(record.title, LIMITS.title) || 'Word Picture';
  const category = cleanString(record.category, LIMITS.category) || 'Word Picture';

  const rawVisual = record.visual;
  if (!rawVisual || typeof rawVisual !== 'object') return null;
  const v = rawVisual as Record<string, unknown>;

  const rawLayout = cleanString(v.layout, 24) as RebusVisualLayout;
  if (!VALID_REBUS_LAYOUTS.includes(rawLayout)) return null;

  let primary = cleanString(v.primary, LIMITS.rebusWord);
  if (!primary) return null;

  let secondary = cleanString(v.secondary, LIMITS.rebusWord) || undefined;
  let accent = cleanString(v.accent, LIMITS.rebusWord) || undefined;

  const visual: RebusVisualSpec = {
    layout: rawLayout,
    primary,
  };

  if (rawLayout === 'stack') {
    if (!secondary) return null;
    visual.secondary = secondary;
  } else if (rawLayout === 'between') {
    if (!secondary) return null;
    visual.secondary = secondary;
    visual.accent = accent || primary;
  } else if (rawLayout === 'repeat') {
    const rawCount =
      typeof v.repeatCount === 'number' && Number.isInteger(v.repeatCount) ? v.repeatCount : 2;
    visual.repeatCount = Math.max(2, Math.min(4, rawCount));
  } else if (rawLayout === 'size') {
    const rawSize = cleanString(v.sizeVariant, 16) as RebusSizeVariant;
    visual.sizeVariant = VALID_REBUS_SIZES.includes(rawSize) ? rawSize : 'tiny';
    if (secondary) visual.secondary = secondary;
  } else if (rawLayout === 'direction') {
    const rawDir = cleanString(v.direction, 20) as RebusDirectionVariant;
    visual.direction = VALID_REBUS_DIRECTIONS.includes(rawDir) ? rawDir : 'upsideDown';
    if (secondary) visual.secondary = secondary;
  } else if (rawLayout === 'split') {
    if (!secondary) {
      if (primary.length < 4) return null;
      const mid = Math.ceil(primary.length / 2);
      secondary = primary.slice(mid);
      primary = primary.slice(0, mid);
      visual.primary = primary;
    }
    visual.secondary = secondary;
  } else if (rawLayout === 'box') {
    const rawPlacement = cleanString(v.boxPlacement, 16) as RebusBoxPlacement;
    visual.boxPlacement = VALID_REBUS_BOX_PLACEMENTS.includes(rawPlacement)
      ? rawPlacement
      : 'outside';
    if (secondary) visual.secondary = secondary;
  } else if (rawLayout === 'colorWord') {
    const rawColor = cleanString(v.color, 16).toLowerCase() as RebusColorToken;
    visual.color = VALID_REBUS_COLORS.includes(rawColor) ? rawColor : 'blue';
    if (secondary) visual.secondary = secondary;
  }

  // Silence unused lint when accent is not needed outside 'between'
  if (rawLayout !== 'between') {
    accent = undefined;
  }
  void accent;

  const options = sanitizeFourDistinctOptions(record.options);
  if (!options) return null;

  const correctIndex =
    typeof record.correctIndex === 'number' && Number.isInteger(record.correctIndex)
      ? record.correctIndex
      : -1;
  if (correctIndex < 0 || correctIndex > 3) return null;

  const hint =
    cleanString(record.hint, LIMITS.hint) ||
    'Say what you see visually—position, size, color, or repetition is the clue.';
  const explanation =
    cleanString(record.explanation, LIMITS.explanation) ||
    `Reading the visual arrangement literally gives "${options[correctIndex]}".`;

  const id = cleanString(record.id, LIMITS.id) || createPuzzleId('rebus');

  return {
    id,
    title,
    category,
    visual,
    options,
    correctIndex,
    hint,
    explanation,
  };
};

export const sanitizeWordScramblePuzzle = (raw: unknown): WordScramblePuzzle | null => {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const title = cleanString(record.title, LIMITS.title) || 'Cozy Word Unscrambler';
  const theme = cleanString(record.theme, LIMITS.theme) || 'Peaceful Moments';

  if (!Array.isArray(record.items) || record.items.length < 3) {
    return null;
  }

  const seenWords = new Set<string>();
  const items: WordScrambleItem[] = [];

  for (const rawItem of record.items) {
    if (!rawItem || typeof rawItem !== 'object') continue;
    const item = rawItem as Record<string, unknown>;

    const rawWord = cleanString(item.word, LIMITS.scrambleWordMax + 4).toUpperCase();
    // Allow strictly A-Z alphabetic words so letter tiles remain intuitive on mobile
    if (!/^[A-Z]+$/.test(rawWord)) continue;
    if (rawWord.length < LIMITS.scrambleWordMin || rawWord.length > LIMITS.scrambleWordMax) {
      continue;
    }
    // Must have at least 2 distinct letters so scrambling produces a different order
    if (new Set(rawWord.split('')).size < 2) continue;
    if (seenWords.has(rawWord)) continue;

    const clue = cleanString(item.clue, LIMITS.clue);
    if (!clue) continue;

    seenWords.add(rawWord);
    items.push({ word: rawWord, clue });

    if (items.length >= 4) break;
  }

  if (items.length < 3) return null;

  const id = cleanString(record.id, LIMITS.id) || createPuzzleId('wordScramble');

  return {
    id,
    title,
    theme,
    items,
  };
};

export const sanitizeRiddlePuzzle = (raw: unknown): RiddlePuzzle | null => {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const title = cleanString(record.title, LIMITS.title) || 'Gentle Brain Teaser';
  const category = cleanString(record.category, LIMITS.category) || 'Brain Teaser';
  const question = cleanString(record.question, LIMITS.question);
  if (!question) return null;

  const options = sanitizeFourDistinctOptions(record.options);
  if (!options) return null;

  const correctIndex =
    typeof record.correctIndex === 'number' && Number.isInteger(record.correctIndex)
      ? record.correctIndex
      : -1;
  if (correctIndex < 0 || correctIndex > 3) return null;

  const hint =
    cleanString(record.hint, LIMITS.hint) || 'Pause for a calm breath and look closely at the wording.';
  const explanation =
    cleanString(record.explanation, LIMITS.explanation) ||
    `The matching answer is "${options[correctIndex]}".`;

  const id = cleanString(record.id, LIMITS.id) || createPuzzleId('riddle');

  return {
    id,
    title,
    category,
    question,
    options,
    correctIndex,
    hint,
    explanation,
  };
};

const sanitizeList = <T>(
  raw: unknown,
  itemSanitizer: (item: unknown) => T | null
): T[] => {
  if (Array.isArray(raw)) {
    const out: T[] = [];
    for (const item of raw) {
      const cleaned = itemSanitizer(item);
      if (cleaned) out.push(cleaned);
      if (out.length >= MAX_PUZZLES_PER_KIND) break;
    }
    return out;
  }
  const single = itemSanitizer(raw);
  return single ? [single] : [];
};

export const countDailyMindPuzzles = (puzzles: DailyMindPuzzles | null | undefined): number => {
  if (!puzzles) return 0;
  return (
    puzzles.fiveClues.length +
    puzzles.rebus.length +
    puzzles.wordScramble.length +
    puzzles.riddle.length
  );
};

export const sanitizeDailyMindPuzzles = (raw: unknown): DailyMindPuzzles | null => {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const fiveClues = sanitizeList(record.fiveClues, sanitizeFiveCluesPuzzle);
  const rebus = sanitizeList(record.rebus, sanitizeRebusPuzzle);
  const wordScramble = sanitizeList(record.wordScramble, sanitizeWordScramblePuzzle);
  const riddle = sanitizeList(record.riddle, sanitizeRiddlePuzzle);

  if (
    fiveClues.length === 0 &&
    rebus.length === 0 &&
    wordScramble.length === 0 &&
    riddle.length === 0
  ) {
    return null;
  }

  const updatedAt =
    typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
      ? record.updatedAt
      : undefined;

  return {
    fiveClues,
    rebus,
    wordScramble,
    riddle,
    ...(updatedAt !== undefined ? { updatedAt } : {}),
  };
};
