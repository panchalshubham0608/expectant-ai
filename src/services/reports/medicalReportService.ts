import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Report, ReportType } from '../../models/report';
import type { GeminiPregnancyReportResponse } from '../ai/reportSummaryService';
import type { Measurement } from '../../models/measurement';
import type { Medication } from '../../models/medication';

const getReportsCollection = (userId: string, profileId: string) => {
  if (!db) {
    throw new Error('Firebase is not configured.');
  }
  return collection(db, 'users', userId, 'profiles', profileId, 'reports');
};

const toMeasurement = (measurement : GeminiPregnancyReportResponse['measurements'][number]) : Measurement => ({
  id: measurement.name,
  value: measurement.value,
  unit: measurement.unit,
  label: measurement.name,
  measuredAt: measurement.measuredAt || new Date().toISOString(),
});

const toMedication = (medication : GeminiPregnancyReportResponse['medicines'][number]) : Medication => ({
  id: medication.name,
  name: medication.name,
  dose: medication.dose,
  frequency: medication.frequency,
  duration: medication.duration,
  instructions: medication.instructions,
});

export const saveAnalyzedMedicalReport = async (
  userId: string,
  profileId: string,
  reportUrl: string,
  summary: GeminiPregnancyReportResponse
): Promise<string> => {
  const reportsRef = getReportsCollection(userId, profileId);
  const newReportRef = doc(reportsRef);

  const report: Omit<Partial<Report>, 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
    id: newReportRef.id,
    profileId,

    title: summary.metadata?.title || 'Uploaded Report',
    reportType: (summary.reportType as ReportType) || 'other',
    reportDate: summary.metadata?.reportDate || new Date().toISOString(),

    metadata: {
      title: summary.metadata?.title || '',
      hospital: summary.metadata?.hospital || '',
      doctor: summary.metadata?.doctor || '',
      reportDate: summary.metadata?.reportDate || '',
      pregnancyWeek: summary.metadata?.pregnancyWeek || null,
    },
    summary: summary.summary,
    measurements: summary.measurements.map(toMeasurement) || [],
    medicines: summary.medicines.map(toMedication) || [],
    diagnoses: summary.diagnoses || [],
    recommendations: summary.recommendations || [],
    nextVisit: summary.nextVisit || '',
    confidence: summary.confidence || 0,
    reportUrl,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(newReportRef, report);
  return newReportRef.id;
};

export const subscribeToMedicalReports = (
  userId: string,
  profileId: string,
  onChange: (records: Report[]) => void,
  onError: (error: Error) => void
) => {
  const reportsRef = getReportsCollection(userId, profileId);
  const q = query(reportsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const reports = snapshot.docs.map((docSnap) => docSnap.data() as Report);
      onChange(reports);
    },
    onError
  );
};