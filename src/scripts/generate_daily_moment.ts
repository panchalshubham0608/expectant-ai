import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { generateDailyMoment, type DailyMomentCategory } from '../services/ai/dailyMomentService';
import { getPregnancyAge } from '../utils/pregnancyUtils';
import type { DailyMoment } from '../models/dailyMoment';

// Type definition for the array format: [userId, profileId, userApiKey (optional)]
export type DailyMomentTarget = [string, string, string?];

const CATEGORIES: DailyMomentCategory[] = [
  'baby-fact',
  'body-fact',
  'pregnancy-tip',
  'did-you-know',
  'milestone',
  'couple',
];

export const executeGeneration = async (targets: DailyMomentTarget[]) => {
  console.log(`Starting daily moment generation for ${targets.length} targets...`);

  // Initialize Firebase Admin (only once)
  if (getApps().length === 0) {
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      throw new Error('Firebase credentials environment variables are missing (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY).');
    }
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
  }

  const db = getFirestore();

  // 1. Determine today's date in local time string YYYY-MM-DD
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateId = `${year}-${month}-${day}`;

  for (const [userId, profileId, userApiKey] of targets) {
    try {
      console.log(`[Processing] User: ${userId} | Profile: ${profileId}`);

      // 2. Check if a moment already exists for today to prevent duplicates
      const momentRef = db.collection('users').doc(userId).collection('profiles').doc(profileId).collection('dailyMoments').doc(dateId);
      const momentSnap = await momentRef.get();

      if (momentSnap.exists) {
        console.log(`⏭️  [Skipped] Daily moment already exists for today.`);
        continue;
      }

      // 3. Fetch the user's profile to calculate pregnancy progress
      const profileSnap = await db.collection('users').doc(userId).collection('profiles').doc(profileId).get();

      if (!profileSnap.exists) {
        throw new Error('Profile not found.');
      }

      const profile = profileSnap.data();

      // 4. Calculate Pregnancy Week and Day
      const age = getPregnancyAge(profile?.lastMenstrualPeriod, profile?.ultrasoundLastMenstrualPeriod);
      if (!age || age.isFuture) {
        throw new Error('Valid pregnancy start date not found in profile.');
      }

      // 5. Select a random category
      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

      // 6. Generate moment using the AI Service
      const aiResponse = await generateDailyMoment({
        pregnancyWeek: age.weeks,
        pregnancyDay: age.days,
        category,
        date: dateId
      }, userApiKey);

      // 7. Save to Firestore and return
      const dailyMoment: DailyMoment = {
        ...aiResponse,
        id: dateId,
        date: dateId,
        pregnancyWeek: age.weeks,
        pregnancyDay: age.days,
        createdAt: Date.now(),
      };

      await momentRef.set(dailyMoment, { merge: true });

      console.log(`✅ [Success] Generated '${dailyMoment.category}' for week ${dailyMoment.pregnancyWeek}, day ${dailyMoment.pregnancyDay}.`);
    } catch (error: any) {
      console.error(`❌ [Error] Failed for User: ${userId} | Profile: ${profileId}. Reason:`, error.message || error);
    }
  }

  console.log('Daily moment generation run completed.');
};

// ============================================================================
// CLI Execution Block (Runs only when executed directly)
// ============================================================================
const isCLI = typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('generate_daily_moment');

if (isCLI) {
  let TARGETS: DailyMomentTarget[] = [];

  try {
    if (process.env.TARGETS_JSON) {
      TARGETS = JSON.parse(process.env.TARGETS_JSON) as DailyMomentTarget[];
      console.log(`Successfully parsed ${TARGETS.length} targets from environment.`);
    } else {
      // Fallback/Hardcoded targets here when running manually without env var
      TARGETS = [];
    }
  } catch (err) {
    console.error('❌ [Error] Failed to parse TARGETS_JSON from environment:', err);
    process.exit(1);
  }

  if (TARGETS.length === 0) {
    console.warn('⚠️ No targets defined in TARGETS array or TARGETS_JSON environment variable.');
  } else {
    executeGeneration(TARGETS).then(() => process.exit(0)).catch(() => process.exit(1));
  }
}