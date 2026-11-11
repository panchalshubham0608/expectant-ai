import {
  doc,
  setDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
} from 'firebase/firestore';
import type { Reminder } from '../../models/reminder';
import { getRemindersCollection } from '../../lib/collections';

export const subscribeToReminders = (
  userId: string,
  profileId: string,
  onUpdate: (reminders: Reminder[]) => void,
  onError: (error: Error) => void
) => {
  const colRef = getRemindersCollection(userId, profileId);

  return onSnapshot(
    colRef,
    (snapshot) => {
      const reminders = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      })) as Reminder[];
      onUpdate(reminders);
    },
    onError
  );
};

export const saveReminder = async (
  userId: string,
  profileId: string,
  reminder: Partial<Reminder>
): Promise<string> => {
  const colRef = getRemindersCollection(userId, profileId);
  const isExisting = Boolean(reminder.id);
  const docRef = reminder.id ? doc(colRef, reminder.id) : doc(colRef);

  const sanitized: Record<string, unknown> = {
    id: docRef.id,
    updatedAt: Date.now(),
  };

  for (const [key, value] of Object.entries(reminder)) {
    if (key === 'id') continue;
    if (value === undefined) {
      if (isExisting) {
        sanitized[key] = deleteField();
      }
    } else {
      sanitized[key] = value;
    }
  }

  await setDoc(docRef, sanitized, { merge: true });
  return docRef.id;
};

export const deleteReminder = async (
  userId: string,
  profileId: string,
  reminderId: string
): Promise<void> => {
  const colRef = getRemindersCollection(userId, profileId);
  const docRef = doc(colRef, reminderId);
  await deleteDoc(docRef);
};