export interface Observation {

  id: string;
  profileId: string;
  source:
    | "chat"
    | "medical-report"
    | "manual";

  type:
    | "meal"
    | "symptom"
    | "activity"
    | "sleep"
    | "hydration"
    | "medication"
    | "measurement";

  observedAt: string;
  confidence: number;
  payload: Record<string, unknown>;
  processed: boolean;
}