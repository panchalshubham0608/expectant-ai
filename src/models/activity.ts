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
  steps?: number;
  distanceKm?: number;
  caloriesKcal?: number;
  averageHeartRateBpm?: number;
  source?: "manual" | "google_health";
}

export interface DailyActivitySummary {
  date: string; // YYYY-MM-DD
  steps: number;
  distanceKm: number;
  activeCaloriesKcal: number;
  activeMinutes: number;
  exercises: Activity[];
  syncedAt: string;
}

