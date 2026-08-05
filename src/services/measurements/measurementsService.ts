import { collection, doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Measurement } from '../../models/measurement';

const measurementsCollection = (userId: string, profileId: string) => {
  if (!db) throw new Error('Firebase is not configured.');
  return collection(db, 'users', userId, 'profiles', profileId, 'measurements');
};

export const updateMeasurements = async (
  userId: string,
  profileId: string,
  measurements: Measurement[],
) => {
  if (!db) throw new Error('Firebase is not configured.');
  const batch = writeBatch(db);

  measurements.forEach((measurement) => {
    const docRef = doc(measurementsCollection(userId, profileId), measurement.id);
    batch.set(docRef, measurement, { merge: true });
  });

  await batch.commit();
};

export const subscribeToMeasurements = (
  userId: string,
  profileId: string,
  onChange: (measurements: Measurement[]) => void,
  onError: (error: Error) => void,
) => {
  return onSnapshot(
    measurementsCollection(userId, profileId),
    (snapshot) => {
      const measurements = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Measurement);
      onChange(measurements);
    },
    onError,
  );
};