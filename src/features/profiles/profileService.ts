import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  or,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  arrayUnion,
  collectionGroup,
  getDocs,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getAuth } from 'firebase/auth';
import type { Profile, ProfileInput } from './types';

const profilesCollection = (userId: string) => {
  if (!db)
    throw new Error(
      'Firebase is not configured. Add the VITE_FIREBASE_* values to your .env file.',
    );
  return collection(db, 'users', userId, 'profiles');
};

const toProfile = (id: string, data: ProfileInput): Profile => ({ id, ...data });

export const createProfile = async (userId: string, profile: ProfileInput) => {
  const reference = await addDoc(profilesCollection(userId), {
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
  const auth = getAuth();
  const userEmail = auth.currentUser?.email;

  const conditions = [where('creatorId', '==', userId)];
  if (userEmail) conditions.push(where('sharedWith', 'array-contains', userEmail.toLowerCase()));

  const q = query(profilesCollection(userId), or(...conditions));
  const snapshot = await getDocs(q);
  const docSnap = snapshot.docs.find((d) => d.id === profileId);

  if (!docSnap) throw new Error('Profile not found or access denied.');

  return updateDoc(docSnap.ref, {
    ...profile,
    updatedAt: serverTimestamp(),
  });
};

export const shareProfile = async (profileId: string, email: string) => {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  const userEmail = auth.currentUser?.email;
  if (!userId) throw new Error('User not authenticated.');

  const conditions = [where('creatorId', '==', userId)];
  if (userEmail) conditions.push(where('sharedWith', 'array-contains', userEmail.toLowerCase()));

  const q = query(profilesCollection(userId), or(...conditions));
  const snapshot = await getDocs(q);
  const docSnap = snapshot.docs.find((d) => d.id === profileId);

  if (!docSnap) throw new Error('Profile not found or access denied.');

  return updateDoc(docSnap.ref, {
    sharedWith: arrayUnion(email.toLowerCase()),
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
    query(profilesCollection(userId), or(...conditions), orderBy('createdAt', 'desc')),
    (snapshot) => {
      onChange(
        snapshot.docs.map((profile) => toProfile(profile.id, profile.data() as ProfileInput)),
      );
    },
    onError,
  );
}

export const subscribeToProfile = (
  userId: string, // Kept for signature compatibility
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
    query(profilesCollection(userId), or(...conditions)),
    (snapshot) => {
      const docSnap = snapshot.docs.find((d) => d.id === profileId);
      if (docSnap) {
        onChange(toProfile(docSnap.id, docSnap.data() as ProfileInput));
      } else {
        onChange(null);
      }
    },
    onError,
  );
};
