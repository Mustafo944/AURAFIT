import type { Equipment, Level } from "@/lib/exercise-metadata";

export const ACTIVITY_LEVELS = {
  sedentary: { label: "Kamharakat", multiplier: 1.2 },
  light: { label: "Yengil faol", multiplier: 1.375 },
  moderate: { label: "O'rtacha faol", multiplier: 1.55 },
  active: { label: "Juda faol", multiplier: 1.725 },
} as const;
export type ActivityLevel = keyof typeof ACTIVITY_LEVELS;
export interface TrainingPreferences {
  experience: Level;
  equipment: Equipment[];
  daysPerWeek: number;
}
export const DEFAULT_TRAINING: TrainingPreferences = {
  experience: "beginner",
  equipment: ["bodyweight", "dumbbell", "barbell", "machine", "cable", "ez-bar"],
  daysPerWeek: 3,
};
const LEVEL_RANK: Record<Level, number> = { beginner: 0, intermediate: 1, expert: 2 };
const EQUIPMENT: Equipment[] = ["bodyweight", "dumbbell", "barbell", "machine", "cable", "ez-bar"];

export function normalizeTraining(value: unknown): TrainingPreferences {
  if (!value || typeof value !== "object") return { ...DEFAULT_TRAINING };
  const data = value as Partial<TrainingPreferences>;
  return {
    experience: data.experience && Object.hasOwn(LEVEL_RANK, data.experience) ? data.experience : "beginner",
    equipment: Array.isArray(data.equipment)
      ? [...new Set(data.equipment.filter((e) => EQUIPMENT.includes(e)))]
      : [...DEFAULT_TRAINING.equipment],
    daysPerWeek:
      typeof data.daysPerWeek === "number" &&
      Number.isInteger(data.daysPerWeek) &&
      data.daysPerWeek >= 1 &&
      data.daysPerWeek <= 6
        ? data.daysPerWeek
        : 3,
  };
}
export function normalizeActivity(value: unknown): ActivityLevel {
  return typeof value === "string" && Object.hasOwn(ACTIVITY_LEVELS, value)
    ? (value as ActivityLevel)
    : "moderate";
}
