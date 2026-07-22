import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../../lib/firebase';
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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return reference.id;
};

export const updateProfile = (userId: string, profileId: string, profile: ProfileInput) =>
  updateDoc(doc(profilesCollection(userId), profileId), {
    ...profile,
    updatedAt: serverTimestamp(),
  });

export const subscribeToProfiles = (
  userId: string,
  onChange: (profiles: Profile[]) => void,
  onError: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(profilesCollection(userId), orderBy('createdAt', 'desc')),
    (snapshot) => {
      onChange(
        snapshot.docs.map((profile) => toProfile(profile.id, profile.data() as ProfileInput)),
      );
    },
    onError,
  );

export const subscribeToProfile = (
  userId: string,
  profileId: string,
  onChange: (profile: Profile | null) => void,
  onError: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    doc(profilesCollection(userId), profileId),
    (snapshot) => {
      onChange(snapshot.exists() ? toProfile(snapshot.id, snapshot.data() as ProfileInput) : null);
    },
    onError,
  );
