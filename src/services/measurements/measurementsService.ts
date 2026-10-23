import { deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Measurement } from '../../models/measurement';
import { getMeasurementsCollection } from '../../lib/collections';

const LEGACY_OBSOLETE_DOC_IDS = [
  'weight',
  'Weight',
  'heart-rate',
  'Heart Rate',
  'gest-age',
  'Gestational Age',
  'baby-heart-rate',
  'Baby Heart Rate',
];

const stripUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined && k !== 'serverUpdatedAt') {
        cleaned[k] = stripUndefined(v);
      }
    }
    return cleaned as T;
  }
  return value;
};

export const updateMeasurements = async (
  userId: string,
  profileId: string,
  measurements: Measurement[],
) => {
  if (!db) {
    throw new Error('Firestore database is not initialized.');
  }
  const batch = writeBatch(db);
  const collectionRef = getMeasurementsCollection(userId, profileId);
  const savedIds = new Set(measurements.map((m) => m.id));

  measurements.forEach((measurement) => {
    const docRef = doc(collectionRef, measurement.id);
    const cleaned = stripUndefined({
      ...measurement,
      updatedAt: new Date().toISOString(),
    });
    batch.set(docRef, {
      ...cleaned,
      serverUpdatedAt: serverTimestamp(),
    });
  });

  for (const legacyId of LEGACY_OBSOLETE_DOC_IDS) {
    if (!savedIds.has(legacyId)) {
      batch.delete(doc(collectionRef, legacyId));
    }
  }

  await batch.commit();
};

export const saveSingleMeasurement = async (
  userId: string,
  profileId: string,
  measurement: Measurement,
): Promise<void> => {
  const collectionRef = getMeasurementsCollection(userId, profileId);
  const docRef = doc(collectionRef, measurement.id);
  const cleaned = stripUndefined({
    ...measurement,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(docRef, {
    ...cleaned,
    serverUpdatedAt: serverTimestamp(),
  });
};

export const deleteMeasurement = async (
  userId: string,
  profileId: string,
  measurementId: string,
): Promise<void> => {
  const collectionRef = getMeasurementsCollection(userId, profileId);
  await deleteDoc(doc(collectionRef, measurementId));
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