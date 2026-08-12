import type { DailyMomentResponse } from '../services/ai/dailyMomentService';

export interface DailyMoment extends DailyMomentResponse {
  id: string; // The date string, e.g., '2026-08-12'
  date: string;
  pregnancyWeek: number;
  pregnancyDay: number;
  createdAt: number;
}