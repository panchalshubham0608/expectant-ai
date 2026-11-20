import { doc, getDoc } from 'firebase/firestore';
import { getProfilesCollection } from '../../lib/collections';
import {
  DEFAULT_DAILY_MIX_ALLOCATION,
  sanitizeDailyMindPuzzles,
  type DailyMindPuzzles,
  type DailyMixAllocation,
  type MindPuzzleKind,
} from '../../models/mindPuzzle';
import { getPregnancyAge } from '../../utils/pregnancyUtils';
import {
  computeDailyMixAllocation,
  loadMindPuzzlePreferences,
} from '../../utils/mindPuzzlePreferences';
import {
  generateMindPuzzlesSet,
  generateSingleMindPuzzle,
} from '../ai/mindPuzzleService';
import {
  getDailyDigest,
  getTodayDateId,
  updateDailyDigestMindPuzzles,
} from './dailyDigestsService';

const inFlightMindPuzzleEnsures = new Map<string, Promise<DailyMindPuzzles>>();

const getPregnancyWeekForProfile = async (
  userId: string,
  profileId: string
): Promise<number | undefined> => {
  try {
    const profileRef = doc(getProfilesCollection(userId), profileId);
    const profileSnap = await getDoc(profileRef);
    if (!profileSnap.exists()) return undefined;
    const profile = profileSnap.data();
    const age = getPregnancyAge(profile.lastMenstrualPeriod, profile.ultrasoundLastMenstrualPeriod);
    if (!age || age.isFuture) return undefined;
    return age.currentWeek;
  } catch {
    return undefined;
  }
};

const resolveTargetAllocation = (
  profileId: string,
  overrideAllocation?: DailyMixAllocation
): DailyMixAllocation => {
  if (overrideAllocation) return overrideAllocation;
  try {
    const prefs = loadMindPuzzlePreferences(profileId);
    return computeDailyMixAllocation(prefs);
  } catch {
    return DEFAULT_DAILY_MIX_ALLOCATION;
  }
};

const hasFullDailyPuzzleSet = (
  puzzles: DailyMindPuzzles | undefined,
  allocation: DailyMixAllocation
): boolean =>
  Boolean(
    puzzles &&
      puzzles.fiveClues.length >= allocation.fiveClues &&
      puzzles.rebus.length >= allocation.rebus &&
      puzzles.wordScramble.length >= allocation.wordScramble &&
      puzzles.riddle.length >= allocation.riddle
  );

const mergePuzzleArrays = <T,>(existing: T[], generated: T[], targetCount: number): T[] => {
  if (targetCount <= 0) return existing;
  if (existing.length >= targetCount) return existing;
  return [...existing, ...generated].slice(0, targetCount);
};

/**
 * Ensures today's digest document has today's personalized AI mind puzzles populated.
 * If missing or partial (e.g. upgrading from an older schema), generates ONLY the missing
 * mindPuzzles (never regenerating the rest of the daily digest) and merges them into Firestore.
 */
export const ensureTodayMindPuzzles = async (
  userId: string,
  profileId: string,
  userApiKey?: string,
  allocationOverride?: DailyMixAllocation
): Promise<DailyMindPuzzles> => {
  const dateId = getTodayDateId();
  const inFlightKey = `${userId}:${profileId}:${dateId}`;

  if (inFlightMindPuzzleEnsures.has(inFlightKey)) {
    return inFlightMindPuzzleEnsures.get(inFlightKey)!;
  }

  const run = async (): Promise<DailyMindPuzzles> => {
    const targetAllocation = resolveTargetAllocation(profileId, allocationOverride);
    const existingDigest = await getDailyDigest(userId, profileId, dateId);
    const existingPuzzles = sanitizeDailyMindPuzzles(existingDigest?.mindPuzzles);

    if (existingPuzzles && hasFullDailyPuzzleSet(existingPuzzles, targetAllocation)) {
      return existingPuzzles;
    }

    // Request only the missing puzzle slots per variety so we avoid redundant tokens
    const neededAllocation: DailyMixAllocation = {
      fiveClues: Math.max(0, targetAllocation.fiveClues - (existingPuzzles?.fiveClues.length ?? 0)),
      rebus: Math.max(0, targetAllocation.rebus - (existingPuzzles?.rebus.length ?? 0)),
      wordScramble: Math.max(
        0,
        targetAllocation.wordScramble - (existingPuzzles?.wordScramble.length ?? 0)
      ),
      riddle: Math.max(0, targetAllocation.riddle - (existingPuzzles?.riddle.length ?? 0)),
    };

    const pregnancyWeek = await getPregnancyWeekForProfile(userId, profileId);
    const generated = await generateMindPuzzlesSet(
      { pregnancyWeek, allocation: neededAllocation },
      userApiKey
    );

    const merged: DailyMindPuzzles = {
      fiveClues: mergePuzzleArrays(
        existingPuzzles?.fiveClues ?? [],
        generated.fiveClues,
        targetAllocation.fiveClues
      ),
      rebus: mergePuzzleArrays(
        existingPuzzles?.rebus ?? [],
        generated.rebus,
        targetAllocation.rebus
      ),
      wordScramble: mergePuzzleArrays(
        existingPuzzles?.wordScramble ?? [],
        generated.wordScramble,
        targetAllocation.wordScramble
      ),
      riddle: mergePuzzleArrays(
        existingPuzzles?.riddle ?? [],
        generated.riddle,
        targetAllocation.riddle
      ),
      updatedAt: Date.now(),
    };

    await updateDailyDigestMindPuzzles(userId, profileId, dateId, merged);
    return merged;
  };

  const promise = run().finally(() => {
    if (inFlightMindPuzzleEnsures.get(inFlightKey) === promise) {
      inFlightMindPuzzleEnsures.delete(inFlightKey);
    }
  });

  inFlightMindPuzzleEnsures.set(inFlightKey, promise);
  return promise;
};

/**
 * Regenerates ONLY ONE specific puzzle (by category and index) via Gemini
 * and updates ONLY mindPuzzles on today's digest document without touching
 * the other puzzles or the rest of the daily digest.
 */
export const regenerateMindPuzzleAt = async (
  userId: string,
  profileId: string,
  kind: MindPuzzleKind,
  index: number,
  avoidTitles?: string[],
  userApiKey?: string
): Promise<DailyMindPuzzles> => {
  const dateId = getTodayDateId();
  const [existingDigest, pregnancyWeek] = await Promise.all([
    getDailyDigest(userId, profileId, dateId),
    getPregnancyWeekForProfile(userId, profileId),
  ]);

  const existingPuzzles: DailyMindPuzzles = sanitizeDailyMindPuzzles(
    existingDigest?.mindPuzzles
  ) ?? {
    fiveClues: [],
    rebus: [],
    wordScramble: [],
    riddle: [],
  };

  const freshPuzzle = await generateSingleMindPuzzle(
    kind,
    { pregnancyWeek, avoidTitles },
    userApiKey
  );

  const replaceAt = <T,>(list: T[], item: T, idx: number): T[] => {
    const copy = [...list];
    if (idx >= 0 && idx < copy.length) {
      copy[idx] = item;
    } else {
      copy.push(item);
    }
    return copy;
  };

  const nextPuzzles: DailyMindPuzzles = {
    fiveClues:
      kind === 'fiveClues'
        ? replaceAt(existingPuzzles.fiveClues, freshPuzzle as DailyMindPuzzles['fiveClues'][number], index)
        : existingPuzzles.fiveClues,
    rebus:
      kind === 'rebus'
        ? replaceAt(existingPuzzles.rebus, freshPuzzle as DailyMindPuzzles['rebus'][number], index)
        : existingPuzzles.rebus,
    wordScramble:
      kind === 'wordScramble'
        ? replaceAt(
            existingPuzzles.wordScramble,
            freshPuzzle as DailyMindPuzzles['wordScramble'][number],
            index
          )
        : existingPuzzles.wordScramble,
    riddle:
      kind === 'riddle'
        ? replaceAt(existingPuzzles.riddle, freshPuzzle as DailyMindPuzzles['riddle'][number], index)
        : existingPuzzles.riddle,
    updatedAt: Date.now(),
  };

  await updateDailyDigestMindPuzzles(userId, profileId, dateId, nextPuzzles);
  return nextPuzzles;
};

/**
 * Regenerates a fresh personalized batch of AI mind puzzles on demand
 * without regenerating the rest of the daily digest.
 */
export const regenerateAllMindPuzzles = async (
  userId: string,
  profileId: string,
  userApiKey?: string,
  allocationOverride?: DailyMixAllocation
): Promise<DailyMindPuzzles> => {
  const dateId = getTodayDateId();
  const targetAllocation = resolveTargetAllocation(profileId, allocationOverride);
  const pregnancyWeek = await getPregnancyWeekForProfile(userId, profileId);
  const freshSet = await generateMindPuzzlesSet(
    { pregnancyWeek, allocation: targetAllocation },
    userApiKey
  );

  await updateDailyDigestMindPuzzles(userId, profileId, dateId, freshSet);
  return freshSet;
};
