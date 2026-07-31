export interface Symptom {
  id: string;
  type: string;
  severity:
    | "mild"
    | "moderate"
    | "severe";

  startedAt: string;
  resolvedAt?: string;
  notes?: string;
}
