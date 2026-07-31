export interface MoodLog {
  mood:
    | "happy"
    | "calm"
    | "tired"
    | "anxious"
    | "stressed"
    | "sad"
    | "other";

  notes?: string;
  time: string;
}
