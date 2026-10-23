import { doc, getDocs, writeBatch } from 'firebase/firestore';
import { getGeneratedBabyNamesCollection, requireDb } from '../../lib/collections';
import type { BabyNameSuggestion, GeneratedBabyName } from '../../models/dailyDigest';
import { toFavoriteNameId } from './favoriteBabyNamesService';

export const saveGeneratedBabyNames = async (
  userId: string,
  profileId: string,
  suggestions: BabyNameSuggestion[],
  date: string
): Promise<void> => {
  if (!suggestions || suggestions.length === 0) return;

  const db = requireDb();
  const batch = writeBatch(db);
  const collectionRef = getGeneratedBabyNamesCollection(userId, profileId);
  const now = Date.now();

  for (const item of suggestions) {
    const trimmedName = item.name?.trim();
    if (!trimmedName) continue;

    const id = toFavoriteNameId(trimmedName);
    const docRef = doc(collectionRef, id);
    const record: GeneratedBabyName = {
      id,
      name: trimmedName,
      meaning: item.meaning,
      gender: item.gender,
      date,
      createdAt: now,
    };

    batch.set(docRef, record, { merge: true });
  }

  await batch.commit();
};

export const getGeneratedBabyNames = async (
  userId: string,
  profileId: string
): Promise<string[]> => {
  const collectionRef = getGeneratedBabyNamesCollection(userId, profileId);
  const snapshot = await getDocs(collectionRef);

  return snapshot.docs
    .map((d) => {
      const data = d.data() as Partial<GeneratedBabyName>;
      return typeof data.name === 'string' ? data.name.trim() : '';
    })
    .filter(Boolean);
};
