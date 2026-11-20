import {
  ALL_MIND_PUZZLE_KINDS,
  DEFAULT_DAILY_MIX_ALLOCATION,
  MAX_PUZZLES_PER_KIND,
  type DailyMixAllocation,
  type MindPuzzleKind,
} from '../models/mindPuzzle';

export type PuzzleKindPreferenceMode = 'auto' | 'favorite' | 'hidden';

export interface MindPuzzlePreferences {
  /** Quietly learned affinity per puzzle kind (clamped to [-4, +8]). Never shown as raw numbers. */
  affinity: Record<MindPuzzleKind, number>;
  /** Manual user overrides from "Customize mix": auto, favorite, or hidden. */
  overrides: Record<MindPuzzleKind, PuzzleKindPreferenceMode>;
  updatedAt: number;
}

const PREFS_STORAGE_PREFIX = 'mindPlay:puzzlePrefs';
const MIN_AFFINITY = -4;
const MAX_AFFINITY = 8;
const RECENCY_DECAY = 0.94;
const SOLVE_BOOST = 1.0;
const SKIP_NUDGE = -0.35;
const FILTER_INTEREST_NUDGE = 0.2;

const ALLOWED_MODES = new Set<PuzzleKindPreferenceMode>(['auto', 'favorite', 'hidden']);

export const createDefaultMindPuzzlePreferences = (): MindPuzzlePreferences => ({
  affinity: {
    fiveClues: 0,
    rebus: 0,
    wordScramble: 0,
    riddle: 0,
  },
  overrides: {
    fiveClues: 'auto',
    rebus: 'auto',
    wordScramble: 'auto',
    riddle: 'auto',
  },
  updatedAt: 0,
});

const clampAffinity = (val: number): number =>
  Math.round(Math.max(MIN_AFFINITY, Math.min(MAX_AFFINITY, val)) * 100) / 100;

const readStorage = (key: string): unknown => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: unknown): void => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or private-mode errors
  }
};

const ensureAtLeastOneEnabled = (
  overrides: Record<MindPuzzleKind, PuzzleKindPreferenceMode>
): Record<MindPuzzleKind, PuzzleKindPreferenceMode> => {
  const hasEnabled = ALL_MIND_PUZZLE_KINDS.some((kind) => overrides[kind] !== 'hidden');
  if (hasEnabled) return overrides;
  return {
    fiveClues: 'auto',
    rebus: 'auto',
    wordScramble: 'auto',
    riddle: 'auto',
  };
};

export const sanitizeMindPuzzlePreferences = (raw: unknown): MindPuzzlePreferences => {
  const defaults = createDefaultMindPuzzlePreferences();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaults;
  }

  const record = raw as Record<string, unknown>;
  const rawAffinity =
    record.affinity && typeof record.affinity === 'object' && !Array.isArray(record.affinity)
      ? (record.affinity as Record<string, unknown>)
      : {};
  const rawOverrides =
    record.overrides && typeof record.overrides === 'object' && !Array.isArray(record.overrides)
      ? (record.overrides as Record<string, unknown>)
      : {};

  const affinity = { ...defaults.affinity };
  const overrides = { ...defaults.overrides };

  for (const kind of ALL_MIND_PUZZLE_KINDS) {
    const score = rawAffinity[kind];
    if (typeof score === 'number' && Number.isFinite(score)) {
      affinity[kind] = clampAffinity(score);
    }

    const mode = rawOverrides[kind];
    if (typeof mode === 'string' && ALLOWED_MODES.has(mode as PuzzleKindPreferenceMode)) {
      overrides[kind] = mode as PuzzleKindPreferenceMode;
    }
  }

  const updatedAt =
    typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt) && record.updatedAt >= 0
      ? record.updatedAt
      : 0;

  return {
    affinity,
    overrides: ensureAtLeastOneEnabled(overrides),
    updatedAt,
  };
};

export const loadMindPuzzlePreferences = (
  profileId: string | undefined
): MindPuzzlePreferences => {
  if (!profileId) return createDefaultMindPuzzlePreferences();
  const raw = readStorage(`${PREFS_STORAGE_PREFIX}:${profileId}`);
  return sanitizeMindPuzzlePreferences(raw);
};

export const saveMindPuzzlePreferences = (
  profileId: string,
  prefs: MindPuzzlePreferences
): MindPuzzlePreferences => {
  const cleaned = sanitizeMindPuzzlePreferences({
    ...prefs,
    updatedAt: Date.now(),
  });
  writeStorage(`${PREFS_STORAGE_PREFIX}:${profileId}`, cleaned);
  return cleaned;
};

const applyQuietSignal = (
  profileId: string,
  kind: MindPuzzleKind,
  delta: number,
  applyDecay: boolean
): MindPuzzlePreferences => {
  const current = loadMindPuzzlePreferences(profileId);
  const nextAffinity = { ...current.affinity };

  if (applyDecay) {
    for (const k of ALL_MIND_PUZZLE_KINDS) {
      nextAffinity[k] = clampAffinity(nextAffinity[k] * RECENCY_DECAY);
    }
  }

  nextAffinity[kind] = clampAffinity(nextAffinity[kind] + delta);

  return saveMindPuzzlePreferences(profileId, {
    ...current,
    affinity: nextAffinity,
  });
};

export const recordPuzzleSolvedSignal = (
  profileId: string,
  kind: MindPuzzleKind
): MindPuzzlePreferences => applyQuietSignal(profileId, kind, SOLVE_BOOST, true);

export const recordPuzzleSkippedSignal = (
  profileId: string,
  kind: MindPuzzleKind
): MindPuzzlePreferences => applyQuietSignal(profileId, kind, SKIP_NUDGE, false);

export const recordPuzzleFilterInterestSignal = (
  profileId: string,
  kind: MindPuzzleKind
): MindPuzzlePreferences => applyQuietSignal(profileId, kind, FILTER_INTEREST_NUDGE, false);

export const resetMindPuzzlePreferences = (profileId: string): MindPuzzlePreferences => {
  const fresh = createDefaultMindPuzzlePreferences();
  return saveMindPuzzlePreferences(profileId, fresh);
};

export const hasPersonalizedMix = (prefs: MindPuzzlePreferences): boolean => {
  const hasOverride = ALL_MIND_PUZZLE_KINDS.some((kind) => prefs.overrides[kind] !== 'auto');
  if (hasOverride) return true;
  const scores = ALL_MIND_PUZZLE_KINDS.map((kind) => prefs.affinity[kind]);
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  return max - min >= 0.75;
};

/**
 * Computes how many puzzles of each variety to include in a daily batch.
 * - Cold start: balanced 3 × 4 = 12 puzzles.
 * - Personalized: ~75% weighted toward favorites / high-affinity styles, while preserving
 *   at least 1 fresh slot for every non-hidden style so variety never goes stale.
 * - Hidden styles always get 0 slots.
 */
export const computeDailyMixAllocation = (
  prefs: MindPuzzlePreferences
): DailyMixAllocation => {
  const enabledKinds = ALL_MIND_PUZZLE_KINDS.filter(
    (kind) => prefs.overrides[kind] !== 'hidden'
  );

  if (enabledKinds.length === 0) {
    return { ...DEFAULT_DAILY_MIX_ALLOCATION };
  }

  // Keep daily pack sizes sensible even if user hides multiple varieties
  const targetTotal =
    enabledKinds.length >= 3 ? 12 : enabledKinds.length === 2 ? 10 : 6;
  const perKindCap =
    enabledKinds.length >= 3 ? 6 : enabledKinds.length === 2 ? 7 : MAX_PUZZLES_PER_KIND;

  const allocation: DailyMixAllocation = {
    fiveClues: 0,
    rebus: 0,
    wordScramble: 0,
    riddle: 0,
  };

  if (enabledKinds.length === 1) {
    allocation[enabledKinds[0]] = targetTotal;
    return allocation;
  }

  // Check if preferences are still completely neutral across enabled kinds
  const isNeutral = enabledKinds.every(
    (kind) => prefs.overrides[kind] === 'auto' && Math.abs(prefs.affinity[kind]) < 0.25
  );
  if (isNeutral && enabledKinds.length === ALL_MIND_PUZZLE_KINDS.length) {
    return { ...DEFAULT_DAILY_MIX_ALLOCATION };
  }

  // Reserve 1 exploration slot per enabled kind so non-hidden varieties stay discoverable
  for (const kind of enabledKinds) {
    allocation[kind] = 1;
  }

  let remaining = targetTotal - enabledKinds.length;

  const weights: Record<MindPuzzleKind, number> = {
    fiveClues: 0,
    rebus: 0,
    wordScramble: 0,
    riddle: 0,
  };

  for (const kind of enabledKinds) {
    const clampedScore = Math.max(-2.0, Math.min(5.0, prefs.affinity[kind]));
    let weight = 3.0 + clampedScore; // [1.0 .. 8.0]
    if (prefs.overrides[kind] === 'favorite') {
      weight *= 1.75;
    }
    weights[kind] = Math.max(0.75, weight);
  }

  // Largest Remainder (Hamilton) distribution with cap handling
  while (remaining > 0) {
    const eligible = enabledKinds.filter((kind) => allocation[kind] < perKindCap);
    if (eligible.length === 0) break;

    const totalWeight = eligible.reduce((sum, kind) => sum + weights[kind], 0);
    if (totalWeight <= 0) break;

    const shares = eligible.map((kind) => {
      const exact = (weights[kind] / totalWeight) * remaining;
      const room = perKindCap - allocation[kind];
      const base = Math.min(room, Math.floor(exact));
      return {
        kind,
        base,
        remainder: exact - Math.floor(exact),
      };
    });

    let distributed = 0;
    for (const entry of shares) {
      allocation[entry.kind] += entry.base;
      distributed += entry.base;
    }
    remaining -= distributed;

    if (remaining <= 0) break;

    // Distribute leftover slots by highest fractional remainder (tie-break by weight, then canonical order)
    const ranked = [...shares]
      .filter((entry) => allocation[entry.kind] < perKindCap)
      .sort((a, b) => {
        if (Math.abs(b.remainder - a.remainder) > 1e-6) return b.remainder - a.remainder;
        if (Math.abs(weights[b.kind] - weights[a.kind]) > 1e-6) {
          return weights[b.kind] - weights[a.kind];
        }
        return ALL_MIND_PUZZLE_KINDS.indexOf(a.kind) - ALL_MIND_PUZZLE_KINDS.indexOf(b.kind);
      });

    if (ranked.length === 0) break;

    let addedThisPass = 0;
    for (const entry of ranked) {
      if (remaining <= 0) break;
      if (allocation[entry.kind] < perKindCap) {
        allocation[entry.kind] += 1;
        remaining -= 1;
        addedThisPass += 1;
      }
    }
    if (addedThisPass === 0) break;
  }

  return allocation;
};
