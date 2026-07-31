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
