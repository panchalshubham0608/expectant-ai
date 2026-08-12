import { doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
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

export const saveReminder = async (userId: string, profileId: string, reminder: Partial<Reminder>): Promise<void> => {
  const colRef = getRemindersCollection(userId, profileId);
  const docRef = reminder.id ? doc(colRef, reminder.id) : doc(colRef);

  const finalReminder = {
    ...reminder,
    id: docRef.id,
    updatedAt: Date.now(),
  };

  await setDoc(docRef, finalReminder, { merge: true });
};

export const deleteReminder = async (userId: string, profileId: string, reminderId: string): Promise<void> => {
  const colRef = getRemindersCollection(userId, profileId);
  const docRef = doc(colRef, reminderId);
  await deleteDoc(docRef);
};