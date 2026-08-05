import type { Medication } from './medication';
import type { Measurement } from './measurement';

export type MedicalReportType =
  | "ultrasound"
  | "blood-test"
  | "urine-test"
  | "prescription"
  | "consultation"
  | "vaccination"
  | "hospital"
  | "genetic-screening"
  | "other";

export interface MedicalRecord {
  id: string;
  profileId: string;

  title: string;
  reportType: MedicalReportType;
  reportDate: string;

  metadata: ReportMetadata;
  summary: ReportSummary;
  measurements: Measurement[];
  medicines: Medication[];
  diagnoses: string[];
  recommendations: string[];
  nextVisit?: string;
  confidence: number;
  reportUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportMetadata {
  doctor?: string;
  hospital?: string;
  pregnancyWeek?: number;
}

export interface ReportSummary {
  plainEnglish: string;
  importantFindings: string[];
  followUpActions: string[];
  questionsForDoctor: string[];
}
