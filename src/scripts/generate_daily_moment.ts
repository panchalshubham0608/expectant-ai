import { generateAndSaveDailyMomentForToday } from '../services/dailyMoments/dailyMomentsGeneratorService';

// Type definition for the array format: [userId, profileId, userApiKey (optional)]
export type DailyMomentTarget = [string, string, string?];

export const executeGeneration = async (targets: DailyMomentTarget[]) => {
  console.log(`Starting daily moment generation for ${targets.length} targets...`);

  for (const [userId, profileId, userApiKey] of targets) {
    try {
      console.log(`[Processing] User: ${userId} | Profile: ${profileId}`);
      const moment = await generateAndSaveDailyMomentForToday(userId, profileId, userApiKey);
      console.log(`✅ [Success] Generated '${moment.category}' for week ${moment.pregnancyWeek}, day ${moment.pregnancyDay}.`);
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
  // Hardcode targets here when running manually, or fetch them dynamically.
  const TARGETS: DailyMomentTarget[] = [
    // ['YOUR_USER_ID', 'YOUR_PROFILE_ID', 'OPTIONAL_API_KEY'],
  ];

  if (TARGETS.length === 0) {
    console.warn('⚠️ No targets defined in TARGETS array. Please add [userId, profileId] tuples to run the script.');
  } else {
    executeGeneration(TARGETS).then(() => process.exit(0)).catch(() => process.exit(1));
  }
}