import { doc, getDoc, setDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { getDailyMomentsCollectionRef } from '../../lib/collections';
import type { DailyMoment } from '../../models/dailyMoment';

export const getDailyMoment = async (
  userId: string,
  profileId: string,
  dateId: string
): Promise<DailyMoment | null> => {
  const collectionRef = getDailyMomentsCollectionRef(userId, profileId);
  const docRef = doc(collectionRef, dateId);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as DailyMoment;
  }

  return null;
};

export const saveDailyMoment = async (
  userId: string,
  profileId: string,
  dailyMoment: DailyMoment
): Promise<void> => {
  const collectionRef = getDailyMomentsCollectionRef(userId, profileId);
  const docRef = doc(collectionRef, dailyMoment.id);
  
  await setDoc(docRef, dailyMoment, { merge: true });
};

export const getRecentDailyMoments = async (
  userId: string,
  profileId: string,
  days: number = 7
): Promise<DailyMoment[]> => {
  const collectionRef = getDailyMomentsCollectionRef(userId, profileId);
  const q = query(collectionRef, orderBy('date', 'desc'), limit(days));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyMoment));
};