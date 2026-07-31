import type { Meal } from "./meal";
import type { HydrationLog } from "./hydration";
import type { Activity } from "./activity";
import type { Symptom } from "./symptom";
import type { MedicationLog } from "./medication";
import type { SleepLog } from "./sleep";
import type { VitalLog } from "./vital";
import type { MoodLog } from "./mood";
import type { Note } from "./note";
import type { DailyAISummary } from "./dailyAISummary";

export interface DailyLog {
  id: string; // YYYY-MM-DD
  profileId: string;
  date: string;
  pregnancyWeek: number;
  status: "ongoing" | "completed";
  meals: Meal[];
  hydration: HydrationLog[];
  activities: Activity[];
  symptoms: Symptom[];
  medications: MedicationLog[];
  sleep?: SleepLog;
  vitals: VitalLog[];
  mood?: MoodLog;
  notes: Note[];
  aiSummary?: DailyAISummary;
  createdAt: string;
  updatedAt: string;
}