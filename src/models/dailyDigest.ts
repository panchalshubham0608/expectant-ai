import type { DailyDigestResponse, BabyNameSuggestion } from '../services/ai/dailyDigestService';

export type { BabyNameSuggestion };

export interface DailyDigest extends DailyDigestResponse {
  id: string; // The date string, e.g., '2026-08-12'
  date: string;
  pregnancyWeek: number;
  pregnancyDay: number;
  createdAt: number;
}
