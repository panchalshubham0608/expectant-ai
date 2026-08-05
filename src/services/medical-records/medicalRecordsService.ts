import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { MedicalRecord, MedicalReportType } from '../../models/medical';
import type { GeminiPregnancyReportResponse } from '../ai/reportSummaryService';

const getMedicalRecordsCollection = (userId: string, profileId: string) => {
  if (!db) {
    throw new Error('Firebase is not configured.');
  }
  return collection(db, 'users', userId, 'profiles', profileId, 'reports');
};

export const saveAnalyzedMedicalReport = async (
  userId: string,
  profileId: string,
  reportUrl: string,
  summary: GeminiPregnancyReportResponse
): Promise<string> => {
  const recordsRef = getMedicalRecordsCollection(userId, profileId);
  const newRecordRef = doc(recordsRef);

  const record: Omit<Partial<MedicalRecord>, 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
    id: newRecordRef.id,
    profileId,

    title: summary.metadata?.title || 'Uploaded Report',
    reportType: (summary.reportType as MedicalReportType) || 'other',
    reportDate: summary.metadata?.reportDate || new Date().toISOString(),

    metadata: {
      doctor: summary.metadata?.doctor || '',
      hospital: summary.metadata?.hospital || '',
      pregnancyWeek: summary.metadata?.pregnancyWeek ? parseInt(String(summary.metadata.pregnancyWeek)) : undefined,
    },
    summary: summary.summary,
    // measurements: summary.measurements || [],
    // medicines: summary.medicines || [],
    diagnoses: summary.diagnosesMentioned || [],
    recommendations: summary.recommendations || [],
    nextVisit: summary.nextVisit || '',
    confidence: summary.confidence || 0,
    reportUrl,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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