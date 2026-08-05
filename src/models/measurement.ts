export interface Measurement {
  id: string;
  reportId?: string;
  type: string;
  label: string;

  category:
    | "blood"
    | "ultrasound"
    | "urine"
    | "vitals"
    | "other";

  value: string;
  unit?: string;
  normalRange?: string;
  measuredAt: string;
}
