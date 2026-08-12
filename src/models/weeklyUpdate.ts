import type { WeeklyUpdateResponse } from '../services/ai/weeklyUpdateService';

export interface WeeklyUpdate extends WeeklyUpdateResponse {
  id: string; // The date string, e.g., '2026-08-12'
  date: string;
  pregnancyWeek: number;
  pregnancyDay: number;
  createdAt: number;
}