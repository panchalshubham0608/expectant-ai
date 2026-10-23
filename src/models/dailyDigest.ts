import type {
  DailyDigestResponse,
  BabyNameSuggestion,
  BabyNameGender,
} from '../services/ai/dailyDigestService';

export type { BabyNameSuggestion, BabyNameGender };

export interface FavoriteBabyName extends BabyNameSuggestion {
  id: string;
  createdAt: number;
}

export interface DailyDigest extends DailyDigestResponse {
  id: string; // The date string, e.g., '2026-08-12'
  date: string;
  pregnancyWeek: number;
  pregnancyDay: number;
  createdAt: number;
}
