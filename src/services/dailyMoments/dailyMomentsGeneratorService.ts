import { doc, getDoc } from 'firebase/firestore';
import { getProfilesCollection } from '../../lib/collections';
import { generateDailyMoment, type DailyMomentCategory } from '../ai/dailyMomentService';
import { getDailyMoment, saveDailyMoment, getRecentDailyMoments } from './dailyMomentsService';
import { getPregnancyAge } from '../../utils/pregnancyUtils';
import type { DailyMoment } from '../../models/dailyMoment';

const CATEGORIES: DailyMomentCategory[] = [
  'baby-fact',
  'body-fact',
  'pregnancy-tip',
  'did-you-know',
  'milestone',
  'couple',
];

export const generateAndSaveDailyMomentForToday = async (
  userId: string,
  profileId: string,
  userApiKey?: string,
  useCache: boolean = true
): Promise<DailyMoment> => {
  // 1. Determine today's date in local time string YYYY-MM-DD
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateId = `${year}-${month}-${day}`;

  // 2. Check if a moment already exists for today to prevent duplicates
  if (useCache) {
    const existingMoment = await getDailyMoment(userId, profileId, dateId);
    if (existingMoment) {
      return existingMoment;
    }
  }

  // 3. Fetch the user's profile to calculate pregnancy progress
  const profileRef = doc(getProfilesCollection(userId), profileId);
  const profileSnap = await getDoc(profileRef);

  if (!profileSnap.exists()) {
    throw new Error('Profile not found.');
  }

  const profile = profileSnap.data();

  // 4. Calculate Pregnancy Week and Day
  const age = getPregnancyAge(profile.lastMenstrualPeriod, profile.ultrasoundLastMenstrualPeriod);
  if (!age || age.isFuture) {
    throw new Error('Valid pregnancy start date not found in profile.');
  }
  const pregnancyWeek = age.weeks;
  const pregnancyDay = age.days;

  // 5. Select a random category
  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

  // 6. Fetch recent moments to avoid repetition
  const recentMomentsList = await getRecentDailyMoments(userId, profileId, 30);
  const recentMoments = recentMomentsList.map(m => `[${m.category}] ${m.card.title}: ${m.card.content}`);

  // 7. Generate moment using the AI Service
  const aiResponse = await generateDailyMoment({ pregnancyWeek, pregnancyDay, category, date: dateId, recentMoments }, userApiKey);

  // 8. Save to Firestore and return
  const dailyMoment: DailyMoment = {
    ...aiResponse,
    id: dateId,
    date: dateId,
    pregnancyWeek,
    pregnancyDay,
    createdAt: Date.now(),
  };

  await saveDailyMoment(userId, profileId, dailyMoment);

  return dailyMoment;
};