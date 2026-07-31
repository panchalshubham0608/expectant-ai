export type MealType =
  "breakfast"
  | "lunch"
  | "dinner"
  | "snack";

export interface Meal {
  id: string;
  mealType: MealType;
  consumedAt: string;
  foods: FoodItem[];
  notes?: string;
}

export interface FoodItem {
  name: string;
  quantity?: string;
  confidence: number;
}
