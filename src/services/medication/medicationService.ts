import {
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Medication } from '../../models/medication';
import { getMedicationsCollection } from '../../lib/collections';

export const subscribeToMedications = (
  userId: string,
  profileId: string,
  onChange: (records: Medication[]) => void,
  onError: (error: Error) => void
) => {
  const medicationsRef = getMedicationsCollection(userId, profileId);
  const q = query(medicationsRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const medications = snapshot.docs.map((docSnap) => docSnap.data() as Medication);
      onChange(medications);
    },
    onError
  );
};

export const saveMedication = async (
  userId: string,
  profileId: string,
  medication: Medication
): Promise<void> => {
  const medicationsRef = getMedicationsCollection(userId, profileId);
  const docRef = doc(medicationsRef, medication.id);

  await setDoc(docRef, {
    ...medication,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const deleteMedication = async (
  userId: string,
  profileId: string,
  medicationId: string
): Promise<void> => {
  const medicationsRef = getMedicationsCollection(userId, profileId);
  await deleteDoc(doc(medicationsRef, medicationId));
};

export const discontinueMedication = async (
  userId: string,
  profileId: string,
  medication: Medication,
  discontinuedAt: string
): Promise<void> => {
  await saveMedication(userId, profileId, {
    ...medication,
    discontinued: true,
    discontinuedAt,
  });
};

export const resumeMedication = async (
  userId: string,
  profileId: string,
  medication: Medication,
  continuedAt: string
): Promise<void> => {
  await saveMedication(userId, profileId, { ...medication, discontinued: false, continuedAt });
};

export const syncMedicationsList = async (
  userId: string,
  profileId: string,
  medications: Medication[]
): Promise<void> => {
  const medicationsRef = getMedicationsCollection(userId, profileId);
  const existingDocs = await getDocs(medicationsRef);

  const batch = writeBatch(db);
  const newIds = new Set(medications.map((m) => m.id));

  // Update or add the current ones
  medications.forEach((med) => {
    const docRef = doc(medicationsRef, med.id);
    // Default fields to prevent undefined values in Firestore
    batch.set(docRef, { ...med, updatedAt: serverTimestamp() }, { merge: true });
  });

  // Remove the ones that were deleted by the user from the current list
  existingDocs.forEach((docSnap) => {
    if (!newIds.has(docSnap.id)) {
      batch.delete(docSnap.ref);
    }
  });

  await batch.commit();
};