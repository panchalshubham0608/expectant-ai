import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { DailyMomentResponse } from '../ai/dailyMomentService';
import { getDailyMomentsCollectionRef } from '../../lib/collections';

export interface DailyMoment extends DailyMomentResponse {
  id: string; // The date string, e.g., '2026-08-12'
  date: string;
  pregnancyWeek: number;
  pregnancyDay: number;
  createdAt: number;
}

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