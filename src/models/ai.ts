export interface AIInsight {
  id: string;
  category:
    | "nutrition"
    | "medical"
    | "sleep"
    | "exercise"
    | "hydration"
    | "reminder";

  priority:
    | "low"
    | "medium"
    | "high";

  title: string;
  description: string;
  relatedIds: string[];
  generatedAt: string;
}
