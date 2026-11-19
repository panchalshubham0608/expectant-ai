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
}

export const loadMemoryState = (
  profileId: string,
  allowedPairIdsSet: ReadonlySet<string>
): SavedMemoryState | null => {
  const raw = readJson(buildKey(profileId, 'memory'));
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  const pairCount = record.pairCount;
  if (pairCount !== 6 && pairCount !== 8) return null;

  if (!Array.isArray(record.deckPairIds) || record.deckPairIds.length !== pairCount * 2) {
    return null;
  }

  const counts = new Map<string, number>();
  const deckPairIds: string[] = [];
  for (const item of record.deckPairIds) {
    if (typeof item !== 'string' || !allowedPairIdsSet.has(item)) return null;
    counts.set(item, (counts.get(item) ?? 0) + 1);
    deckPairIds.push(item);
  }

  // Must contain exactly pairCount distinct items, each appearing twice
  if (counts.size !== pairCount) return null;
  for (const count of counts.values()) {
    if (count !== 2) return null;
  }

  const matchedSet = new Set<string>();
  if (Array.isArray(record.matchedPairIds)) {
    for (const item of record.matchedPairIds) {
      if (typeof item === 'string' && counts.has(item)) {
        matchedSet.add(item);
      }
    }
  }

  return {
    pairCount,
    deckPairIds,
    matchedPairIds: Array.from(matchedSet),
  };
};

export const saveMemoryState = (profileId: string, state: SavedMemoryState): void => {
  writeJson(buildKey(profileId, 'memory'), state);
};

/* ---------- Mandala Coloring Persistence ---------- */

export interface SavedMandalaState {
  designId: string;
  selectedColor: string;
  symmetryMode: boolean;
  fillsByDesign: Record<string, Record<string, string>>;
}

const MAX_SAVED_MANDALA_DESIGNS = 25;

const sanitizeFillsMap = (
  raw: unknown,
  allowedHexSet: ReadonlySet<string>,
  allowedRegionIds: ReadonlySet<string>
): Record<string, string> => {
  const fills: Record<string, string> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fills;
  for (const [regionId, hex] of Object.entries(raw as Record<string, unknown>)) {
    if (allowedRegionIds.has(regionId) && typeof hex === 'string' && allowedHexSet.has(hex)) {
      fills[regionId] = hex;
    }
  }
  return fills;
};

export const loadMandalaState = (
  profileId: string,
  allowedHexSet: ReadonlySet<string>,
  getRegionIdsForDesignId: (designId: string) => ReadonlySet<string> | null,
  defaultDesignId: string,
  defaultColor: string
): SavedMandalaState | null => {
  const raw = readJson(buildKey(profileId, 'mandala'));
  if (!raw || typeof raw !== 'object') return null;

  const record = raw as Record<string, unknown>;
  const designId =
    typeof record.designId === 'string' && getRegionIdsForDesignId(record.designId)
      ? record.designId
      : defaultDesignId;

  const selectedColor =
    typeof record.selectedColor === 'string' && allowedHexSet.has(record.selectedColor)
      ? record.selectedColor
      : defaultColor;

  const symmetryMode = typeof record.symmetryMode === 'boolean' ? record.symmetryMode : true;

  const fillsByDesign: Record<string, Record<string, string>> = {};
  if (
    record.fillsByDesign &&
    typeof record.fillsByDesign === 'object' &&
    !Array.isArray(record.fillsByDesign)
  ) {
    let kept = 0;
    for (const [dId, rawFills] of Object.entries(
      record.fillsByDesign as Record<string, unknown>
    )) {
      const regionIds = getRegionIdsForDesignId(dId);
      if (!regionIds) continue;
      const cleaned = sanitizeFillsMap(rawFills, allowedHexSet, regionIds);
      if (Object.keys(cleaned).length > 0) {
        fillsByDesign[dId] = cleaned;
        kept++;
        if (kept >= MAX_SAVED_MANDALA_DESIGNS) break;
      }
    }
  } else if (record.fills) {
    // Graceful migration from earlier single-design saves
    const regionIds = getRegionIdsForDesignId(designId);
    if (regionIds) {
      const cleaned = sanitizeFillsMap(record.fills, allowedHexSet, regionIds);
      if (Object.keys(cleaned).length > 0) {
        fillsByDesign[designId] = cleaned;
      }
    }
  }

  return {
    designId,
    selectedColor,
    symmetryMode,
    fillsByDesign,
  };
};

export const saveMandalaState = (profileId: string, state: SavedMandalaState): void => {
  const entries = Object.entries(state.fillsByDesign).filter(
    ([, fills]) => Object.keys(fills).length > 0
  );
  const trimmedEntries = entries.slice(-MAX_SAVED_MANDALA_DESIGNS);
  writeJson(buildKey(profileId, 'mandala'), {
    designId: state.designId,
    selectedColor: state.selectedColor,
    symmetryMode: state.symmetryMode,
    fillsByDesign: Object.fromEntries(trimmedEntries),
  });
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

/* ---------- MindPlay Navigation Category Persistence ---------- */

export type MindPlayMainTab = 'ai' | 'builtin';
export type MindPlayPuzzleFilter = 'all' | 'connections' | 'wordScramble' | 'riddle';
export type MindPlayBuiltInKind = 'sudoku' | 'memory' | 'mandala' | 'breathing' | 'surprise';
export type BonusGameKind =
  | 'starlight-paths'
  | 'tea-pour'
  | 'nursery-decorator'
  | 'lullaby-chimes'
  | 'star-constellations'
  | 'wishes-jar'
  | 'pastel-gradient'
  | 'picture-cross'
  | 'zen-pond';

export interface SavedMindPlayNavState {
  activeTab: MindPlayMainTab;
  puzzleFilter: MindPlayPuzzleFilter;
  activeBuiltIn: MindPlayBuiltInKind;
  activeBonusGame: BonusGameKind;
}

const NAV_STORAGE_PREFIX = 'mindPlay:nav';

const ALLOWED_MAIN_TABS = new Set<MindPlayMainTab>(['ai', 'builtin']);
const ALLOWED_PUZZLE_FILTERS = new Set<MindPlayPuzzleFilter>([
  'all',
  'connections',
  'wordScramble',
  'riddle',
]);
const ALLOWED_BUILTIN_KINDS = new Set<MindPlayBuiltInKind>([
  'sudoku',
  'memory',
  'mandala',
  'breathing',
  'surprise',
]);
const ALLOWED_BONUS_GAMES = new Set<BonusGameKind>([
  'starlight-paths',
  'tea-pour',
  'nursery-decorator',
  'lullaby-chimes',
  'star-constellations',
  'wishes-jar',
  'pastel-gradient',
  'picture-cross',
  'zen-pond',
]);

const DEFAULT_MINDPLAY_NAV_STATE: SavedMindPlayNavState = {
  activeTab: 'ai',
  puzzleFilter: 'all',
  activeBuiltIn: 'sudoku',
  activeBonusGame: 'starlight-paths',
};

export const loadMindPlayNavState = (profileId: string | undefined): SavedMindPlayNavState => {
  if (!profileId) return DEFAULT_MINDPLAY_NAV_STATE;
  const raw = readJson(`${NAV_STORAGE_PREFIX}:${profileId}`);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return DEFAULT_MINDPLAY_NAV_STATE;
  }

  const record = raw as Record<string, unknown>;
  const activeTab =
    typeof record.activeTab === 'string' &&
    ALLOWED_MAIN_TABS.has(record.activeTab as MindPlayMainTab)
      ? (record.activeTab as MindPlayMainTab)
      : DEFAULT_MINDPLAY_NAV_STATE.activeTab;

  const puzzleFilter =
    typeof record.puzzleFilter === 'string' &&
    ALLOWED_PUZZLE_FILTERS.has(record.puzzleFilter as MindPlayPuzzleFilter)
      ? (record.puzzleFilter as MindPlayPuzzleFilter)
      : DEFAULT_MINDPLAY_NAV_STATE.puzzleFilter;

  const activeBuiltIn =
    typeof record.activeBuiltIn === 'string' &&
    ALLOWED_BUILTIN_KINDS.has(record.activeBuiltIn as MindPlayBuiltInKind)
      ? (record.activeBuiltIn as MindPlayBuiltInKind)
      : DEFAULT_MINDPLAY_NAV_STATE.activeBuiltIn;

  const activeBonusGame =
    typeof record.activeBonusGame === 'string' &&
    ALLOWED_BONUS_GAMES.has(record.activeBonusGame as BonusGameKind)
      ? (record.activeBonusGame as BonusGameKind)
      : DEFAULT_MINDPLAY_NAV_STATE.activeBonusGame;

  return { activeTab, puzzleFilter, activeBuiltIn, activeBonusGame };
};

export const saveMindPlayNavState = (
  profileId: string,
  state: SavedMindPlayNavState
): void => {
  writeJson(`${NAV_STORAGE_PREFIX}:${profileId}`, state);
};
