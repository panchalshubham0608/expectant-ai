import { addDoc, collection, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { GeminiPregnancyReportResponse } from './reportSummaryService';

export interface MedicalReportRecord {
  id: string;
  title: string;
  reportDate: string;
  reportType: GeminiPregnancyReportResponse['reportType'];
  summary: GeminiPregnancyReportResponse['summary'];
  metadata: GeminiPregnancyReportResponse['metadata'];
  measurements: GeminiPregnancyReportResponse['measurements'];
  medicines: GeminiPregnancyReportResponse['medicines'];
  diagnosesMentioned: string[];
  recommendations: string[];
  nextVisit: string | null;
  confidence: number;
  fileName: string;
  reportUrl: string;
}

const medicalReportsCollection = (userId: string, profileId: string) => {
  if (!db) throw new Error('Firebase is not configured.');
  return collection(db, 'users', userId, 'profiles', profileId, 'medicalReports');
};

export const saveAnalyzedMedicalReport = async (
  userId: string,
  profileId: string,
  reportUrl: string,
  structuredReport: GeminiPregnancyReportResponse,
) => {
  if (!db) {
    throw new Error('Firebase is not configured.');
  }

  const reportDate = structuredReport.metadata.reportDate || new Date().toISOString().slice(0, 10);
  const title = structuredReport.metadata.title || new URL(reportUrl).hostname || 'Uploaded Report';

  const docRef = await addDoc(medicalReportsCollection(userId, profileId), {
    title,
    reportDate,
    reportType: structuredReport.reportType,
    summary: structuredReport.summary,
    metadata: structuredReport.metadata,
    measurements: structuredReport.measurements,
    medicines: structuredReport.medicines,
    diagnosesMentioned: structuredReport.diagnosesMentioned,
    recommendations: structuredReport.recommendations,
    nextVisit: structuredReport.nextVisit,
    confidence: structuredReport.confidence,
    fileName: title,
    reportUrl,
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    title,
    reportDate,
    reportType: structuredReport.reportType,
    summary: structuredReport.summary,
    metadata: structuredReport.metadata,
    measurements: structuredReport.measurements,
    medicines: structuredReport.medicines,
    diagnosesMentioned: structuredReport.diagnosesMentioned,
    recommendations: structuredReport.recommendations,
    nextVisit: structuredReport.nextVisit,
    confidence: structuredReport.confidence,
    fileName: title,
    reportUrl,
  } satisfies MedicalReportRecord;
};

export const subscribeToMedicalReports = (
  userId: string,
  profileId: string,
  onChange: (records: MedicalReportRecord[]) => void,
  onError: (error: Error) => void,
) => {
  return onSnapshot(
    medicalReportsCollection(userId, profileId),
    (snapshot) => {
      const records = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          title: typeof data.title === 'string' ? data.title : 'Uploaded Report',
          reportDate:
            typeof data.reportDate === 'string'
              ? data.reportDate
              : new Date().toISOString().slice(0, 10),
          reportType: data.reportType,
          summary: data.summary,
          metadata: data.metadata,
          measurements: data.measurements,
          medicines: data.medicines,
          diagnosesMentioned: Array.isArray(data.diagnosesMentioned) ? data.diagnosesMentioned : [],
          recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
          nextVisit: typeof data.nextVisit === 'string' ? data.nextVisit : null,
          confidence: typeof data.confidence === 'number' ? data.confidence : 0,
          fileName: typeof data.fileName === 'string' ? data.fileName : 'report.pdf',
          reportUrl: typeof data.reportUrl === 'string' ? data.reportUrl : '',
        } satisfies MedicalReportRecord;
      });
      onChange(records);
    },
    onError,
  );
};
