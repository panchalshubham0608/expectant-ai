import { doc, getDoc } from 'firebase/firestore';
import { getProfilesCollection } from '../../lib/collections';
import {
  PUZZLES_PER_KIND,
  sanitizeDailyMindPuzzles,
  type DailyMindPuzzles,
  type MindPuzzleKind,
} from '../../models/mindPuzzle';
import { getPregnancyAge } from '../../utils/pregnancyUtils';
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

const hasFullDailyPuzzleSet = (puzzles: DailyMindPuzzles | undefined): boolean =>
  Boolean(
    puzzles &&
      puzzles.connections.length >= PUZZLES_PER_KIND &&
      puzzles.wordScramble.length >= PUZZLES_PER_KIND &&
      puzzles.riddle.length >= PUZZLES_PER_KIND
  );

const mergePuzzleArrays = <T,>(existing: T[], generated: T[], targetCount: number): T[] => {
  if (existing.length >= targetCount) return existing;
  return [...existing, ...generated].slice(0, targetCount);
};

/**
 * Ensures today's digest document has a full set of 12 AI mind puzzles populated (4 per category).
 * If missing or partial, generates ONLY the mindPuzzles (never regenerating the rest of the daily digest)
 * and merges them into Firestore.
 */
export const ensureTodayMindPuzzles = async (
  userId: string,
  profileId: string,
  userApiKey?: string
): Promise<DailyMindPuzzles> => {
  const dateId = getTodayDateId();
  const inFlightKey = `${userId}:${profileId}:${dateId}`;

  if (inFlightMindPuzzleEnsures.has(inFlightKey)) {
    return inFlightMindPuzzleEnsures.get(inFlightKey)!;
  }

  const run = async (): Promise<DailyMindPuzzles> => {
    const existingDigest = await getDailyDigest(userId, profileId, dateId);
    const existingPuzzles = sanitizeDailyMindPuzzles(existingDigest?.mindPuzzles);

    if (existingPuzzles && hasFullDailyPuzzleSet(existingPuzzles)) {
      return existingPuzzles;
    }

    const pregnancyWeek = await getPregnancyWeekForProfile(userId, profileId);
    const generated = await generateMindPuzzlesSet({ pregnancyWeek }, userApiKey);

    const merged: DailyMindPuzzles = {
      connections: mergePuzzleArrays(
        existingPuzzles?.connections ?? [],
        generated.connections,
        PUZZLES_PER_KIND
      ),
      wordScramble: mergePuzzleArrays(
        existingPuzzles?.wordScramble ?? [],
        generated.wordScramble,
        PUZZLES_PER_KIND
      ),
      riddle: mergePuzzleArrays(
        existingPuzzles?.riddle ?? [],
        generated.riddle,
        PUZZLES_PER_KIND
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
    connections: [],
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
    connections:
      kind === 'connections'
        ? replaceAt(existingPuzzles.connections, freshPuzzle as DailyMindPuzzles['connections'][number], index)
        : existingPuzzles.connections,
    wordScramble:
      kind === 'wordScramble'
        ? replaceAt(existingPuzzles.wordScramble, freshPuzzle as DailyMindPuzzles['wordScramble'][number], index)
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
 * Regenerates a fresh full batch of 12 AI mind puzzles on demand
 * without regenerating the rest of the daily digest.
 */
export const regenerateAllMindPuzzles = async (
  userId: string,
  profileId: string,
  userApiKey?: string
): Promise<DailyMindPuzzles> => {
  const dateId = getTodayDateId();
  const pregnancyWeek = await getPregnancyWeekForProfile(userId, profileId);
  const freshSet = await generateMindPuzzlesSet({ pregnancyWeek }, userApiKey);

  await updateDailyDigestMindPuzzles(userId, profileId, dateId, freshSet);
  return freshSet;
};
