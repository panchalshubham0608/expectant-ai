import { createHash, randomInt } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import {
  getFirestore,
  type DocumentData,
  type DocumentReference,
  type Firestore,
} from 'firebase-admin/firestore';
import {
  generateDailyDigest,
  type BabyNameSuggestion,
  type DailyDigestCategory,
  type DailyDigestResponse,
} from '../src/services/ai/dailyDigestService';
import { getGeminiModel } from '../src/services/ai/geminiCore';
import type { DailyDigest, GeneratedBabyName } from '../src/models/dailyDigest';
import {
  countDailyMindPuzzles,
  DEFAULT_DAILY_MIX_ALLOCATION,
  sanitizeDailyMindPuzzles,
} from '../src/models/mindPuzzle';
import { getPregnancyAge } from '../src/utils/pregnancyUtils';

const CATEGORIES: readonly DailyDigestCategory[] = [
  'baby-fact',
  'body-fact',
  'pregnancy-tip',
  'did-you-know',
  'milestone',
  'couple',
] as const;

const DEFAULT_TIMEZONE = 'Asia/Kolkata';
const RECENT_DIGESTS_LIMIT = 30;
const MAX_BATCH_OPS = 450;
const MAX_BABY_NAME_CONTEXT_LENGTH = 500;
const MAX_SPIRITUAL_SLOKA_CONTEXT_LENGTH = 500;
const MAX_BABY_TALK_CONTEXT_LENGTH = 1000;
const MAX_BABY_NAME_COUNT = 10;

export type DailyDigestOverrideField = keyof DailyDigestResponse;

export interface DigestRequirements {
  wantsBabyNames: boolean;
  wantsSpiritualSloka: boolean;
  wantsBabyTalk: boolean;
}

export interface RunOptions {
  dryRun: boolean;
  force: boolean;
  failOnError: boolean;
  dateId: string;
  timeZone: string;
}

export interface RunSummary {
  usersScanned: number;
  profilesScanned: number;
  generated: number;
  skippedComplete: number;
  skippedNoApiKey: number;
  skippedInactiveOrInvalid: number;
  failed: number;
}

export const parseBooleanFlag = (value: string | undefined): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

export const getDateIdInTimeZone = (
  timeZone: string = DEFAULT_TIMEZONE,
  now: Date = new Date(),
): string => {
  const trimmedTz = timeZone.trim() || DEFAULT_TIMEZONE;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: trimmedTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error(`Failed to compute date in timezone "${trimmedTz}".`);
  }

  return `${year}-${month}-${day}`;
};

export const parseAndValidateDateId = (rawDate: string): string => {
  const trimmed = rawDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error(`Invalid date format "${trimmed}". Expected YYYY-MM-DD.`);
  }
  const [yearStr, monthStr, dayStr] = trimmed.split('-');
  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date "${trimmed}".`);
  }
  return trimmed;
};

export const sanitizeContext = (value: unknown, maxLength: number): string => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

export const normalizeBabyNameCount = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(MAX_BABY_NAME_COUNT, Math.floor(value));
};

export const toBabyNameId = (name: string): string => {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');
  const isReservedOrEmpty =
    !normalized ||
    normalized === '.' ||
    normalized === '..' ||
    /^__.*__$/.test(normalized) ||
    !/[a-z0-9]/.test(normalized);
  if (isReservedOrEmpty) {
    const hash = createHash('sha256').update(name.trim()).digest('hex').slice(0, 12);
    return `name_${hash}`;
  }
  return normalized.slice(0, 120);
};

export const redactSecrets = (message: string, secrets: readonly string[] = []): string => {
  let sanitized = message;
  for (const secret of secrets) {
    if (secret && secret.length >= 6) {
      sanitized = sanitized.split(secret).join('[REDACTED]');
    }
  }
  sanitized = sanitized
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, '[REDACTED]')
    .replace(/([?&](?:key|api_key|apiKey|token)=)[^&\s]+/gi, '$1[REDACTED]');
  return sanitized;
};

export const isFieldPresent = (
  digest: Partial<DailyDigest> | null,
  field: DailyDigestOverrideField,
): boolean => {
  if (!digest) return false;
  if (field === 'mindPuzzles') {
    const sanitized = sanitizeDailyMindPuzzles(digest.mindPuzzles);
    return countDailyMindPuzzles(sanitized) > 0;
  }
  const val = digest[field];
  if (val === undefined || val === null) return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'string') return val.trim().length > 0;
  if (typeof val === 'object') {
    return Object.values(val).some((v) => typeof v === 'string' && v.trim().length > 0);
  }
  return true;
};

export const getMissingDigestFields = (
  digest: Partial<DailyDigest> | null,
  requirements: DigestRequirements,
): DailyDigestOverrideField[] => {
  const missing: DailyDigestOverrideField[] = [];
  if (!isFieldPresent(digest, 'card')) missing.push('card');
  if (!isFieldPresent(digest, 'mindPuzzles')) missing.push('mindPuzzles');
  if (requirements.wantsBabyNames && !isFieldPresent(digest, 'babyNames')) {
    missing.push('babyNames');
  }
  if (requirements.wantsSpiritualSloka && !isFieldPresent(digest, 'spiritualSloka')) {
    missing.push('spiritualSloka');
  }
  if (requirements.wantsBabyTalk && !isFieldPresent(digest, 'babyTalk')) {
    missing.push('babyTalk');
  }
  return missing;
};

export const isDigestComplete = (
  digest: Partial<DailyDigest> | null,
  requirements: DigestRequirements,
): boolean => getMissingDigestFields(digest, requirements).length === 0;

export const parseRunOptions = (
  argv: readonly string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date(),
): RunOptions => {
  const dryRun = argv.includes('--dry-run') || parseBooleanFlag(env.DRY_RUN);
  const force = argv.includes('--force') || parseBooleanFlag(env.FORCE_REGENERATE);
  const failOnError = argv.includes('--fail-on-error') || parseBooleanFlag(env.FAIL_ON_ERROR);

  let rawDate: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--date=')) {
      rawDate = arg.slice('--date='.length);
      break;
    }
    if (arg === '--date' && i + 1 < argv.length) {
      rawDate = argv[i + 1];
      break;
    }
  }
  if (!rawDate && env.DIGEST_DATE?.trim()) {
    rawDate = env.DIGEST_DATE.trim();
  }

  const timeZone = env.DIGEST_TIMEZONE?.trim() || DEFAULT_TIMEZONE;
  const dateId = rawDate ? parseAndValidateDateId(rawDate) : getDateIdInTimeZone(timeZone, now);

  return { dryRun, force, failOnError, dateId, timeZone };
};

const initializeFirebaseAdmin = (): Firestore => {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing required Firebase credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.',
    );
  }

  const isFirstInit = getApps().length === 0;
  if (isFirstInit) {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.includes('\\n') ? privateKey.replace(/\\n/g, '\n') : privateKey,
      }),
      projectId,
    });
  }

  const db = getFirestore(getApp());
  if (isFirstInit) {
    db.settings({ ignoreUndefinedProperties: true });
  }
  return db;
};

const fetchProfileGeminiApiKey = async (profileRef: DocumentReference): Promise<string | null> => {
  const keySnap = await profileRef.collection('keys').doc('geminiApiKey').get();
  if (!keySnap.exists) return null;
  const rawKey = keySnap.data()?.geminiApiKey;
  if (typeof rawKey !== 'string') return null;
  const trimmed = rawKey.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const fetchRecentDailyDigests = async (
  profileRef: DocumentReference,
  limitCount: number = RECENT_DIGESTS_LIMIT,
): Promise<DailyDigest[]> => {
  const snapshot = await profileRef
    .collection('dailyDigests')
    .orderBy('date', 'desc')
    .limit(limitCount)
    .get();

  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as DailyDigest);
};

const fetchGeneratedBabyNames = async (profileRef: DocumentReference): Promise<string[]> => {
  const snapshot = await profileRef.collection('generatedBabyNames').get();
  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data() as Partial<GeneratedBabyName>;
      return typeof data.name === 'string' ? data.name.trim() : '';
    })
    .filter(Boolean);
};

const saveGeneratedBabyNames = async (
  db: Firestore,
  profileRef: DocumentReference,
  suggestions: readonly BabyNameSuggestion[],
  dateId: string,
): Promise<void> => {
  const records: GeneratedBabyName[] = [];
  const now = Date.now();

  for (const item of suggestions) {
    const trimmedName = typeof item.name === 'string' ? item.name.trim() : '';
    if (!trimmedName) continue;
    records.push({
      id: toBabyNameId(trimmedName),
      name: trimmedName,
      meaning: item.meaning,
      gender: item.gender,
      date: dateId,
      createdAt: now,
    });
  }

  if (records.length === 0) return;

  const collectionRef = profileRef.collection('generatedBabyNames');
  for (let i = 0; i < records.length; i += MAX_BATCH_OPS) {
    const chunk = records.slice(i, i + MAX_BATCH_OPS);
    const batch = db.batch();
    for (const record of chunk) {
      batch.set(collectionRef.doc(record.id), record, { merge: true });
    }
    await batch.commit();
  }
};

const processProfileDigest = async (
  db: Firestore,
  userId: string,
  profileRef: DocumentReference,
  profile: DocumentData,
  options: RunOptions,
  summary: RunSummary,
): Promise<void> => {
  const profileId = profileRef.id;

  // 1. Skip non-active profiles
  if (typeof profile.status === 'string' && profile.status !== 'active') {
    summary.skippedInactiveOrInvalid += 1;
    console.log(
      `⏭️ [Skipped] User ${userId}, profile ${profileId}: profile status is "${profile.status}".`,
    );
    return;
  }

  // 2. Calculate gestational age anchored to the target dateId
  const lastMenstrualPeriod =
    typeof profile.lastMenstrualPeriod === 'string' ? profile.lastMenstrualPeriod : undefined;
  const ultrasoundLastMenstrualPeriod =
    typeof profile.ultrasoundLastMenstrualPeriod === 'string'
      ? profile.ultrasoundLastMenstrualPeriod
      : undefined;
  const targetDate = new Date(`${options.dateId}T00:00:00`);
  const age = getPregnancyAge(lastMenstrualPeriod, ultrasoundLastMenstrualPeriod, targetDate);

  if (!age || age.isFuture) {
    summary.skippedInactiveOrInvalid += 1;
    console.log(
      `⏭️ [Skipped] User ${userId}, profile ${profileId}: no valid active pregnancy start date for ${options.dateId}.`,
    );
    return;
  }

  // 3. Read and sanitize profile preferences
  const babyNameContext = sanitizeContext(profile.babyNameContext, MAX_BABY_NAME_CONTEXT_LENGTH);
  const babyNameCount = normalizeBabyNameCount(profile.babyNameCount);
  const wantsBabyNames = Boolean(babyNameContext && babyNameCount > 0);
  const spiritualSlokaContext = sanitizeContext(
    profile.spiritualSlokaContext,
    MAX_SPIRITUAL_SLOKA_CONTEXT_LENGTH,
  );
  const wantsSpiritualSloka = Boolean(spiritualSlokaContext);
  const wantsBabyTalk = Boolean(profile.babyTalkEnabled);
  const babyTalkContext = sanitizeContext(profile.babyTalkContext, MAX_BABY_TALK_CONTEXT_LENGTH);

  const requirements: DigestRequirements = {
    wantsBabyNames,
    wantsSpiritualSloka,
    wantsBabyTalk,
  };

  // 4. Check existing daily digest for target dateId
  const digestRef = profileRef.collection('dailyDigests').doc(options.dateId);
  const existingSnap = await digestRef.get();
  const existingDigest = existingSnap.exists
    ? ({ id: existingSnap.id, ...existingSnap.data() } as DailyDigest)
    : null;

  const missingFields = getMissingDigestFields(existingDigest, requirements);
  if (!options.force && missingFields.length === 0) {
    summary.skippedComplete += 1;
    console.log(
      `⏭️ [Skipped] User ${userId}, profile ${profileId}: digest for ${options.dateId} is already complete.`,
    );
    return;
  }

  // 5. Fetch the profile's stored Gemini API key (strictly per-profile; skip if absent)
  const apiKey = await fetchProfileGeminiApiKey(profileRef);
  if (!apiKey) {
    summary.skippedNoApiKey += 1;
    console.log(
      `⏭️ [Skipped] User ${userId}, profile ${profileId}: no Gemini API key configured in Firestore.`,
    );
    return;
  }

  const reason = options.force ? 'force regenerate' : `missing [${missingFields.join(', ')}]`;

  if (options.dryRun) {
    summary.generated += 1;
    console.log(
      `[DRY RUN] Would generate digest for user ${userId}, profile ${profileId} (${options.dateId}, week ${age.weeks}d${age.days}, ${reason}).`,
    );
    return;
  }

  try {
    // 6. Fetch recent digests and persisted baby names to avoid repetition
    const [recentDigestsList, persistedGeneratedNames] = await Promise.all([
      fetchRecentDailyDigests(profileRef, RECENT_DIGESTS_LIMIT),
      wantsBabyNames ? fetchGeneratedBabyNames(profileRef) : Promise.resolve([]),
    ]);

    const recentMoments = recentDigestsList
      .filter((d) => d.card?.title && d.card?.content)
      .map((d) => `[${d.category}] ${d.card.title}: ${d.card.content}`);

    const recentBabyNames = Array.from(
      new Set(
        [
          ...persistedGeneratedNames,
          ...recentDigestsList.flatMap((d) => d.babyNames?.map((b) => b.name) ?? []),
        ].filter(Boolean),
      ),
    );

    const recentSlokas = recentDigestsList
      .filter((d) => d.spiritualSloka?.originalScript)
      .map((d) => `${d.spiritualSloka!.source}: ${d.spiritualSloka!.originalScript}`);

    const recentBabyTalks = recentDigestsList
      .filter((d) => d.babyTalk?.title)
      .map((d) => `${d.babyTalk!.title}: ${d.babyTalk!.prompt}`);

    // 7. Generate digest via shared AI service (uses profile's Gemini API key strictly in memory)
    const category = CATEGORIES[randomInt(CATEGORIES.length)];
    const aiResponse = await generateDailyDigest(
      {
        pregnancyWeek: age.weeks,
        pregnancyDay: age.days,
        category,
        date: options.dateId,
        recentMoments,
        mindPuzzleAllocation: DEFAULT_DAILY_MIX_ALLOCATION,
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
        ...(wantsBabyTalk
          ? {
              babyTalkEnabled: true,
              babyTalkContext,
              recentBabyTalks,
            }
          : {}),
      },
      apiKey,
    );

    // 8. Merge with any existing partial digest (preserve present fields unless --force)
    const shouldOverride = (field: DailyDigestOverrideField): boolean =>
      options.force || !isFieldPresent(existingDigest, field);

    const resolveField = <K extends DailyDigestOverrideField>(field: K): DailyDigestResponse[K] => {
      if (shouldOverride(field) || !existingDigest) {
        return aiResponse[field];
      }
      return existingDigest[field] ?? aiResponse[field];
    };

    const resolvedSpiritualSloka = resolveField('spiritualSloka');
    const resolvedBabyTalk = resolveField('babyTalk');
    const rawResolvedPuzzles = sanitizeDailyMindPuzzles(resolveField('mindPuzzles'));
    const resolvedMindPuzzles = rawResolvedPuzzles
      ? {
          ...rawResolvedPuzzles,
          updatedAt: rawResolvedPuzzles.updatedAt ?? Date.now(),
        }
      : null;

    const dailyDigest: DailyDigest = {
      category: resolveField('category'),
      header: resolveField('header'),
      card: resolveField('card'),
      emoji: resolveField('emoji'),
      babyNames: resolveField('babyNames') ?? [],
      ...(resolvedSpiritualSloka ? { spiritualSloka: resolvedSpiritualSloka } : {}),
      ...(resolvedBabyTalk ? { babyTalk: resolvedBabyTalk } : {}),
      ...(resolvedMindPuzzles ? { mindPuzzles: resolvedMindPuzzles } : {}),
      id: options.dateId,
      date: options.dateId,
      pregnancyWeek: age.weeks,
      pregnancyDay: age.days,
      createdAt:
        typeof existingDigest?.createdAt === 'number' && Number.isFinite(existingDigest.createdAt)
          ? existingDigest.createdAt
          : Date.now(),
    };

    await digestRef.set(dailyDigest, { merge: true });

    if (
      wantsBabyNames &&
      shouldOverride('babyNames') &&
      dailyDigest.babyNames &&
      dailyDigest.babyNames.length > 0
    ) {
      await saveGeneratedBabyNames(db, profileRef, dailyDigest.babyNames, options.dateId);
    }

    summary.generated += 1;
    console.log(
      `✅ [Generated] User ${userId}, profile ${profileId}: saved digest for ${options.dateId} (week ${age.weeks}d${age.days}, category="${dailyDigest.category}", ${reason}).`,
    );
  } catch (error: unknown) {
    summary.failed += 1;
    const rawMessage = error instanceof Error ? error.message : 'Unknown error';
    const safeMessage = redactSecrets(rawMessage, [apiKey]);
    console.error(`❌ [Failed] User ${userId}, profile ${profileId}: ${safeMessage}`);
  }
};

export async function generateDailyDigestsForAllUsers(
  options: RunOptions = parseRunOptions(),
): Promise<RunSummary> {
  console.log(
    `Starting daily digest generation for ${options.dateId} (timezone: ${options.timeZone}, model: ${redactSecrets(getGeminiModel())})...`,
  );

  if (options.dryRun) {
    console.log('⚠️ DRY RUN MODE ENABLED. Gemini will not be called and no data will be written.');
  }
  if (options.force) {
    console.log('ℹ️ FORCE MODE ENABLED. Existing digests for the target date will be regenerated.');
  }

  const db = initializeFirebaseAdmin();
  const userRefs = await db.collection('users').listDocuments();
  console.log(`Found ${userRefs.length} user(s) in Firestore.`);

  const summary: RunSummary = {
    usersScanned: userRefs.length,
    profilesScanned: 0,
    generated: 0,
    skippedComplete: 0,
    skippedNoApiKey: 0,
    skippedInactiveOrInvalid: 0,
    failed: 0,
  };

  for (const userRef of userRefs) {
    const profilesSnapshot = await userRef.collection('profiles').get();

    for (const profileDoc of profilesSnapshot.docs) {
      summary.profilesScanned += 1;
      await processProfileDigest(
        db,
        userRef.id,
        profileDoc.ref,
        profileDoc.data(),
        options,
        summary,
      );
    }
  }

  console.log(
    `Daily digest run complete for ${options.dateId}. ` +
      `Profiles scanned: ${summary.profilesScanned}, ` +
      `${options.dryRun ? 'would generate' : 'generated'}: ${summary.generated}, ` +
      `skipped (already complete): ${summary.skippedComplete}, ` +
      `skipped (no API key): ${summary.skippedNoApiKey}, ` +
      `skipped (inactive/invalid): ${summary.skippedInactiveOrInvalid}, ` +
      `failed: ${summary.failed}.`,
  );

  return summary;
}

const isEntryPoint = (): boolean => {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === path.resolve(fileURLToPath(import.meta.url));
};

if (isEntryPoint()) {
  (async () => {
    const options = parseRunOptions();
    const summary = await generateDailyDigestsForAllUsers(options);
    if (options.failOnError && summary.failed > 0) {
      process.exit(1);
    }
  })().catch((error: unknown) => {
    const rawMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Fatal error during daily digest generation:', redactSecrets(rawMessage));
    process.exit(1);
  });
}
