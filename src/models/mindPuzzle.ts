export type MindPuzzleKind = 'connections' | 'wordScramble' | 'riddle';

export type ConnectionsDifficulty = 'gentle' | 'cozy' | 'clever' | 'tricky';

/** Target count per puzzle category (4 × 3 categories = 12 daily AI puzzles). */
export const PUZZLES_PER_KIND = 4;
export const MAX_PUZZLES_PER_KIND = 6;

export interface ConnectionsGroup {
  category: string;
  difficulty: ConnectionsDifficulty;
  words: [string, string, string, string];
}

export interface ConnectionsPuzzle {
  id: string;
  title: string;
  themeHint: string;
  groups: [ConnectionsGroup, ConnectionsGroup, ConnectionsGroup, ConnectionsGroup];
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
  connections: ConnectionsPuzzle[];
  wordScramble: WordScramblePuzzle[];
  riddle: RiddlePuzzle[];
  updatedAt?: number;
}

const VALID_DIFFICULTIES: readonly ConnectionsDifficulty[] = [
  'gentle',
  'cozy',
  'clever',
  'tricky',
] as const;

const LIMITS = {
  id: 64,
  title: 80,
  theme: 80,
  themeHint: 180,
  category: 64,
  connectionWord: 26,
  scrambleWordMin: 3,
  scrambleWordMax: 12,
  clue: 160,
  question: 360,
  option: 100,
  hint: 220,
  explanation: 360,
} as const;

const cleanString = (value: unknown, maxLen: number): string => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLen);
};

export const createPuzzleId = (prefix: MindPuzzleKind): string => {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${randomPart}`;
};

export const sanitizeConnectionsPuzzle = (raw: unknown): ConnectionsPuzzle | null => {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;

  const title = cleanString(record.title, LIMITS.title) || 'Calm Word Connections';
  const themeHint =
    cleanString(record.themeHint, LIMITS.themeHint) ||
    'Find four calm groups of four connected words.';

  if (!Array.isArray(record.groups) || record.groups.length !== 4) {
    return null;
  }

  const seenWords = new Set<string>();
  const sanitizedGroups: ConnectionsGroup[] = [];

  for (let i = 0; i < 4; i++) {
    const rawGroup = record.groups[i];
    if (!rawGroup || typeof rawGroup !== 'object') return null;
    const g = rawGroup as Record<string, unknown>;

    const category = cleanString(g.category, LIMITS.category);
    if (!category) return null;

    const rawDiff = cleanString(g.difficulty, 16).toLowerCase() as ConnectionsDifficulty;
    const difficulty = VALID_DIFFICULTIES.includes(rawDiff) ? rawDiff : VALID_DIFFICULTIES[i];

    if (!Array.isArray(g.words) || g.words.length !== 4) return null;

    const words: string[] = [];
    for (const rawWord of g.words) {
      const word = cleanString(rawWord, LIMITS.connectionWord);
      if (!word) return null;
      const key = word.toLowerCase();
      if (seenWords.has(key)) return null;
      seenWords.add(key);
      words.push(word);
    }

    sanitizedGroups.push({
      category,
      difficulty,
      words: [words[0], words[1], words[2], words[3]],
    });
  }

  if (seenWords.size !== 16) return null;

  const id = cleanString(record.id, LIMITS.id) || createPuzzleId('connections');

  return {
    id,
    title,
    themeHint,
    groups: [
      sanitizedGroups[0],
      sanitizedGroups[1],
      sanitizedGroups[2],
      sanitizedGroups[3],
    ],
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
  const category = cleanString(record.category, LIMITS.category) || 'Cozy Riddle';
  const question = cleanString(record.question, LIMITS.question);
  const hint = cleanString(record.hint, LIMITS.hint);
  const explanation = cleanString(record.explanation, LIMITS.explanation);

  if (!question || !hint || !explanation) return null;
  if (!Array.isArray(record.options) || record.options.length !== 4) return null;

  const seenOptions = new Set<string>();
  const options: string[] = [];
  for (const rawOpt of record.options) {
    const opt = cleanString(rawOpt, LIMITS.option);
    if (!opt) return null;
    const key = opt.toLowerCase();
    if (seenOptions.has(key)) return null;
    seenOptions.add(key);
    options.push(opt);
  }

  const rawIndex = record.correctIndex;
  if (typeof rawIndex !== 'number' || !Number.isInteger(rawIndex) || rawIndex < 0 || rawIndex > 3) {
    return null;
  }

  const id = cleanString(record.id, LIMITS.id) || createPuzzleId('riddle');

  return {
    id,
    title,
    category,
    question,
    options: [options[0], options[1], options[2], options[3]],
    correctIndex: rawIndex,
    hint,
    explanation,
  };
};

const sanitizeList = <T,>(raw: unknown, itemSanitizer: (item: unknown) => T | null): T[] => {
  // Normalize either an array or a legacy single-puzzle object
  const rawItems = Array.isArray(raw) ? raw : raw && typeof raw === 'object' ? [raw] : [];
  const valid: T[] = [];
  for (const entry of rawItems) {
    const sanitized = itemSanitizer(entry);
    if (sanitized) {
      valid.push(sanitized);
      if (valid.length >= MAX_PUZZLES_PER_KIND) break;
    }
  }
  return valid;
};

export const countDailyMindPuzzles = (puzzles?: DailyMindPuzzles | null): number => {
  if (!puzzles) return 0;
  return puzzles.connections.length + puzzles.wordScramble.length + puzzles.riddle.length;
};

export const sanitizeDailyMindPuzzles = (raw: unknown): DailyMindPuzzles | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;

  const connections = sanitizeList(record.connections, sanitizeConnectionsPuzzle);
  const wordScramble = sanitizeList(record.wordScramble, sanitizeWordScramblePuzzle);
  const riddle = sanitizeList(record.riddle, sanitizeRiddlePuzzle);

  if (connections.length === 0 && wordScramble.length === 0 && riddle.length === 0) {
    return undefined;
  }

  const updatedAt =
    typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
      ? record.updatedAt
      : Date.now();

  return {
    connections,
    wordScramble,
    riddle,
    updatedAt,
  };
};
