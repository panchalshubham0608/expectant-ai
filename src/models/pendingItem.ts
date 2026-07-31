export interface PendingItem {
  id: string;
  category:
    | "meal"
    | "medicine"
    | "hydration"
    | "sleep"
    | "activity"
    | "doctor"
    | "other";
  title: string;
  dueTime?: string;
  completed: boolean;
}