import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { DoctorVisit } from './types';

const doctorVisitsCollection = (userId: string, profileId: string) => {
  if (!db) throw new Error('Firebase is not configured.');
  return collection(db, 'users', userId, 'profiles', profileId, 'appointments');
};

export const saveDoctorVisit = async (
  userId: string,
  profileId: string,
  visitInput: Omit<DoctorVisit, 'id'>,
) => {
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const docRef = await addDoc(doctorVisitsCollection(userId, profileId), {
    ...visitInput,
    completed: false,
    completedNote: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    ...visitInput,
    completed: false,
    completedNote: null,
  } satisfies DoctorVisit;
};

export const markDoctorVisitCompleted = async (
  userId: string,
  profileId: string,
  visitId: string,
  completedNote: string,
) => {
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  await updateDoc(doc(db, 'users', userId, 'profiles', profileId, 'appointments', visitId), {
    completed: true,
    completedNote,
    updatedAt: serverTimestamp(),
  });
};

export const subscribeToDoctorVisits = (
  userId: string,
  profileId: string,
  onChange: (visits: DoctorVisit[]) => void,
  onError: (error: Error) => void,
) => {
  return onSnapshot(
    query(doctorVisitsCollection(userId, profileId), orderBy('createdAt', 'desc')),
    (snapshot) => {
      const visits = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          provider: typeof data.provider === 'string' ? data.provider : '',
          specialty: typeof data.specialty === 'string' ? data.specialty : '',
          date: typeof data.date === 'string' ? data.date : '',
          note: typeof data.note === 'string' ? data.note : '',
          completed: typeof data.completed === 'boolean' ? data.completed : false,
          completedNote: typeof data.completedNote === 'string' ? data.completedNote : null,
        } satisfies DoctorVisit;
      });

      onChange(visits);
    },
    onError,
  );
};
