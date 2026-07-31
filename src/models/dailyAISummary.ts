export interface DailyAISummary {
  generatedAt: string;
  summary: string;
  positives: string[];
  concerns: string[];
  recommendations: string[];
  unansweredQuestions: string[];
  nutritionScore?: number;
  hydrationScore?: number;
  activityScore?: number;
  overallScore?: number;
}
