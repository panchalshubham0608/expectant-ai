export interface DoctorVisit {
  id: string;
  doctor: string;
  hospital?: string;
  specialty?: string;
  visitDate: string;
  reason?: string;
  notes?: string;
  recommendations: string[];
  nextVisit?: string;
  reportIds: string[];
}
