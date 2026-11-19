import type { SudokuBoard, SudokuSize } from './sudokuGenerator';

const STORAGE_PREFIX = 'mindPlay:builtin';

const buildKey = (profileId: string, activity: string): string =>
  `${STORAGE_PREFIX}:${profileId}:${activity}`;

const readJson = (key: string): unknown => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or private-mode errors
  }
};

/* ---------- Sudoku Persistence ---------- */

export interface SavedSudokuState {
  size: SudokuSize;
  board: SudokuBoard;
  values: number[];
}

const isValidDigitArray = (arr: unknown, length: number, min: number, max: number): arr is number[] =>
  Array.isArray(arr) &&
  arr.length === length &&
  arr.every((n) => typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max);

export const loadSudokuState = (profileId: string): SavedSudokuState | null => {
  const raw = readJson(buildKey(profileId, 'sudoku'));
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  const size = record.size;
  if (size !== 4 && size !== 6) return null;

  const expectedBoxRows = 2;
  const expectedBoxCols = size === 4 ? 2 : 3;
  const cellCount = size * size;

  const rawBoard = record.board;
  if (!rawBoard || typeof rawBoard !== 'object') return null;
  const b = rawBoard as Record<string, unknown>;

  const puzzle = b.puzzle;
  const solution = b.solution;
  const savedValues = record.values;

  if (
    b.size !== size ||
    b.boxRows !== expectedBoxRows ||
    b.boxCols !== expectedBoxCols ||
    !isValidDigitArray(puzzle, cellCount, 0, size) ||
    !isValidDigitArray(solution, cellCount, 1, size) ||
    !isValidDigitArray(savedValues, cellCount, 0, size)
  ) {
    return null;
  }

  // Ensure puzzle clues match solution and remain fixed in saved values
  for (let i = 0; i < cellCount; i++) {
    if (puzzle[i] !== 0 && puzzle[i] !== solution[i]) {
      return null;
    }
  }

  const normalizedValues = savedValues.map((v, i) => (puzzle[i] !== 0 ? puzzle[i] : v));

  return {
    size,
    board: {
      size,
      boxRows: expectedBoxRows,
      boxCols: expectedBoxCols,
      puzzle,
      solution,
    },
    values: normalizedValues,
  };
};

export const saveSudokuState = (profileId: string, state: SavedSudokuState): void => {
  writeJson(buildKey(profileId, 'sudoku'), state);
};

/* ---------- Memory Match Persistence ---------- */

export type MemoryPairCount = 6 | 8;

export interface SavedMemoryState {
  pairCount: MemoryPairCount;
  deckPairIds: string[];
  matchedPairIds: string[];
  moves: number;
}

export const loadMemoryState = (
  profileId: string,
  allowedPairIdsInOrder: readonly string[]
): SavedMemoryState | null => {
  const raw = readJson(buildKey(profileId, 'memory'));
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  const pairCount = record.pairCount;
  if (pairCount !== 6 && pairCount !== 8) return null;

  const expectedIds = allowedPairIdsInOrder.slice(0, pairCount);
  const expectedSet = new Set(expectedIds);

  if (!Array.isArray(record.deckPairIds) || record.deckPairIds.length !== pairCount * 2) {
    return null;
  }

  const counts = new Map<string, number>();
  const deckPairIds: string[] = [];
  for (const item of record.deckPairIds) {
    if (typeof item !== 'string' || !expectedSet.has(item)) return null;
    counts.set(item, (counts.get(item) ?? 0) + 1);
    deckPairIds.push(item);
  }

  // Every expected pairId must appear exactly twice
  for (const id of expectedIds) {
    if (counts.get(id) !== 2) return null;
  }

  const matchedSet = new Set<string>();
  if (Array.isArray(record.matchedPairIds)) {
    for (const item of record.matchedPairIds) {
      if (typeof item === 'string' && expectedSet.has(item)) {
        matchedSet.add(item);
      }
    }
  }

  const moves =
    typeof record.moves === 'number' && Number.isInteger(record.moves) && record.moves >= 0
      ? Math.min(record.moves, 9999)
      : 0;

  return {
    pairCount,
    deckPairIds,
    matchedPairIds: Array.from(matchedSet),
    moves,
  };
};

export const saveMemoryState = (profileId: string, state: SavedMemoryState): void => {
  writeJson(buildKey(profileId, 'memory'), state);
};

/* ---------- Mandala Coloring Persistence ---------- */

export interface SavedMandalaState {
  selectedColor: string;
  symmetryMode: boolean;
  fills: Record<string, string>;
}

export const loadMandalaState = (
  profileId: string,
  allowedHexSet: ReadonlySet<string>,
  allowedRegionIds: ReadonlySet<string>,
  defaultColor: string
): SavedMandalaState | null => {
  const raw = readJson(buildKey(profileId, 'mandala'));
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  const selectedColor =
    typeof record.selectedColor === 'string' && allowedHexSet.has(record.selectedColor)
      ? record.selectedColor
      : defaultColor;

  const symmetryMode = typeof record.symmetryMode === 'boolean' ? record.symmetryMode : true;

  const fills: Record<string, string> = {};
  if (record.fills && typeof record.fills === 'object' && !Array.isArray(record.fills)) {
    for (const [regionId, hex] of Object.entries(record.fills as Record<string, unknown>)) {
      if (allowedRegionIds.has(regionId) && typeof hex === 'string' && allowedHexSet.has(hex)) {
        fills[regionId] = hex;
      }
    }
  }

  return {
    selectedColor,
    symmetryMode,
    fills,
  };
};

export const saveMandalaState = (profileId: string, state: SavedMandalaState): void => {
  writeJson(buildKey(profileId, 'mandala'), state);
};

/* ---------- Calm Breathing Preference Persistence ---------- */

export type BreathingRhythmKey = 'gentle' | 'deep';

export const loadBreathingRhythm = (profileId: string): BreathingRhythmKey | null => {
  const raw = readJson(buildKey(profileId, 'breathing'));
  if (!raw || typeof raw !== 'object') return null;
  const rhythmKey = (raw as Record<string, unknown>).rhythmKey;
  return rhythmKey === 'gentle' || rhythmKey === 'deep' ? rhythmKey : null;
};

export const saveBreathingRhythm = (profileId: string, rhythmKey: BreathingRhythmKey): void => {
  writeJson(buildKey(profileId, 'breathing'), { rhythmKey });
};
