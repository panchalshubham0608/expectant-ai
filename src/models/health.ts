export interface HealthSnapshot {
  profileId: string;
  generatedAt: string;
  nutritionScore: number;
  hydrationScore: number;
  activityScore: number;
  sleepScore: number;
  overallScore: number;
  highlights: string[];
  concerns: string[];
  nextActions: string[];
}

export type ActivityStatusLevel =
  | 'optimal'
  | 'steady'
  | 'gentle-needed'
  | 'rest-focused';

export interface AIHealthActivityInsight {
  id: string; // YYYY-MM-DD
  profileId: string;
  date: string;
  generatedAt: string;
  pregnancyWeek: number;
  trimester: string;
  headline: string;
  emoji: string;
  summary: string;
  activityStatus: ActivityStatusLevel;
  activityStatusLabel: string;
  activityScore: number;
  overallScore: number;
  recommendedDailySteps: number;
  recommendedActiveMinutes: number;
  weeklyProgressNote: string;
  highlights: string[];
  nextActions: string[];
  precautions: string[];
}

