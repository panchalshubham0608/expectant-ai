import { doc, getDoc } from 'firebase/firestore';
import { getProfilesCollection } from '../../lib/collections';
import {
  generateDailyDigest,
  type DailyDigestCategory,
  type DailyDigestResponse,
} from '../ai/dailyDigestService';
import { getDailyDigest, saveDailyDigest, getRecentDailyDigests, getTodayDateId } from './dailyDigestsService';
import { getGeneratedBabyNames, saveGeneratedBabyNames } from './generatedBabyNamesService';
import { getPregnancyAge } from '../../utils/pregnancyUtils';
import type { DailyDigest } from '../../models/dailyDigest';

const CATEGORIES: DailyDigestCategory[] = [
  'baby-fact',
  'body-fact',
  'pregnancy-tip',
  'did-you-know',
  'milestone',
  'couple',
];

export type DailyDigestOverrideField = keyof DailyDigestResponse;

const inFlightGenerations = new Map<string, Promise<DailyDigest>>();

const isFieldPresent = (digest: DailyDigest | null, field: DailyDigestOverrideField): boolean => {
  if (!digest) return false;
  const val = digest[field];
  if (val === undefined || val === null) return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'string') return val.trim().length > 0;
  if (typeof val === 'object') return Object.values(val).some(v => typeof v === 'string' && v.trim().length > 0);
  return true;
};

export const generateAndSaveDailyDigestForToday = async (
  userId: string,
  profileId: string,
  userApiKey?: string,
  useCache: boolean = true,
  overrideFields?: DailyDigestOverrideField[]
): Promise<DailyDigest> => {
  const dateId = getTodayDateId();
  const inFlightKey = `${userId}:${profileId}:${dateId}`;

  if (useCache && inFlightGenerations.has(inFlightKey)) {
    return inFlightGenerations.get(inFlightKey)!;
  }

  const runGeneration = async (): Promise<DailyDigest> => {
    // 1. Fetch the user's profile to calculate pregnancy progress and read preferences
    const profileRef = doc(getProfilesCollection(userId), profileId);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      throw new Error('Profile not found.');
    }

    const profile = profileSnap.data();
    const babyNameContext = typeof profile.babyNameContext === 'string' ? profile.babyNameContext.trim() : '';
    const babyNameCount = typeof profile.babyNameCount === 'number' && profile.babyNameCount > 0 ? profile.babyNameCount : 0;
    const wantsBabyNames = Boolean(babyNameContext && babyNameCount > 0);
    const spiritualSlokaContext = typeof profile.spiritualSlokaContext === 'string' ? profile.spiritualSlokaContext.trim() : '';
    const wantsSpiritualSloka = Boolean(spiritualSlokaContext);

    // 2. Fetch existing digest for today to check cache and preserve non-overridden fields
    const existingDigest = await getDailyDigest(userId, profileId, dateId);
    const hasExistingMoment = isFieldPresent(existingDigest, 'card');
    const hasExistingBabyNames = isFieldPresent(existingDigest, 'babyNames');
    const hasExistingSpiritualSloka = isFieldPresent(existingDigest, 'spiritualSloka');

    if (useCache && existingDigest && hasExistingMoment) {
      if (
        (!wantsBabyNames || hasExistingBabyNames) &&
        (!wantsSpiritualSloka || hasExistingSpiritualSloka)
      ) {
        return existingDigest;
      }
    }

    // 3. Calculate Pregnancy Week and Day
    const age = getPregnancyAge(profile.lastMenstrualPeriod, profile.ultrasoundLastMenstrualPeriod);
    if (!age || age.isFuture) {
      throw new Error('Valid pregnancy start date not found in profile.');
    }
    const pregnancyWeek = age.weeks;
    const pregnancyDay = age.days;

    // 4. Select a random category
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

    // 5. Fetch recent digests and persisted generated names to avoid repetition
    const [recentDigestsList, persistedGeneratedNames] = await Promise.all([
      getRecentDailyDigests(userId, profileId, 30),
      wantsBabyNames ? getGeneratedBabyNames(userId, profileId) : Promise.resolve([]),
    ]);

    const recentMoments = recentDigestsList
      .filter(d => d.card?.title && d.card?.content)
      .map(d => `[${d.category}] ${d.card.title}: ${d.card.content}`);

    const recentBabyNames = Array.from(
      new Set(
        [
          ...persistedGeneratedNames,
          ...recentDigestsList.flatMap(d => d.babyNames?.map(b => b.name) ?? []),
        ].filter(Boolean)
      )
    );

    const recentSlokas = recentDigestsList
      .filter(d => d.spiritualSloka?.originalScript)
      .map(d => `${d.spiritualSloka!.source}: ${d.spiritualSloka!.originalScript}`);

    // 6. Generate digest (moment, baby names, and spiritual sloka if configured) using the AI Service
    const aiResponse = await generateDailyDigest(
      {
        pregnancyWeek,
        pregnancyDay,
        category,
        date: dateId,
        recentMoments,
        ...(wantsBabyNames
          ? {
              babyNameContext,
              babyNameCount,
              recentBabyNames,
            }
          : {}),
        ...(wantsSpiritualSloka
          ? {
              spiritualSlokaContext,
              recentSlokas,
            }
          : {}),
      },
      userApiKey
    );

    // 7. Resolve each field: override if missing on existingDigest, if overrideFields is omitted on force-refresh, or if listed in overrideFields
    const shouldOverride = (field: DailyDigestOverrideField): boolean =>
      !isFieldPresent(existingDigest, field) ||
      Boolean(overrideFields?.includes(field)) ||
      (!useCache && (!overrideFields || overrideFields.length === 0));

    const resolveField = <K extends DailyDigestOverrideField>(field: K): DailyDigestResponse[K] => {
      if (shouldOverride(field) || !existingDigest) {
        return aiResponse[field];
      }
      return existingDigest[field] ?? aiResponse[field];
    };

    const resolvedSpiritualSloka = resolveField('spiritualSloka');

    const dailyDigest: DailyDigest = {
      category: resolveField('category'),
      header: resolveField('header'),
      notification: resolveField('notification'),
      card: resolveField('card'),
      emoji: resolveField('emoji'),
      babyNames: resolveField('babyNames') ?? [],
      ...(resolvedSpiritualSloka ? { spiritualSloka: resolvedSpiritualSloka } : {}),
      id: dateId,
      date: dateId,
      pregnancyWeek,
      pregnancyDay,
      createdAt: existingDigest?.createdAt ?? Date.now(),
    };

    await saveDailyDigest(userId, profileId, dailyDigest);

    if (shouldOverride('babyNames') && dailyDigest.babyNames && dailyDigest.babyNames.length > 0) {
      await saveGeneratedBabyNames(userId, profileId, dailyDigest.babyNames, dateId);
    }

    return dailyDigest;
  };

  const promise = runGeneration().finally(() => {
    if (inFlightGenerations.get(inFlightKey) === promise) {
      inFlightGenerations.delete(inFlightKey);
    }
  });

  if (useCache) {
    inFlightGenerations.set(inFlightKey, promise);
  }

  return promise;
};
