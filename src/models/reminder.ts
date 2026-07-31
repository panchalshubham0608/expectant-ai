export interface Reminder {
  id: string;
  profileId: string;
  type:
    | "medicine"
    | "appointment"
    | "scan"
    | "meal"
    | "hydration"
    | "exercise"
    | "other";

  title: string;
  dueAt: string;
  completed: boolean;
}