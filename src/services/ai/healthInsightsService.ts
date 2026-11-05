import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { getHealthSnapshotsCollection } from '../../lib/collections';
import type { DailyLog } from '../../models/dailylLog';
import type {
  ActivityStatusLevel,
  AIHealthActivityInsight,
} from '../../models/health';
import type { Measurement } from '../../models/measurement';
import type { Medication } from '../../models/medication';
import type { ExpectantProfile } from '../../models/profile';
import { HEALTH_INSIGHTS_PROMPT } from '../../prompts/health_insights';
import { getPregnancyAge } from '../../utils/pregnancyUtils';
import { DEFAULT_GEMINI_MODEL, getGeminiClient } from './geminiCore';

export interface GenerateHealthInsightInput {
  profile: ExpectantProfile;
  recentDailyLogs: DailyLog[];
  measurements?: Measurement[];
  medications?: Medication[];
}

const VALID_STATUS_LEVELS: ActivityStatusLevel[] = [
  'optimal',
  'steady',
  'gentle-needed',
  'rest-focused',
];

const toLocalDateKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateMaternalAge = (dateOfBirth?: string): number | undefined => {
  if (!dateOfBirth) return undefined;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age > 0 && age < 100 ? age : undefined;
};

const clampNumber = (val: unknown, min: number, max: number, fallback: number): number => {
  const num = typeof val === 'number' ? val : Number(val);
  if (Number.isNaN(num) || !Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
};

const sanitizeStringArray = (val: unknown, maxItems = 4): string[] => {
  if (!Array.isArray(val)) return [];
  return val
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
    .slice(0, maxItems);
};

export const generateHealthActivityInsight = async (
  input: GenerateHealthInsightInput,
  userApiKey?: string,
): Promise<AIHealthActivityInsight> => {
  const ai = getGeminiClient(userApiKey);
  const env =
    typeof process !== 'undefined' && process.env ? process.env : (import.meta as any).env;
  const model = env?.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  const { profile, recentDailyLogs, measurements = [], medications = [] } = input;
  const todayKey = toLocalDateKey();

  const age = getPregnancyAge(
    profile.lastMenstrualPeriod,
    profile.ultrasoundLastMenstrualPeriod,
  );
  const pregnancyWeek = age && !age.isFuture ? age.currentWeek : 1;
  const pregnancyDays = age && !age.isFuture ? age.days : 0;
  const trimester =
    pregnancyWeek < 14
      ? 'First trimester'
      : pregnancyWeek < 28
        ? 'Second trimester'
        : 'Third trimester';
  const maternalAge = calculateMaternalAge(profile.dateOfBirth);

  // Summarize last 7 days of physical activity
  const sortedLogs = [...recentDailyLogs]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 7);

  const activityDays = sortedLogs.map((log) => {
    const summary = log.activitySummary;
    const activities = log.activities ?? [];
    const manualSteps = activities
      .filter((a) => a.source !== 'google_health')
      .reduce((acc, a) => acc + (a.steps ?? 0), 0);
    const manualMins = activities
      .filter((a) => a.source !== 'google_health')
      .reduce((acc, a) => acc + (a.durationMinutes ?? 0), 0);
    const manualCalories = activities
      .filter((a) => a.source !== 'google_health')
      .reduce((acc, a) => acc + (a.caloriesKcal ?? 0), 0);

    const totalSteps = (summary?.steps ?? 0) + manualSteps;
    const totalActiveMinutes = (summary?.activeMinutes ?? 0) + manualMins;
    const totalDistanceKm = summary?.distanceKm ?? 0;
    const totalCaloriesKcal = (summary?.activeCaloriesKcal ?? 0) + manualCalories;

    return {
      date: log.date,
      steps: totalSteps,
      activeMinutes: totalActiveMinutes,
      distanceKm: totalDistanceKm,
      activeCaloriesKcal: totalCaloriesKcal,
      exercises: activities.map((a) => ({
        type: a.type,
        durationMinutes: a.durationMinutes,
        intensity: a.intensity,
        steps: a.steps,
        distanceKm: a.distanceKm,
        caloriesKcal: a.caloriesKcal,
        averageHeartRateBpm: a.averageHeartRateBpm,
        source: a.source ?? 'manual',
      })),
      symptoms: (log.symptoms ?? []).map((s) => `${s.type} (${s.severity})`),
      sleepQuality: log.sleep?.quality,
      hydrationMl: (log.hydration ?? []).reduce((acc, h) => acc + (h.amountMl ?? 0), 0),
    };
  });

  const total7DaySteps = activityDays.reduce((acc, d) => acc + d.steps, 0);
  const total7DayActiveMinutes = activityDays.reduce((acc, d) => acc + d.activeMinutes, 0);
  const activeDaysCount = activityDays.filter(
    (d) => d.steps > 0 || d.activeMinutes > 0 || d.exercises.length > 0,
  ).length;

  const loggedVitals = measurements
    .filter((m) => String(m.value ?? '').trim() !== '')
    .map((m) => ({
      label: m.label,
      category: m.category,
      value: m.value,
      unit: m.unit,
      previousValue: m.previousValue,
      normalRange: m.normalRange,
      measuredAt: m.measuredAt,
      notes: m.notes,
    }));

  const activeMeds = medications
    .filter((m) => !m.discontinued)
    .map((m) => ({
      name: m.name,
      dose: m.dose,
      frequency: m.frequency,
      instructions: m.instructions,
    }));

  const contextPayload = {
    currentDate: todayKey,
    expectantProfile: {
      firstName: profile.fullName?.split(' ')[0] || 'Expectant Mother',
      maternalAgeYears: maternalAge,
      bloodGroup: profile.bloodGroup || undefined,
      pregnancyWeek,
      pregnancyDays,
      trimester,
      expectedDueDate: profile.expectedDueDate,
    },
    sevenDayActivityOverview: {
      daysWithTrackedActivity: activeDaysCount,
      totalSteps7Days: total7DaySteps,
      averageDailySteps: Math.round(total7DaySteps / 7),
      totalActiveMinutes7Days: total7DayActiveMinutes,
      averageDailyActiveMinutes: Math.round(total7DayActiveMinutes / 7),
      dailyBreakdown: activityDays,
    },
    vitalMeasurements: loggedVitals,
    activeMedications: activeMeds,
  };

  const userPrompt = `Analyze the following expectant mother's profile, 7-day physical activity (Google Health + manual logs), vital measurements, and medications, and generate her personalized Pregnancy Health & Activity Card:\n\n${JSON.stringify(
    contextPayload,
    null,
    2,
  )}`;

  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction: HEALTH_INSIGHTS_PROMPT.trim(),
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          headline: { type: 'STRING' },
          emoji: { type: 'STRING' },
          summary: { type: 'STRING' },
          activityStatus: {
            type: 'STRING',
            enum: ['optimal', 'steady', 'gentle-needed', 'rest-focused'],
          },
          activityStatusLabel: { type: 'STRING' },
          activityScore: { type: 'NUMBER' },
          overallScore: { type: 'NUMBER' },
          recommendedDailySteps: { type: 'NUMBER' },
          recommendedActiveMinutes: { type: 'NUMBER' },
          weeklyProgressNote: { type: 'STRING' },
          highlights: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
          nextActions: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
          precautions: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
        required: [
          'headline',
          'emoji',
          'summary',
          'activityStatus',
          'activityStatusLabel',
          'activityScore',
          'overallScore',
          'recommendedDailySteps',
          'recommendedActiveMinutes',
          'weeklyProgressNote',
          'highlights',
          'nextActions',
          'precautions',
        ],
      },
    },
  });

  if (!response.text) {
    throw new Error('Gemini returned an empty response for health insights.');
  }

  const raw = JSON.parse(response.text) as Record<string, unknown>;
  const statusCandidate = String(raw.activityStatus ?? 'steady') as ActivityStatusLevel;
  const activityStatus: ActivityStatusLevel = VALID_STATUS_LEVELS.includes(statusCandidate)
    ? statusCandidate
    : 'steady';

  return {
    id: todayKey,
    profileId: profile.id,
    date: todayKey,
    generatedAt: new Date().toISOString(),
    pregnancyWeek,
    trimester,
    headline:
      typeof raw.headline === 'string' && raw.headline.trim()
        ? raw.headline.trim()
        : `Week ${pregnancyWeek} Activity & Wellness`,
    emoji:
      typeof raw.emoji === 'string' && raw.emoji.trim()
        ? raw.emoji.trim().slice(0, 4)
        : '🌿',
    summary:
      typeof raw.summary === 'string' && raw.summary.trim()
        ? raw.summary.trim()
        : 'Your activity and health insights are tailored to your current pregnancy stage.',
    activityStatus,
    activityStatusLabel:
      typeof raw.activityStatusLabel === 'string' && raw.activityStatusLabel.trim()
        ? raw.activityStatusLabel.trim()
        : 'Steady Rhythm',
    activityScore: clampNumber(raw.activityScore, 1, 100, 78),
    overallScore: clampNumber(raw.overallScore, 1, 100, 82),
    recommendedDailySteps: clampNumber(raw.recommendedDailySteps, 1500, 12000, 6000),
    recommendedActiveMinutes: clampNumber(raw.recommendedActiveMinutes, 10, 60, 25),
    weeklyProgressNote:
      typeof raw.weeklyProgressNote === 'string' && raw.weeklyProgressNote.trim()
        ? raw.weeklyProgressNote.trim()
        : 'Consistent, gentle movement supports circulation and energy throughout your week.',
    highlights: sanitizeStringArray(raw.highlights, 4),
    nextActions: sanitizeStringArray(raw.nextActions, 4),
    precautions: sanitizeStringArray(raw.precautions, 3),
  };
};

export const saveHealthActivityInsight = async (
  userId: string,
  profileId: string,
  insight: AIHealthActivityInsight,
): Promise<void> => {
  const col = getHealthSnapshotsCollection(userId, profileId);
  const latestRef = doc(col, 'latest');
  const datedRef = doc(col, insight.date);
  await Promise.all([
    setDoc(latestRef, insight, { merge: true }),
    setDoc(datedRef, insight, { merge: true }),
  ]);
};

export const getLatestHealthActivityInsight = async (
  userId: string,
  profileId: string,
): Promise<AIHealthActivityInsight | null> => {
  const col = getHealthSnapshotsCollection(userId, profileId);
  const snap = await getDoc(doc(col, 'latest'));
  if (!snap.exists()) return null;
  return snap.data() as AIHealthActivityInsight;
};

export const subscribeToLatestHealthActivityInsight = (
  userId: string,
  profileId: string,
  onUpdate: (insight: AIHealthActivityInsight | null) => void,
  onError?: (error: Error) => void,
) => {
  const col = getHealthSnapshotsCollection(userId, profileId);
  return onSnapshot(
    doc(col, 'latest'),
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as AIHealthActivityInsight);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      if (onError) onError(err);
    },
  );
};
