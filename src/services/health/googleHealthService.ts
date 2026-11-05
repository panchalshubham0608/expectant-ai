import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDailyLogsCollection } from '../../lib/collections';
import type { Activity, DailyActivitySummary } from '../../models/activity';
import type { DailyLog } from '../../models/dailylLog';
import type { ExpectantProfile } from '../../models/profile';
import { getPregnancyAge } from '../../utils/pregnancyUtils';

const GOOGLE_HEALTH_BASE_URL = 'https://health.googleapis.com/v4';
const GOOGLE_HEALTH_FITNESS_SCOPE =
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly';

// Keep access token strictly in memory (never in localStorage/sessionStorage per security guidelines)
let cachedHealthAccessToken: string | null = null;

export const clearGoogleHealthToken = (): void => {
  cachedHealthAccessToken = null;
};

export const hasCachedGoogleHealthToken = (): boolean => Boolean(cachedHealthAccessToken);

export const getGoogleHealthAccessToken = async (
  forceReauth = false,
): Promise<string> => {
  if (cachedHealthAccessToken && !forceReauth) {
    return cachedHealthAccessToken;
  }

  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  provider.addScope(GOOGLE_HEALTH_FITNESS_SCOPE);

  // Per Google Health API v4 docs (#update-scopes), prompt=consent is required
  // when requesting additional health scopes for an already signed-in Google user.
  const customParams: Record<string, string> = {
    prompt: 'consent',
  };
  if (auth.currentUser?.email) {
    customParams.login_hint = auth.currentUser.email;
  }
  provider.setCustomParameters(customParams);

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error(
        'Unable to obtain Google Health access token. Please grant fitness read permission when prompted.',
      );
    }

    cachedHealthAccessToken = token;
    return token;
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error(
        'Google Health authorization window was closed before completing. If the popup showed an error, verify that the Google Health API and the googlehealth.activity_and_fitness.readonly scope are enabled in your Google Cloud OAuth configuration.',
      );
    }
    if (code === 'auth/popup-blocked') {
      throw new Error(
        'Browser blocked the Google Health sign-in popup. Please allow popups for this site and try again.',
      );
    }
    throw err;
  }
};

interface CivilDate {
  year: number;
  month: number;
  day: number;
}

interface CivilDateTime {
  date: CivilDate;
  time?: {
    hours?: number;
    minutes?: number;
    seconds?: number;
    nanos?: number;
  };
}

interface DailyRollupDataPoint {
  civilStartTime?: CivilDateTime;
  civilEndTime?: CivilDateTime;
  steps?: {
    countSum?: string | number;
  };
  distance?: {
    millimetersSum?: string | number;
  };
  activeEnergyBurned?: {
    kcalSum?: number | string;
  };
  activeMinutes?: {
    activeMinutesRollupByActivityLevel?: Array<{
      activityLevel?: string;
      activeMinutesSum?: string | number;
    }>;
  };
}

interface DailyRollupResponse {
  rollupDataPoints?: DailyRollupDataPoint[];
}

interface ExerciseDataPoint {
  name?: string;
  exercise?: {
    interval?: {
      startTime?: string;
      endTime?: string;
      startUtcOffset?: string;
    };
    exerciseType?: string;
    displayName?: string;
    activeDuration?: string;
    metricsSummary?: {
      caloriesKcal?: number | string;
      distanceMillimiters?: number | string;
      distanceMillimeters?: number | string;
      steps?: string | number;
      averageHeartRateBeatsPerMinute?: string | number;
      activeZoneMinutes?: string | number;
    };
  };
}

interface ExerciseListResponse {
  dataPoints?: ExerciseDataPoint[];
}

const toDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const civilDateToKey = (civil?: CivilDate): string | null => {
  if (
    !civil ||
    typeof civil.year !== 'number' ||
    typeof civil.month !== 'number' ||
    typeof civil.day !== 'number'
  ) {
    return null;
  }
  const y = String(civil.year).padStart(4, '0');
  const m = String(civil.month).padStart(2, '0');
  const d = String(civil.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const safeNonNegativeNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, parsed);
    }
  }
  return 0;
};

const parseDurationSeconds = (durationStr?: string): number => {
  if (!durationStr || typeof durationStr !== 'string') return 0;
  const match = durationStr.trim().match(/^(\d+(?:\.\d+)?)s$/i);
  if (!match) return 0;
  return safeNonNegativeNumber(match[1]);
};

const sanitizeText = (raw: unknown, fallback: string, maxLength = 80): string => {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, maxLength);
};

const formatExerciseLabel = (displayName?: string, exerciseType?: string): string => {
  if (displayName && typeof displayName === 'string' && displayName.trim()) {
    return sanitizeText(displayName, 'Exercise', 60);
  }
  if (exerciseType && typeof exerciseType === 'string' && exerciseType.trim()) {
    const formatted = exerciseType
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return sanitizeText(formatted, 'Exercise', 60);
  }
  return 'Workout';
};

const inferIntensity = (
  durationMinutes: number,
  caloriesKcal?: number,
  avgHr?: number,
): 'low' | 'moderate' | 'high' => {
  if ((avgHr && avgHr >= 140) || (durationMinutes > 0 && (caloriesKcal ?? 0) / durationMinutes > 8)) {
    return 'high';
  }
  if ((avgHr && avgHr >= 110) || (durationMinutes >= 20 && (caloriesKcal ?? 0) >= 80)) {
    return 'moderate';
  }
  return 'low';
};

const buildCivilRangeBody = (startDate: Date, endDate: Date) => ({
  range: {
    start: {
      date: {
        year: startDate.getFullYear(),
        month: startDate.getMonth() + 1,
        day: startDate.getDate(),
      },
      time: {
        hours: 0,
        minutes: 0,
        seconds: 0,
        nanos: 0,
      },
    },
    end: {
      date: {
        year: endDate.getFullYear(),
        month: endDate.getMonth() + 1,
        day: endDate.getDate(),
      },
      time: {
        hours: 23,
        minutes: 59,
        seconds: 59,
        nanos: 0,
      },
    },
  },
  windowSizeDays: 1,
});

const fetchDailyRollup = async (
  dataType: 'steps' | 'distance' | 'active-energy-burned' | 'active-minutes',
  startDate: Date,
  endDate: Date,
  accessToken: string,
): Promise<DailyRollupDataPoint[]> => {
  const response = await fetch(
    `${GOOGLE_HEALTH_BASE_URL}/users/me/dataTypes/${encodeURIComponent(dataType)}/dataPoints:dailyRollUp`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildCivilRangeBody(startDate, endDate)),
    },
  );

  if (response.status === 401) {
    clearGoogleHealthToken();
    throw new Error('GOOGLE_HEALTH_UNAUTHORIZED');
  }

  if (!response.ok) {
    let apiErrorReason = '';
    let apiErrorMessage = '';
    try {
      const errBody = (await response.json()) as {
        error?: {
          message?: string;
          status?: string;
          details?: Array<{ reason?: string }>;
        };
      };
      apiErrorMessage = errBody.error?.message ?? '';
      apiErrorReason = errBody.error?.details?.[0]?.reason ?? errBody.error?.status ?? '';
    } catch {
      // Ignore JSON parse errors on non-JSON error responses
    }

    if (apiErrorReason === 'ACCOUNT_NOT_LINKED') {
      throw new Error(
        'Your Google Account is not linked to Google Health yet. Open the Google Health or Fitbit mobile app and sign in with your Google Account to create or link your profile, then try syncing again.',
      );
    }

    if (response.status === 403) {
      if (apiErrorReason === 'SERVICE_DISABLED' || apiErrorMessage.includes('has not been used in project')) {
        throw new Error(
          'The Google Health API (health.googleapis.com) is not enabled in your Google Cloud project yet. Enable it in Google Cloud Console > APIs & Services > Library and try again.',
        );
      }
      throw new Error(
        'Access denied by Google Health API. Ensure the Google Health API is enabled in your Google Cloud project and fitness read permission was granted in the consent screen.',
      );
    }

    throw new Error(
      apiErrorMessage
        ? `Google Health API error (${response.status}): ${apiErrorMessage}`
        : `Google Health API request failed (${response.status}).`,
    );
  }

  const data = (await response.json()) as DailyRollupResponse;
  return Array.isArray(data.rollupDataPoints) ? data.rollupDataPoints : [];
};

const fetchExercises = async (
  startDate: Date,
  accessToken: string,
): Promise<ExerciseDataPoint[]> => {
  const startDateStr = `${toDateKey(startDate)}T00:00:00`;
  const url = new URL(`${GOOGLE_HEALTH_BASE_URL}/users/me/dataTypes/exercise/dataPoints`);
  url.searchParams.set('filter', `exercise.interval.civil_start_time >= "${startDateStr}"`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (response.status === 401) {
    clearGoogleHealthToken();
    throw new Error('GOOGLE_HEALTH_UNAUTHORIZED');
  }

  if (!response.ok) {
    // Non-fatal if exercises endpoint has no records or is unavailable
    return [];
  }

  const data = (await response.json()) as ExerciseListResponse;
  return Array.isArray(data.dataPoints) ? data.dataPoints : [];
};

const stripUndefinedDeep = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object' && value.constructor === Object) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        cleaned[key] = stripUndefinedDeep(val);
      }
    }
    return cleaned as T;
  }
  return value;
};

export const syncGoogleHealthActivity = async (
  userId: string,
  profileId: string,
  options?: {
    days?: number;
    profile?: Partial<ExpectantProfile> | null;
  },
): Promise<DailyActivitySummary[]> => {
  // Clamp days to [1, 14] because active-minutes supports a max 14-day window in Google Health API v4
  const days = Math.min(14, Math.max(1, options?.days ?? 7));
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (days - 1));

  let accessToken = await getGoogleHealthAccessToken(false);

  const executeQueries = async (token: string) =>
    Promise.all([
      fetchDailyRollup('steps', startDate, endDate, token),
      fetchDailyRollup('distance', startDate, endDate, token),
      fetchDailyRollup('active-energy-burned', startDate, endDate, token),
      fetchDailyRollup('active-minutes', startDate, endDate, token),
      fetchExercises(startDate, token),
    ]);

  let results: [
    DailyRollupDataPoint[],
    DailyRollupDataPoint[],
    DailyRollupDataPoint[],
    DailyRollupDataPoint[],
    ExerciseDataPoint[],
  ];

  try {
    results = await executeQueries(accessToken);
  } catch (err) {
    if (err instanceof Error && err.message === 'GOOGLE_HEALTH_UNAUTHORIZED') {
      accessToken = await getGoogleHealthAccessToken(true);
      results = await executeQueries(accessToken);
    } else {
      throw err;
    }
  }

  const [stepsPoints, distancePoints, caloriesPoints, activeMinutesPoints, exercisePoints] =
    results;

  const syncedAt = new Date().toISOString();
  const summariesByDate = new Map<string, DailyActivitySummary>();

  // Initialize each day in the requested window
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const key = toDateKey(d);
    summariesByDate.set(key, {
      date: key,
      steps: 0,
      distanceKm: 0,
      activeCaloriesKcal: 0,
      activeMinutes: 0,
      exercises: [],
      syncedAt,
    });
  }

  for (const point of stepsPoints) {
    const key = civilDateToKey(point.civilStartTime?.date);
    if (!key || !summariesByDate.has(key)) continue;
    const summary = summariesByDate.get(key)!;
    summary.steps = Math.round(safeNonNegativeNumber(point.steps?.countSum));
  }

  for (const point of distancePoints) {
    const key = civilDateToKey(point.civilStartTime?.date);
    if (!key || !summariesByDate.has(key)) continue;
    const summary = summariesByDate.get(key)!;
    const mm = safeNonNegativeNumber(point.distance?.millimetersSum);
    summary.distanceKm = Number((mm / 1_000_000).toFixed(2));
  }

  for (const point of caloriesPoints) {
    const key = civilDateToKey(point.civilStartTime?.date);
    if (!key || !summariesByDate.has(key)) continue;
    const summary = summariesByDate.get(key)!;
    summary.activeCaloriesKcal = Math.round(
      safeNonNegativeNumber(point.activeEnergyBurned?.kcalSum),
    );
  }

  for (const point of activeMinutesPoints) {
    const key = civilDateToKey(point.civilStartTime?.date);
    if (!key || !summariesByDate.has(key)) continue;
    const summary = summariesByDate.get(key)!;
    const levels = point.activeMinutes?.activeMinutesRollupByActivityLevel ?? [];
    const totalActiveMins = levels.reduce((acc, item) => {
      // Exclude SEDENTARY if ever present
      if (item.activityLevel && item.activityLevel.toUpperCase() === 'SEDENTARY') {
        return acc;
      }
      return acc + safeNonNegativeNumber(item.activeMinutesSum);
    }, 0);
    summary.activeMinutes = Math.round(totalActiveMins);
  }

  for (const point of exercisePoints) {
    const ex = point.exercise;
    if (!ex) continue;

    const startTimeStr = ex.interval?.startTime;
    const startTimeDate = startTimeStr ? new Date(startTimeStr) : new Date();
    const validStart = !Number.isNaN(startTimeDate.getTime()) ? startTimeDate : new Date();
    const dateKey = toDateKey(validStart);

    const activeSec = parseDurationSeconds(ex.activeDuration);
    const intervalSec =
      ex.interval?.startTime && ex.interval?.endTime
        ? Math.max(
            0,
            (new Date(ex.interval.endTime).getTime() -
              new Date(ex.interval.startTime).getTime()) /
              1000,
          )
        : 0;
    const durationMinutes = Math.max(1, Math.round((activeSec || intervalSec) / 60));

    const steps = Math.round(safeNonNegativeNumber(ex.metricsSummary?.steps));
    const caloriesKcal = Math.round(safeNonNegativeNumber(ex.metricsSummary?.caloriesKcal));
    const rawMm =
      ex.metricsSummary?.distanceMillimeters ?? ex.metricsSummary?.distanceMillimiters;
    const distanceKm = rawMm
      ? Number((safeNonNegativeNumber(rawMm) / 1_000_000).toFixed(2))
      : undefined;
    const avgHr = Math.round(
      safeNonNegativeNumber(ex.metricsSummary?.averageHeartRateBeatsPerMinute),
    );

    const rawIdSuffix = point.name
      ? point.name.split('/').pop() || `${validStart.getTime()}`
      : `${validStart.getTime()}`;
    const activityId = `gh-${sanitizeText(rawIdSuffix, `${validStart.getTime()}`, 48)}`;

    const activity: Activity = {
      id: activityId,
      type: formatExerciseLabel(ex.displayName, ex.exerciseType),
      durationMinutes,
      intensity: inferIntensity(durationMinutes, caloriesKcal, avgHr || undefined),
      timestamp: validStart.toISOString(),
      ...(steps > 0 ? { steps } : {}),
      ...(distanceKm && distanceKm > 0 ? { distanceKm } : {}),
      ...(caloriesKcal > 0 ? { caloriesKcal } : {}),
      ...(avgHr > 0 ? { averageHeartRateBpm: avgHr } : {}),
      source: 'google_health',
    };

    if (summariesByDate.has(dateKey)) {
      summariesByDate.get(dateKey)!.exercises.push(activity);
    }
  }

  // Persist synced daily summaries and merged exercises to Firestore dailyLogs
  const age = getPregnancyAge(
    options?.profile?.lastMenstrualPeriod,
    options?.profile?.ultrasoundLastMenstrualPeriod,
  );
  const calculatedWeek = age && !age.isFuture ? age.currentWeek : 1;

  const dailyLogsCol = getDailyLogsCollection(userId, profileId);
  const summaries = Array.from(summariesByDate.values()).sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  await Promise.all(
    summaries.map(async (summary) => {
      const logRef = doc(dailyLogsCol, summary.date);
      const snap = await getDoc(logRef);
      const existing = snap.exists() ? (snap.data() as Partial<DailyLog>) : {};

      const manualActivities = (existing.activities ?? []).filter(
        (act) => act.source !== 'google_health' && !act.id.startsWith('gh-'),
      );

      // Deduplicate exercises by ID
      const exerciseMap = new Map<string, Activity>();
      for (const ex of summary.exercises) {
        exerciseMap.set(ex.id, ex);
      }

      const mergedActivities: Activity[] = [
        ...manualActivities,
        ...Array.from(exerciseMap.values()),
      ];

      // If Active Minutes rollup was 0 but exercises were recorded, fallback to exercise duration sum
      const effectiveActiveMinutes =
        summary.activeMinutes > 0
          ? summary.activeMinutes
          : summary.exercises.reduce((acc, ex) => acc + (ex.durationMinutes ?? 0), 0);

      const finalSummary: DailyActivitySummary = {
        ...summary,
        activeMinutes: effectiveActiveMinutes,
        exercises: Array.from(exerciseMap.values()),
      };

      const updatedLog: DailyLog = {
        id: summary.date,
        profileId,
        date: summary.date,
        pregnancyWeek: existing.pregnancyWeek ?? calculatedWeek,
        status: existing.status ?? 'ongoing',
        meals: existing.meals ?? [],
        hydration: existing.hydration ?? [],
        activities: mergedActivities,
        activitySummary: finalSummary,
        symptoms: existing.symptoms ?? [],
        medications: existing.medications ?? [],
        ...(existing.sleep ? { sleep: existing.sleep } : {}),
        vitals: existing.vitals ?? [],
        ...(existing.mood ? { mood: existing.mood } : {}),
        notes: existing.notes ?? [],
        ...(existing.aiSummary ? { aiSummary: existing.aiSummary } : {}),
        createdAt: existing.createdAt ?? syncedAt,
        updatedAt: syncedAt,
      };

      await setDoc(logRef, stripUndefinedDeep(updatedLog), { merge: true });
    }),
  );

  return summaries;
};

export const addManualActivityToDailyLog = async (
  userId: string,
  profileId: string,
  dateKey: string,
  activityInput: Omit<Activity, 'id' | 'source'>,
  profile?: Partial<ExpectantProfile> | null,
): Promise<Activity> => {
  const safeDateKey = /^\d{4}-\d{2}-\d{2}$/.test(dateKey)
    ? dateKey
    : toDateKey(new Date());

  const newActivity: Activity = {
    id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: sanitizeText(activityInput.type, 'Walk', 60),
    durationMinutes:
      activityInput.durationMinutes && activityInput.durationMinutes > 0
        ? Math.min(720, Math.round(activityInput.durationMinutes))
        : undefined,
    intensity: activityInput.intensity ?? 'moderate',
    timestamp: activityInput.timestamp || new Date().toISOString(),
    notes: activityInput.notes ? sanitizeText(activityInput.notes, '', 240) : undefined,
    steps:
      activityInput.steps && activityInput.steps > 0
        ? Math.round(activityInput.steps)
        : undefined,
    caloriesKcal:
      activityInput.caloriesKcal && activityInput.caloriesKcal > 0
        ? Math.round(activityInput.caloriesKcal)
        : undefined,
    source: 'manual',
  };

  const age = getPregnancyAge(
    profile?.lastMenstrualPeriod,
    profile?.ultrasoundLastMenstrualPeriod,
  );
  const calculatedWeek = age && !age.isFuture ? age.currentWeek : 1;

  const logRef = doc(getDailyLogsCollection(userId, profileId), safeDateKey);
  const snap = await getDoc(logRef);
  const existing = snap.exists() ? (snap.data() as Partial<DailyLog>) : {};
  const nowIso = new Date().toISOString();

  const updatedLog: DailyLog = {
    id: safeDateKey,
    profileId,
    date: safeDateKey,
    pregnancyWeek: existing.pregnancyWeek ?? calculatedWeek,
    status: existing.status ?? 'ongoing',
    meals: existing.meals ?? [],
    hydration: existing.hydration ?? [],
    activities: [...(existing.activities ?? []), newActivity],
    ...(existing.activitySummary ? { activitySummary: existing.activitySummary } : {}),
    symptoms: existing.symptoms ?? [],
    medications: existing.medications ?? [],
    ...(existing.sleep ? { sleep: existing.sleep } : {}),
    vitals: existing.vitals ?? [],
    ...(existing.mood ? { mood: existing.mood } : {}),
    notes: existing.notes ?? [],
    ...(existing.aiSummary ? { aiSummary: existing.aiSummary } : {}),
    createdAt: existing.createdAt ?? nowIso,
    updatedAt: nowIso,
  };

  await setDoc(logRef, stripUndefinedDeep(updatedLog), { merge: true });
  return newActivity;
};

export const removeActivityFromDailyLog = async (
  userId: string,
  profileId: string,
  dateKey: string,
  activityId: string,
): Promise<void> => {
  const logRef = doc(getDailyLogsCollection(userId, profileId), dateKey);
  const snap = await getDoc(logRef);
  if (!snap.exists()) return;

  const existing = snap.data() as Partial<DailyLog>;
  const filteredActivities = (existing.activities ?? []).filter(
    (act) => act.id !== activityId,
  );

  await setDoc(
    logRef,
    stripUndefinedDeep({
      activities: filteredActivities,
      updatedAt: new Date().toISOString(),
    }),
    { merge: true },
  );
};
