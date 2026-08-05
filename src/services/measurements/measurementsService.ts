import { doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Measurement } from '../../models/measurement';
import { getMeasurementsCollection } from '../../lib/collections';

export const updateMeasurements = async (
  userId: string,
  profileId: string,
  measurements: Measurement[],
) => {
  const batch = writeBatch(db);

  measurements.forEach((measurement) => {
    const docRef = doc(getMeasurementsCollection(userId, profileId), measurement.id);
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
    getMeasurementsCollection(userId, profileId),
    (snapshot) => {
      const measurements = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Measurement);
      onChange(measurements);
    },
    onError,
  );
};