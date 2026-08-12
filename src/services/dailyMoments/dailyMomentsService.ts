import { doc, getDoc, setDoc } from 'firebase/firestore';
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