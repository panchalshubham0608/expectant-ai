import { doc, getDoc, setDoc, query, orderBy, limit, getDocs, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { getDailyDigestsCollectionRef } from '../../lib/collections';
import type { DailyDigest } from '../../models/dailyDigest';

export const getTodayDateId = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDailyDigest = async (
  userId: string,
  profileId: string,
  dateId: string
): Promise<DailyDigest | null> => {
  const collectionRef = getDailyDigestsCollectionRef(userId, profileId);
  const docRef = doc(collectionRef, dateId);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as DailyDigest;
  }

  return null;
};

export const subscribeToDailyDigest = (
  userId: string,
  profileId: string,
  dateId: string,
  onChange: (digest: DailyDigest | null) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const collectionRef = getDailyDigestsCollectionRef(userId, profileId);
  const docRef = doc(collectionRef, dateId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onChange({ id: snapshot.id, ...snapshot.data() } as DailyDigest);
      } else {
        onChange(null);
      }
    },
    (error) => {
      onError?.(error);
    }
  );
};

export const saveDailyDigest = async (
  userId: string,
  profileId: string,
  dailyDigest: DailyDigest
): Promise<void> => {
  const collectionRef = getDailyDigestsCollectionRef(userId, profileId);
  const docRef = doc(collectionRef, dailyDigest.id);

  await setDoc(docRef, dailyDigest, { merge: true });
};

export const getRecentDailyDigests = async (
  userId: string,
  profileId: string,
  days: number = 7
): Promise<DailyDigest[]> => {
  const collectionRef = getDailyDigestsCollectionRef(userId, profileId);
  const q = query(collectionRef, orderBy('date', 'desc'), limit(days));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyDigest));
};

export const subscribeToRecentDailyDigests = (
  userId: string,
  profileId: string,
  days: number = 30,
  onChange: (digests: DailyDigest[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const collectionRef = getDailyDigestsCollectionRef(userId, profileId);
  const q = query(collectionRef, orderBy('date', 'desc'), limit(days));

  return onSnapshot(
    q,
    (snapshot) => {
      const digests = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailyDigest));
      onChange(digests);
    },
    (error) => {
      onError?.(error);
    }
  );
};
