export interface Measurement {
  id: string;
  reportId?: string;
  type?: string;
  label: string;

  value: string;
  previousValue?: string;
  unit?: string;
  normalRange?: string;
  measuredAt: string;
  createdAt?: string;
  updatedAt?: string;
}
