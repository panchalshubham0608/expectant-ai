export interface SleepLog {
  bedtime: string;
  wakeTime: string;
  quality?: 1 | 2 | 3 | 4 | 5;
  naps?: Array<{
    start: string;
    end: string;
  }>;
}