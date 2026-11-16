import { ACTIVITY_LEVELS, normalizeActivity, type ActivityLevel } from "@/lib/training-preferences";
import type { Gender, Goal } from "@/context/user-profile-context";

interface FitnessMetrics {
  bmr: number;
  tdee: number;
  targetCalories: number;
  bmi: number;
  bmiCategory: string;
  proteinG: number;
  fatG: number;
  carbG: number;
}

export function calculateFitnessMetrics(
  age: number,
  gender: Gender,
  weightKg: number,
  heightCm: number,
  goal: Goal,
  activityLevel: ActivityLevel = "moderate",
): FitnessMetrics {
  // Mifflin-St Jeor equation
  const bmr =
    gender === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const tdee = bmr * ACTIVITY_LEVELS[normalizeActivity(activityLevel)].multiplier;

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

export interface WeightGuidance {
  // Sog'lom vazn oralig'i (BMI 18.5-24.9), butun kg.
  minKg: number;
  maxKg: number;
  status: "under" | "normal" | "over";
  // Oraliqdan qancha chetda ekani (kg, 1 xona); normada 0.
  deltaKg: number;
}

// Bo'yga qarab sog'lom vazn oralig'i va hozirgi vaznning unga nisbati —
// BMI raqamining odam uchun tushunarli talqini.
export function weightGuidance(weightKg: number, heightCm: number): WeightGuidance {
  const heightM = heightCm / 100;
  const minKg = Math.ceil(18.5 * heightM * heightM);
  const maxKg = Math.floor(24.9 * heightM * heightM);
  if (weightKg > maxKg) return { minKg, maxKg, status: "over", deltaKg: Math.round((weightKg - maxKg) * 10) / 10 };
  if (weightKg < minKg) return { minKg, maxKg, status: "under", deltaKg: Math.round((minKg - weightKg) * 10) / 10 };
  return { minKg, maxKg, status: "normal", deltaKg: 0 };
}
