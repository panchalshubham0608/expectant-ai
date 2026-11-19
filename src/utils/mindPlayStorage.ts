import type { SudokuBoard, SudokuSize } from './sudokuGenerator';
import {
  ALLOWED_STARLIGHT_TOKEN_IDS,
  areCellsAdjacent,
  type StarlightBoard,
  type StarlightGridSize,
  type StarlightPair,
  type StarlightTokenId,
} from './starlightPathsGenerator';
import {
  ALLOWED_TEA_COLOR_IDS,
  TEA_JAR_CAPACITY,
  type TeaColorId,
  type TeaJar,
  type TeaPourDifficulty,
} from './teaPourGenerator';

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
export type BonusGameKind = 'starlight-paths' | 'tea-pour';

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
const ALLOWED_BONUS_GAMES = new Set<BonusGameKind>(['starlight-paths', 'tea-pour']);

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

/* ---------- Starlight Paths Persistence ---------- */

export interface SavedStarlightPathsState {
  board: StarlightBoard;
  paths: Record<string, number[]>;
}

const isValidCellPath = (
  raw: unknown,
  size: StarlightGridSize,
  maxCells: number
): raw is number[] => {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > maxCells) return false;
  const seen = new Set<number>();
  for (let i = 0; i < raw.length; i++) {
    const cell = raw[i];
    if (typeof cell !== 'number' || !Number.isInteger(cell) || cell < 0 || cell >= maxCells) {
      return false;
    }
    if (seen.has(cell)) return false;
    seen.add(cell);
    if (i > 0 && !areCellsAdjacent(raw[i - 1], cell, size)) return false;
  }
  return true;
};

export const loadStarlightPathsState = (profileId: string): SavedStarlightPathsState | null => {
  const raw = readJson(buildKey(profileId, 'starlight-paths'));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const record = raw as Record<string, unknown>;
  const rawBoard = record.board;
  if (!rawBoard || typeof rawBoard !== 'object' || Array.isArray(rawBoard)) return null;

  const b = rawBoard as Record<string, unknown>;
  const size =
    b.size === 5 || b.size === 6 || b.size === 7 || b.size === 8
      ? (b.size as StarlightGridSize)
      : null;
  if (!size) return null;
  const maxCells = size * size;

  if (!Array.isArray(b.pairs) || b.pairs.length < 3 || b.pairs.length > 8) return null;
  const rawSolution = b.solution;
  if (!rawSolution || typeof rawSolution !== 'object' || Array.isArray(rawSolution)) return null;

  const pairs: StarlightPair[] = [];
  const solution: Record<string, number[]> = {};
  const seenTokens = new Set<string>();
  const seenEndpoints = new Set<number>();

  for (const item of b.pairs) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const p = item as Record<string, unknown>;
    if (
      typeof p.tokenId !== 'string' ||
      !ALLOWED_STARLIGHT_TOKEN_IDS.has(p.tokenId) ||
      seenTokens.has(p.tokenId)
    ) {
      return null;
    }
    if (
      typeof p.start !== 'number' ||
      typeof p.end !== 'number' ||
      !Number.isInteger(p.start) ||
      !Number.isInteger(p.end) ||
      p.start < 0 ||
      p.start >= maxCells ||
      p.end < 0 ||
      p.end >= maxCells ||
      p.start === p.end ||
      seenEndpoints.has(p.start) ||
      seenEndpoints.has(p.end)
    ) {
      return null;
    }

    const solPath = (rawSolution as Record<string, unknown>)[p.tokenId];
    if (!isValidCellPath(solPath, size, maxCells)) return null;
    if (solPath[0] !== p.start || solPath[solPath.length - 1] !== p.end) return null;

    seenTokens.add(p.tokenId);
    seenEndpoints.add(p.start);
    seenEndpoints.add(p.end);
    pairs.push({
      tokenId: p.tokenId as StarlightTokenId,
      start: p.start,
      end: p.end,
    });
    solution[p.tokenId] = [...solPath];
  }

  const paths: Record<string, number[]> = {};
  const occupiedCells = new Set<number>();
  if (record.paths && typeof record.paths === 'object' && !Array.isArray(record.paths)) {
    for (const pair of pairs) {
      const candidate = (record.paths as Record<string, unknown>)[pair.tokenId];
      if (!isValidCellPath(candidate, size, maxCells)) continue;
      if (candidate[0] !== pair.start && candidate[0] !== pair.end) continue;
      // Ensure no overlap with previously restored paths or other pairs' endpoints
      const overlaps = candidate.some(
        (cell) =>
          occupiedCells.has(cell) ||
          (seenEndpoints.has(cell) && cell !== pair.start && cell !== pair.end)
      );
      if (overlaps) continue;
      candidate.forEach((c) => occupiedCells.add(c));
      paths[pair.tokenId] = [...candidate];
    }
  }

  return {
    board: { size, pairs, solution },
    paths,
  };
};

export const saveStarlightPathsState = (
  profileId: string,
  state: SavedStarlightPathsState
): void => {
  writeJson(buildKey(profileId, 'starlight-paths'), state);
};

/* ---------- Watercolor Pour Sort Persistence ---------- */

export interface SavedTeaPourState {
  difficulty: TeaPourDifficulty;
  initialJars: TeaJar[];
  jars: TeaJar[];
}

const sanitizeTeaJars = (raw: unknown, difficulty: TeaPourDifficulty): TeaJar[] | null => {
  if (!Array.isArray(raw) || raw.length !== difficulty + 2) return null;
  const counts = new Map<string, number>();
  const jars: TeaJar[] = [];

  for (const rawJar of raw) {
    if (!Array.isArray(rawJar) || rawJar.length > TEA_JAR_CAPACITY) return null;
    const jar: TeaJar = [];
    for (const entry of rawJar) {
      if (typeof entry !== 'string' || !ALLOWED_TEA_COLOR_IDS.has(entry)) return null;
      counts.set(entry, (counts.get(entry) ?? 0) + 1);
      jar.push(entry as TeaColorId);
    }
    jars.push(jar);
  }

  if (counts.size !== difficulty) return null;
  for (const count of counts.values()) {
    if (count !== TEA_JAR_CAPACITY) return null;
  }

  return jars;
};

export const loadTeaPourState = (profileId: string): SavedTeaPourState | null => {
  const raw = readJson(buildKey(profileId, 'tea-pour'));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const record = raw as Record<string, unknown>;
  const difficulty =
    record.difficulty === 4 ||
    record.difficulty === 5 ||
    record.difficulty === 6 ||
    record.difficulty === 7 ||
    record.difficulty === 8
      ? (record.difficulty as TeaPourDifficulty)
      : null;
  if (!difficulty) return null;

  const initialJars = sanitizeTeaJars(record.initialJars, difficulty);
  const jars = sanitizeTeaJars(record.jars, difficulty);
  if (!initialJars || !jars) return null;

  return { difficulty, initialJars, jars };
};

export const saveTeaPourState = (profileId: string, state: SavedTeaPourState): void => {
  writeJson(buildKey(profileId, 'tea-pour'), state);
};
