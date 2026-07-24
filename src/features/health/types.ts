export interface HealthScore {
  score: number;
  trend: string;
  highlight: string;
  details: string[];
}

export interface Measurement {
  id: string;
  label: string;
  value: string;
  previousValue?: string;
  unit: string;
  lastMeasuredDate: string;
}

export interface MedicalRecord {
  id: string;
  title: string;
  reportDate: string;
  reportType: 'ultrasound' | 'blood-test' | 'urine-test' | 'prescription' | 'consultation' | 'vaccination' | 'hospital' | 'genetic-screening' | 'other';
  summary: {
    plainEnglish: string;
    importantFindings: string[];
    followUpActions: string[];
    questionsForDoctor: string[];
  };
  metadata: {
    title: string | null;
    hospital: string | null;
    doctor: string | null;
    reportDate: string | null;
    pregnancyWeek: string | null;
  };
  measurements: {
    fetalHeartRate: string | null;
    crl: string | null;
    bpd: string | null;
    hc: string | null;
    ac: string | null;
    fl: string | null;
    estimatedFetalWeight: string | null;
    placenta: string | null;
    amnioticFluid: string | null;
    cervixLength: string | null;
    hemoglobin: string | null;
    bloodGroup: string | null;
    rhFactor: string | null;
    tsh: string | null;
    bloodSugar: string | null;
    vitaminD: string | null;
    vitaminB12: string | null;
    iron: string | null;
    bloodPressure: string | null;
    weight: string | null;
    other: Record<string, unknown>;
  };
  medicines: Array<{
    name: string;
    dose: string;
    frequency: string;
    duration: string;
  }>;
  diagnosesMentioned: string[];
  recommendations: string[];
  nextVisit: string | null;
  confidence: number;
  fileName: string;
  reportUrl: string;
}

export interface DoctorVisit {
  id: string;
  provider: string;
  specialty: string;
  date: string;
  note: string;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
}

export interface TimelineEvent {
  id: string;
  week: string;
  date: string;
  title: string;
  status: string;
}
