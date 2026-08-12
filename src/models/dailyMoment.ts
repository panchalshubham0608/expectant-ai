export type DailyMomentCategory =
  | "baby-fact"
  | "body-fact"
  | "pregnancy-tip"
  | "did-you-know"
  | "milestone"
  | "couple"
  | "fun-fact"
  | "mindful";

export interface DailyMoment {
  id: string;
  profileId: string;

  date: string;              // YYYY-MM-DD
  pregnancyWeek: number;
  pregnancyDay: number;

  category: DailyMomentCategory;

  title: string;
  content: string;

  emoji?: string;

  source?: string;

  generatedAt: string;
}
