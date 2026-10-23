import {
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import type { Activity } from '../../models/activity';
import type { HydrationLog } from '../../models/hydration';
import type { Meal } from '../../models/meal';
import type { MedicationLog } from '../../models/medication';
import type { ConversationMessage } from '../../models/chat';
import type { DailyLog } from '../../models/dailylLog';
import type { Note } from '../../models/note';
import type { ExpectantProfile } from '../../models/profile';
import {
  getDailyLogsCollection,
  getJournalChatsCollection,
  requireDb,
} from '../../lib/collections';
import { getPregnancyAge } from '../../utils/pregnancyUtils';
import type {
  ChatSuggestedAppointment,
  ChatSuggestedReminder,
  JournalMessageExtraction,
  JournalChatReply,
  JournalChatRecord,
} from './journalChatService';

const getDateKey = (value?: string) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const asNonEmptyArray = <T>(items?: T[]) => items ?? [];

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

export const saveJournalChatTurn = async (
  userId: string,
  profileId: string,
  message: ConversationMessage,
  extracted?: JournalMessageExtraction,
  reply?: JournalChatReply
): Promise<void> => {
  const chatsRef = getJournalChatsCollection(userId, profileId);
  const chatDocRef = doc(chatsRef, message.id);

  const emptyExtraction: JournalMessageExtraction = {
    meals: [],
    hydration: [],
    symptoms: [],
    activities: [],
    medications: [],
    notes: [],
    other: [],
  };

  const payload = stripUndefinedDeep({
    ...message,
    extracted: extracted ?? emptyExtraction,
    reply: reply ?? null,
    profileId,
  });

  await setDoc(
    chatDocRef,
    {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

export const updateJournalChatSuggestedAppointment = async (
  userId: string,
  profileId: string,
  messageId: string,
  suggestedAppointment: ChatSuggestedAppointment
): Promise<void> => {
  const chatsRef = getJournalChatsCollection(userId, profileId);
  const chatDocRef = doc(chatsRef, messageId);

  await setDoc(
    chatDocRef,
    stripUndefinedDeep({
      reply: {
        suggestedAppointment,
      },
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  );
};

export const updateJournalChatSuggestedReminder = async (
  userId: string,
  profileId: string,
  messageId: string,
  suggestedReminder: ChatSuggestedReminder
): Promise<void> => {
  const chatsRef = getJournalChatsCollection(userId, profileId);
  const chatDocRef = doc(chatsRef, messageId);

  await setDoc(
    chatDocRef,
    stripUndefinedDeep({
      reply: {
        suggestedReminder,
      },
      updatedAt: serverTimestamp(),
    }),
    { merge: true }
  );
};

export const clearJournalChats = async (
  userId: string,
  profileId: string
): Promise<void> => {
  const chatsRef = getJournalChatsCollection(userId, profileId);
  const snapshot = await getDocs(chatsRef);
  if (snapshot.empty) return;

  const db = requireDb();
  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  await batch.commit();
};

export const upsertDailyLogFromExtraction = async (
  userId: string,
  profileId: string,
  extraction: JournalMessageExtraction,
  options?: {
    date?: string;
    profile?: Partial<ExpectantProfile> | null;
  }
): Promise<DailyLog> => {
  const dateKey = getDateKey(options?.date);
  const dailyLogRef = doc(getDailyLogsCollection(userId, profileId), dateKey);
  const snapshot = await getDoc(dailyLogRef);
  const previous = snapshot.exists() ? (snapshot.data() as Partial<DailyLog>) : {};

  const age = getPregnancyAge(
    options?.profile?.lastMenstrualPeriod,
    options?.profile?.ultrasoundLastMenstrualPeriod
  );
  const calculatedWeek = age && !age.isFuture ? age.currentWeek : undefined;

  const merged: DailyLog = {
    id: dateKey,
    profileId,
    date: dateKey,
    pregnancyWeek: calculatedWeek ?? previous.pregnancyWeek ?? 1,
    status: 'ongoing',
    meals: [
      ...asNonEmptyArray((previous.meals as Meal[]) ?? []),
      ...asNonEmptyArray((extraction.meals as Meal[]) ?? []),
    ],
    hydration: [
      ...asNonEmptyArray((previous.hydration as HydrationLog[]) ?? []),
      ...asNonEmptyArray((extraction.hydration as HydrationLog[]) ?? []),
    ],
    activities: [
      ...asNonEmptyArray((previous.activities as Activity[]) ?? []),
      ...asNonEmptyArray((extraction.activities as Activity[]) ?? []),
    ],
    symptoms: [
      ...asNonEmptyArray((previous.symptoms as any[]) ?? []),
      ...asNonEmptyArray((extraction.symptoms as any[]) ?? []),
    ],
    medications: [
      ...asNonEmptyArray((previous.medications as MedicationLog[]) ?? []),
      ...asNonEmptyArray((extraction.medications as MedicationLog[]) ?? []),
    ],
    ...(extraction.sleep || previous.sleep
      ? { sleep: (extraction.sleep ?? previous.sleep) as DailyLog['sleep'] }
      : {}),
    vitals: [...asNonEmptyArray((previous.vitals ?? []) as any[])],
    ...(extraction.mood || previous.mood
      ? { mood: (extraction.mood ?? previous.mood) as DailyLog['mood'] }
      : {}),
    notes: [
      ...asNonEmptyArray((previous.notes as Note[]) ?? []),
      ...(extraction.notes ?? []).map(
        (entry) => ({ text: entry, time: new Date().toISOString() }) as Note
      ),
      ...(extraction.other ?? []).map(
        (entry) => ({ text: `[Other] ${entry}`, time: new Date().toISOString() }) as Note
      ),
    ],
    createdAt: previous.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(dailyLogRef, stripUndefinedDeep(merged), { merge: true });
  return merged;
};

export const subscribeToJournalChats = (
  userId: string,
  profileId: string,
  onUpdate: (messages: JournalChatRecord[]) => void,
  onError?: (error: Error) => void
): ReturnType<typeof onSnapshot> => {
  const q = query(
    getJournalChatsCollection(userId, profileId),
    orderBy('timestamp', 'desc'),
    limit(60)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs
        .map((docSnapshot) => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
        }))
        .reverse() as JournalChatRecord[];
      onUpdate(messages);
    },
    (error) => {
      if (onError) onError(error);
    }
  );
};

export const subscribeToRecentDailyLogs = (
  userId: string,
  profileId: string,
  onUpdate: (logs: DailyLog[]) => void,
  maxDays = 7
): ReturnType<typeof onSnapshot> => {
  const q = query(
    getDailyLogsCollection(userId, profileId),
    orderBy('date', 'desc'),
    limit(maxDays)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const logs = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        ...docSnapshot.data(),
      })) as DailyLog[];
      onUpdate(logs);
    },
    () => undefined
  );
};