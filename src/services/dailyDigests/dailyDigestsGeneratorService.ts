import { doc, getDoc } from 'firebase/firestore';
import { getProfilesCollection } from '../../lib/collections';
import { generateDailyDigest, type DailyDigestCategory } from '../ai/dailyDigestService';
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

const inFlightGenerations = new Map<string, Promise<DailyDigest>>();

export const generateAndSaveDailyDigestForToday = async (
  userId: string,
  profileId: string,
  userApiKey?: string,
  useCache: boolean = true
): Promise<DailyDigest> => {
  const dateId = getTodayDateId();
  const inFlightKey = `${userId}:${profileId}:${dateId}`;

  if (useCache && inFlightGenerations.has(inFlightKey)) {
    return inFlightGenerations.get(inFlightKey)!;
  }

  const runGeneration = async (): Promise<DailyDigest> => {
    // 1. Fetch the user's profile to calculate pregnancy progress and read baby name preferences
    const profileRef = doc(getProfilesCollection(userId), profileId);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      throw new Error('Profile not found.');
    }

    const profile = profileSnap.data();
    const babyNameContext = typeof profile.babyNameContext === 'string' ? profile.babyNameContext.trim() : '';
    const babyNameCount = typeof profile.babyNameCount === 'number' && profile.babyNameCount > 0 ? profile.babyNameCount : 0;
    const wantsBabyNames = Boolean(babyNameContext && babyNameCount > 0);

    // 2. Check if a digest already exists for today to prevent duplicates
    if (useCache) {
      const existingDigest = await getDailyDigest(userId, profileId, dateId);
      if (existingDigest) {
        const hasBabyNames = Array.isArray(existingDigest.babyNames) && existingDigest.babyNames.length > 0;
        if (!wantsBabyNames || hasBabyNames) {
          return existingDigest;
        }
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
      .filter(d => d.id !== dateId)
      .map(d => `[${d.category}] ${d.card.title}: ${d.card.content}`);

    const recentBabyNames = Array.from(
      new Set(
        [
          ...persistedGeneratedNames,
          ...recentDigestsList.flatMap(d => d.babyNames?.map(b => b.name) ?? []),
        ].filter(Boolean)
      )
    );

    // 6. Generate digest (moment and baby names if configured) using the AI Service
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
      },
      userApiKey
    );

    // 7. Save to Firestore and persist generated baby names to history collection
    const dailyDigest: DailyDigest = {
      category: aiResponse.category,
      header: aiResponse.header,
      notification: aiResponse.notification,
      card: aiResponse.card,
      emoji: aiResponse.emoji,
      babyNames: aiResponse.babyNames ?? [],
      id: dateId,
      date: dateId,
      pregnancyWeek,
      pregnancyDay,
      createdAt: Date.now(),
    };

    await saveDailyDigest(userId, profileId, dailyDigest);

    if (dailyDigest.babyNames && dailyDigest.babyNames.length > 0) {
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
