import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { MedicalRecord } from './types';
import type { GeminiPregnancyReportResponse } from './reportSummaryService';

const getMedicalRecordsCollection = (userId: string, profileId: string) => {
  if (!db) {
    throw new Error('Firebase is not configured.');
  }
  return collection(db, 'users', userId, 'profiles', profileId, 'medicalRecords');
};

export const saveAnalyzedMedicalReport = async (
  userId: string,
  profileId: string,
  reportUrl: string,
  summary: GeminiPregnancyReportResponse
): Promise<string> => {
  const recordsRef = getMedicalRecordsCollection(userId, profileId);
  const newRecordRef = doc(recordsRef);

  const record: Partial<MedicalRecord> & { createdAt: any } = {
    id: newRecordRef.id,
    title: summary.metadata?.title || 'Uploaded Report',
    reportDate: summary.metadata?.reportDate || new Date().toISOString(),
    reportType: summary.reportType || 'General',
    summary: summary.summary,
    metadata: summary.metadata,
    measurements: summary.measurements || [],
    medicines: summary.medicines || [],
    diagnosesMentioned: summary.diagnosesMentioned || [],
    recommendations: summary.recommendations || [],
    nextVisit: summary.nextVisit || '',
    confidence: summary.confidence || 0,
    reportUrl,
    createdAt: serverTimestamp(),
  };

  await setDoc(newRecordRef, record);
  return newRecordRef.id;
};

export const subscribeToMedicalReports = (
  userId: string,
  profileId: string,
  onChange: (records: MedicalRecord[]) => void,
  onError: (error: Error) => void
) => {
  const recordsRef = getMedicalRecordsCollection(userId, profileId);
  const q = query(recordsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const records = snapshot.docs.map((docSnap) => docSnap.data() as MedicalRecord);
      onChange(records);
    },
    onError
  );
};