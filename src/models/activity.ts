export interface Activity {
  id: string;
  type: string;
  durationMinutes?: number;
  intensity?:
    | "low"
    | "moderate"
    | "high";
  timestamp: string;
  notes?: string;
}
