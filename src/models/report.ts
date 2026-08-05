import type { Medication } from "./medication";
import type { Measurement } from "./measurement";


export type ReportType =
  | 'ultrasound'
  | 'blood-test'
  | 'urine-test'
  | 'prescription'
  | 'consultation'
  | 'vaccination'
  | 'hospital'
  | 'genetic-screening'
  | 'other';

export interface ReportMetadata {
    title: string | null;
    hospital: string | null;
    doctor: string | null;
    reportDate: string | null;
    pregnancyWeek: string | null;
};

export interface ReportSummary {
    plainEnglish: string;
    importantFindings: string[];
    followUpActions: string[];
    questionsForDoctor: string[];
};

export interface Report {
  id: string;
  profileId: string;

  title: string;
  reportType: ReportType;
  reportDate: string;

  metadata: ReportMetadata;
  summary: ReportSummary;
  measurements: Array<Measurement>;
  medicines: Array<Medication>;
  diagnoses: string[];
  recommendations: string[];
  nextVisit?: string;
  confidence: number;
  reportUrl: string;
  createdAt: string;
  updatedAt: string;
}
