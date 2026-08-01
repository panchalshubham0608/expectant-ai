export interface ExpectantProfile {
  id: string;

  // Ownership
  creatorId: string;
  sharedWith: string[];

  // Personal Details
  fullName: string;
  dateOfBirth: string;
  location?: string;
  bloodGroup?: string;

  // Pregnancy
  lastMenstrualPeriod: string;
  ultrasoundLastMenstrualPeriod?: string;
  expectedDueDate: string;

  // Care
  careProvider?: string;
  primaryHospital?: string;
  primaryHospitalLocation?: string;
  emergencyContact?: string;

  // Status
  status: "active" | "completed" | "archived";

  // Timestamps
  createdAt: string;
  updatedAt: string;
}