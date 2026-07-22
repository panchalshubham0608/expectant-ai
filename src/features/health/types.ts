export interface HealthScore {
  score: number;
  trend: string;
  highlight: string;
  details: string[];
}

export interface MotherProfile {
  name: string;
  dateOfBirth: string;
  lmp: string;
  dueDate: string;
  location: string;
  avatar: string;
  bloodGroup?: string;
  emergencyContact?: string;
  careProvider?: string;
}

export interface Measurement {
  id: string;
  label: string;
  value: string;
  previousValue?: string;
  change: string;
  lastMeasuredDate: string;
}

export interface MedicalRecord {
  id: string;
  title: string;
  date: string;
  status: 'Completed' | 'Pending' | 'Action Needed';
  summary: string;
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
