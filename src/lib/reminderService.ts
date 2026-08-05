import {
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getRemindersCollection } from '../lib/collections';
import type { Reminder } from '../models/reminder';

export const subscribeToReminders = (
  userId: string,
  profileId: string,
  onChange: (records: Reminder[]) => void,
  onError: (error: Error) => void
) => {
  const remindersRef = getRemindersCollection(userId, profileId);
  const q = query(remindersRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const reminders = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }) as Reminder);
      onChange(reminders);
    },
    onError
  );
};

export const saveReminder = async (
  userId: string,
  profileId: string,
  reminder: Omit<Reminder, 'id'> & { id?: string }
): Promise<string> => {
  const remindersRef = getRemindersCollection(userId, profileId);
  const docRef = reminder.id ? doc(remindersRef, reminder.id) : doc(remindersRef);

  await setDoc(
    docRef,
    {
      ...reminder,
      updatedAt: serverTimestamp(),
      ...(reminder.id ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );

  return docRef.id;
};

export const deleteReminder = async (
  userId: string,
  profileId: string,
  reminderId: string
): Promise<void> => {
  const remindersRef = getRemindersCollection(userId, profileId);
  await deleteDoc(doc(remindersRef, reminderId));
};