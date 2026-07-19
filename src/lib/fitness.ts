import type { Gender, Goal } from "@/context/user-profile-context";

export interface FitnessMetrics {
  bmr: number;
  tdee: number;
  targetCalories: number;
  bmi: number;
  bmiCategory: string;
  proteinG: number;
  fatG: number;
  carbG: number;
}

// Moderate activity assumption (exercise 3-5x/week) until a dedicated activity-level input exists.
const ACTIVITY_MULTIPLIER = 1.55;

export function calculateFitnessMetrics(
  age: number,
  gender: Gender,
  weightKg: number,
  heightCm: number,
  goal: Goal
): FitnessMetrics {
  // Mifflin-St Jeor equation
  const bmr =
    gender === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = bmr * ACTIVITY_MULTIPLIER;

  const targetCalories = goal === "lose" ? tdee - 500 : goal === "gain" ? tdee + 400 : tdee;

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  let bmiCategory: string;
  if (bmi < 18.5) bmiCategory = "Kam Vazn";
  else if (bmi < 25) bmiCategory = "Norma";
  else if (bmi < 30) bmiCategory = "Ortiqcha Vazn";
  else bmiCategory = "Semizlik";

  const proteinG = Math.round(weightKg * 2);
  const fatG = Math.round((targetCalories * 0.25) / 9);
  const carbG = Math.max(0, Math.round((targetCalories - proteinG * 4 - fatG * 9) / 4));

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories: Math.round(targetCalories),
    bmi: Math.round(bmi * 10) / 10,
    bmiCategory,
    proteinG,
    fatG,
    carbG,
  };
}

export const GOAL_LABELS: Record<Goal, string> = {
  lose: "Vazn Yo'qotish",
  maintain: "Vaznni Saqlash",
  gain: "Mushak Massasi Orttirish",
};
