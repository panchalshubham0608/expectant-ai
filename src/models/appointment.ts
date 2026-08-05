import type { Medication } from './medication';

export interface Appointment {
  id: string;

  // Appointment
  scheduledAt: string;
  completedAt?: string;

  doctorName: string;
  specialty?: string;
  hospital?: string;

  // Purpose
  reason: string;

  // Before visit
  questions: string[];

  // During visit
  observations: string[];

  diagnoses: string[];

  // After visit
  recommendations: string[];
  prescribedMedications: Medication[];

  // Follow-up
  followUpDate?: string;

  // Reports discussed/generated
  medicalRecordIds: string[];
  attachedFiles?: { id: string; name: string; url: string }[];

  status: "scheduled" | "completed" | "cancelled";

  createdAt: string;
  updatedAt: string;
}