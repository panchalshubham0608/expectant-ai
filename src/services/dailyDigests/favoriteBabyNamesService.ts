import {
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFavoriteBabyNamesCollection } from '../../lib/collections';
import type { BabyNameSuggestion, FavoriteBabyName } from '../../models/dailyDigest';

export const toFavoriteNameId = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');

export const shortlistBabyName = async (
  userId: string,
  profileId: string,
  suggestion: BabyNameSuggestion
): Promise<void> => {
  const id = toFavoriteNameId(suggestion.name);
  const collectionRef = getFavoriteBabyNamesCollection(userId, profileId);
  const docRef = doc(collectionRef, id);

  const favorite: FavoriteBabyName = {
    id,
    name: suggestion.name.trim(),
    meaning: suggestion.meaning,
    gender: suggestion.gender,
    createdAt: Date.now(),
  };

  await setDoc(docRef, favorite, { merge: true });
};

export const unshortlistBabyName = async (
  userId: string,
  profileId: string,
  name: string
): Promise<void> => {
  const id = toFavoriteNameId(name);
  const collectionRef = getFavoriteBabyNamesCollection(userId, profileId);
  const docRef = doc(collectionRef, id);

  await deleteDoc(docRef);
};

export const subscribeToFavoriteBabyNames = (
  userId: string,
  profileId: string,
  onChange: (favorites: FavoriteBabyName[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const collectionRef = getFavoriteBabyNamesCollection(userId, profileId);
  const q = query(collectionRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const favorites = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as FavoriteBabyName
      );
      onChange(favorites);
    },
    (error) => {
      onError?.(error);
    }
  );
};
