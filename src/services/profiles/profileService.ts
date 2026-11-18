import {
  addDoc,
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  or,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { DocumentData, DocumentSnapshot, Unsubscribe } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import {
  formatEmergencyContactSummary,
  getProfileEmergencyContacts,
  type ExpectantProfile,
} from "../../models/profile";
import { getUsersCollection, getProfilesCollection, getKeysCollection } from '../../lib/collections';


export type ProfileInput = Omit<
  ExpectantProfile,
  "id" | "creatorId" | "sharedWith" | "createdAt" | "updatedAt"
>;

export type Profile = ExpectantProfile;

const toProfile = (
  id: string,
  data: DocumentData,
): Profile => {
  const hasStructuredContacts = Array.isArray(data.emergencyContacts);
  const emergencyContacts = getProfileEmergencyContacts({
    emergencyContacts: hasStructuredContacts ? data.emergencyContacts : undefined,
    emergencyContact: typeof data.emergencyContact === "string" ? data.emergencyContact : "",
  });
  const emergencyContact = hasStructuredContacts
    ? emergencyContacts[0]
      ? formatEmergencyContactSummary(emergencyContacts[0])
      : ""
    : typeof data.emergencyContact === "string"
      ? data.emergencyContact
      : "";

  return {
    id,
    fullName: data.fullName ?? "",
    dateOfBirth: data.dateOfBirth ?? "",
    location: data.location ?? "",
    bloodGroup: data.bloodGroup ?? "",
    lastMenstrualPeriod: data.lastMenstrualPeriod ?? "",
    ultrasoundLastMenstrualPeriod: data.ultrasoundLastMenstrualPeriod ?? "",
    expectedDueDate: data.expectedDueDate ?? "",
    careProvider: data.careProvider ?? "",
    primaryHospital: data.primaryHospital ?? "",
    primaryHospitalLocation: data.primaryHospitalLocation ?? "",
    emergencyContact,
    emergencyContacts,
    googleCalendarId: data.googleCalendarId ?? "",
    syncRemindersToCalendar: data.syncRemindersToCalendar ?? false,
    syncAppointmentsToCalendar: data.syncAppointmentsToCalendar ?? false,
    babyNameContext: data.babyNameContext ?? "",
    babyNameCount: typeof data.babyNameCount === "number" ? data.babyNameCount : undefined,
    spiritualSlokaContext: data.spiritualSlokaContext ?? "",
    babyTalkEnabled: data.babyTalkEnabled ?? false,
    babyTalkContext: data.babyTalkContext ?? "",
    customMessage: data.customMessage ?? "",
    customMessageUpdatedAt:
      data.customMessageUpdatedAt?.toDate?.()?.toISOString() ??
      (typeof data.customMessageUpdatedAt === "string"
        ? data.customMessageUpdatedAt
        : data.customMessage
          ? new Date().toISOString()
          : undefined),
    customMessageDismissed: data.customMessageDismissed ?? false,
    status: data.status ?? "active",
    creatorId: data.creatorId ?? '',
    sharedWith: data.sharedWith ?? [],
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  };
};

const stripProtectedProfileFields = <T extends Record<string, unknown>>(payload: T) => {
  const {
    id: _id,
    creatorId: _creatorId,
    sharedWith: _sharedWith,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...safeFields
  } = payload;
  void _id;
  void _creatorId;
  void _sharedWith;
  void _createdAt;
  void _updatedAt;
  return safeFields;
};

const getUpdatableProfileDocSnap = async (
  profileId: string,
  creatorId?: string,
): Promise<DocumentSnapshot<DocumentData>> => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated.');
  }

  const userId = creatorId || user.uid;
  const { email: userEmail } = user;

  const conditions = [where('creatorId', '==', userId)];
  if (userEmail) {
    conditions.push(where('sharedWith', 'array-contains', userEmail.toLowerCase()));
  }

  const q = query(getProfilesCollection(userId), or(...conditions));
  const snapshot = await getDocs(q);
  const docSnap = snapshot.docs.find((d) => d.id === profileId);

  if (!docSnap) {
    throw new Error('Profile not found or access denied.');
  }

  return docSnap;
};

export const createProfile = async (userId: string, profile: ProfileInput) => {
  const userRef = doc(getUsersCollection(), userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  const emergencyContacts = getProfileEmergencyContacts(profile);
  const emergencyContact = emergencyContacts[0]
    ? formatEmergencyContactSummary(emergencyContacts[0])
    : "";

  const reference = await addDoc(getProfilesCollection(userId), {
    ...stripProtectedProfileFields(profile as Record<string, unknown>),
    emergencyContacts,
    emergencyContact,
    creatorId: userId,
    sharedWith: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return reference.id;
};

// userId is kept in the signature to prevent breaking existing usages in other files
export const updateProfile = async (userId: string, profileId: string, profile: Partial<ProfileInput>) => {
  const docSnap = await getUpdatableProfileDocSnap(profileId, userId);
  const safePayload: Record<string, unknown> = stripProtectedProfileFields(
    profile as Record<string, unknown>,
  );

  if ("emergencyContacts" in profile || "emergencyContact" in profile) {
    const emergencyContacts = getProfileEmergencyContacts(profile);
    safePayload.emergencyContacts = emergencyContacts;
    safePayload.emergencyContact = emergencyContacts[0]
      ? formatEmergencyContactSummary(emergencyContacts[0])
      : "";
  }

  return updateDoc(docSnap.ref, {
    ...safePayload,
    updatedAt: serverTimestamp(),
  });
};

export const shareProfile = async (profileId: string, email: string) => {
  const docSnap = await getUpdatableProfileDocSnap(profileId);
  return updateDoc(docSnap.ref, {
    sharedWith: arrayUnion(email.toLowerCase()),
    updatedAt: serverTimestamp(),
  });
};

export const unshareProfile = async (profileId: string, email: string) => {
  const docSnap = await getUpdatableProfileDocSnap(profileId);
  return updateDoc(docSnap.ref, {
    sharedWith: arrayRemove(email.toLowerCase()),
    updatedAt: serverTimestamp(),
  });
};

export const toggleSyncRemindersToCalendar = async (profileId: string, enabled: boolean) => {
  const docSnap = await getUpdatableProfileDocSnap(profileId);
  return updateDoc(docSnap.ref, {
    syncRemindersToCalendar: enabled,
    updatedAt: serverTimestamp(),
  });
};

export const toggleSyncAppointmentsToCalendar = async (profileId: string, enabled: boolean) => {
  const docSnap = await getUpdatableProfileDocSnap(profileId);
  return updateDoc(docSnap.ref, {
    syncAppointmentsToCalendar: enabled,
    updatedAt: serverTimestamp(),
  });
};

export const getProfileGoogleCalendarId = async (profileId: string): Promise<string | null> => {
  const docSnap = await getUpdatableProfileDocSnap(profileId);
  const calendarId = docSnap.data()?.googleCalendarId;
  return typeof calendarId === 'string' && calendarId.trim() ? calendarId.trim() : null;
};

export const updateProfileGoogleCalendarId = async (
  profileId: string,
  googleCalendarId: string,
) => {
  const docSnap = await getUpdatableProfileDocSnap(profileId);
  return updateDoc(docSnap.ref, {
    googleCalendarId,
    updatedAt: serverTimestamp(),
  });
};

export const subscribeToProfiles = (
  userId: string,
  userEmail: string | null | undefined,
  onChange: (profiles: Profile[]) => void,
  onError: (error: Error) => void,
): Unsubscribe => {
  const conditions = [where('creatorId', '==', userId)];
  if (userEmail) {
    conditions.push(where('sharedWith', 'array-contains', userEmail.toLowerCase()));
  }
  return onSnapshot(
    query(getProfilesCollection(userId), or(...conditions), orderBy('createdAt', 'desc')),
    (snapshot) => {
      onChange(
        snapshot.docs.map((profile) => toProfile(profile.id, profile.data())),
      );
    },
    onError,
  );
}
export const subscribeToProfile = (
  userId: string,
  profileId: string,
  onChange: (profile: Profile | null) => void,
  onError: (error: Error) => void,
): Unsubscribe => {
  const auth = getAuth();
  const userEmail = auth.currentUser?.email;

  const conditions = [where('creatorId', '==', userId)];
  if (userEmail) {
    conditions.push(where('sharedWith', 'array-contains', userEmail.toLowerCase()));
  }

  return onSnapshot(
    query(getProfilesCollection(userId), or(...conditions)),
    (snapshot) => {
      const docSnap = snapshot.docs.find((d) => d.id === profileId);
      if (docSnap) {
        onChange(toProfile(docSnap.id, docSnap.data()));
      } else {
        onChange(null);
      }
    },
    onError,
  );
};

export const getGeminiApiKey = async (userId: string, profileId: string): Promise<string | null> => {
  const keysCollectionRef = getKeysCollection(userId, profileId);
  const docRef = doc(keysCollectionRef, 'geminiApiKey');

  const docSnap = await getDoc(docRef);
  if (docSnap.exists() && docSnap.data().geminiApiKey) {
    return docSnap.data().geminiApiKey;
  }
  return null;
};

export const saveGeminiApiKey = async (userId: string, profileId: string, apiKey: string): Promise<void> => {
  const keysCollectionRef = getKeysCollection(userId, profileId);
  const docRef = doc(keysCollectionRef, 'geminiApiKey');
  await setDoc(docRef, { geminiApiKey: apiKey }, { merge: true });
};

export const saveBabyNamePreferences = async (
  userId: string,
  profileId: string,
  preferences: { babyNameContext: string; babyNameCount: number },
): Promise<void> => {
  const docSnap = await getUpdatableProfileDocSnap(profileId, userId);
  await updateDoc(docSnap.ref, {
    babyNameContext: preferences.babyNameContext.trim(),
    babyNameCount: preferences.babyNameCount,
    updatedAt: serverTimestamp(),
  });
};

export const saveSpiritualSlokaPreferences = async (
  userId: string,
  profileId: string,
  preferences: { spiritualSlokaContext: string },
): Promise<void> => {
  const docSnap = await getUpdatableProfileDocSnap(profileId, userId);
  await updateDoc(docSnap.ref, {
    spiritualSlokaContext: preferences.spiritualSlokaContext.trim(),
    updatedAt: serverTimestamp(),
  });
};

export const saveBabyTalkPreferences = async (
  userId: string,
  profileId: string,
  preferences: { babyTalkEnabled: boolean; babyTalkContext?: string },
): Promise<void> => {
  const docSnap = await getUpdatableProfileDocSnap(profileId, userId);
  await updateDoc(docSnap.ref, {
    babyTalkEnabled: preferences.babyTalkEnabled,
    babyTalkContext: (preferences.babyTalkContext ?? '').trim(),
    updatedAt: serverTimestamp(),
  });
};

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const isCustomMessageWithin24Hours = (isoDateString?: string): boolean => {
  if (!isoDateString) return false;
  const updatedTime = new Date(isoDateString).getTime();
  if (Number.isNaN(updatedTime)) return false;
  const now = new Date().getTime();
  const elapsed = now - updatedTime;
  return elapsed >= -60_000 && elapsed <= TWENTY_FOUR_HOURS_MS;
};

export const saveCustomMessage = async (
  userId: string,
  profileId: string,
  customMessage: string,
): Promise<void> => {
  const docSnap = await getUpdatableProfileDocSnap(profileId, userId);
  const trimmed = customMessage.trim();
  await updateDoc(docSnap.ref, {
    customMessage: trimmed,
    customMessageUpdatedAt: trimmed ? serverTimestamp() : null,
    customMessageDismissed: false,
    updatedAt: serverTimestamp(),
  });
};

export const dismissCustomMessage = async (
  userId: string,
  profileId: string,
): Promise<void> => {
  const docSnap = await getUpdatableProfileDocSnap(profileId, userId);
  await updateDoc(docSnap.ref, {
    customMessageDismissed: true,
    updatedAt: serverTimestamp(),
  });
};

