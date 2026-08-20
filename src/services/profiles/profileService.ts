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
import type { ExpectantProfile } from "../../models/profile";
import { getUsersCollection, getProfilesCollection, getKeysCollection } from '../../lib/collections';


export type ProfileInput = Omit<
  ExpectantProfile,
  "id" | "creatorId" | "sharedWith" | "createdAt" | "updatedAt"
>;

export type Profile = ExpectantProfile;

const toProfile = (
  id: string,
  data: DocumentData,
): Profile => ({
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
  emergencyContact: data.emergencyContact ?? "",
  status: data.status ?? "active",
  creatorId: data.creatorId ?? '',
  sharedWith: data.sharedWith ?? [],
  createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
  updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
});

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

  const reference = await addDoc(getProfilesCollection(userId), {
    ...profile,
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
  return updateDoc(docSnap.ref, {
    ...profile,
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
