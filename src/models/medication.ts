export interface Medication {
  id: string;
  name: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  discontinued?: boolean;
  discontinuedAt?: string;
}

export interface MedicationLog {
  medicineName: string;
  scheduledTime?: string;
  takenTime?: string;
  dose?: string;
  taken: boolean;
}
