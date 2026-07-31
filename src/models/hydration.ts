export type HydrationType = "water"
  | "milk"
  | "juice"
  | "coconut-water"
  | "other";

  export interface HydrationLog {
  id: string;
  amountMl: number;
  type: HydrationType;
  timestamp: string;
}
