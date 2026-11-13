export type MuscleGroupId = "chest" | "back" | "shoulders" | "biceps" | "triceps" | "legs" | "abs";

interface MuscleGroupInfo {
  id: MuscleGroupId;
  label: string;
  icon: string;
}

export const MUSCLE_GROUPS: MuscleGroupInfo[] = [
  { id: "chest", label: "Ko'krak mashqlari", icon: "fitness_center" },
  { id: "back", label: "Qanot mashqlari", icon: "rowing" },
  { id: "shoulders", label: "Yelka mashqlari", icon: "sports_gymnastics" },
  { id: "biceps", label: "Qo'l oldi mashqlari", icon: "sports_martial_arts" },
  { id: "triceps", label: "Qo'l orqa mashqlari", icon: "front_hand" },
  { id: "legs", label: "Oyoq mashqlari", icon: "directions_run" },
  { id: "abs", label: "Pres mashqlari", icon: "self_improvement" },
];

export type Equipment = "barbell" | "dumbbell" | "cable" | "machine" | "bodyweight" | "ez-bar";

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Shtanga",
  dumbbell: "Gantel",
  cable: "Blok Trenajyor",
  machine: "Trenajyor",
  bodyweight: "Tana Og'irligi",
  "ez-bar": "EZ-Shtanga",
};

export type Level = "beginner" | "intermediate" | "expert";

export const LEVEL_LABELS: Record<Level, string> = {
  beginner: "Boshlang'ich",
  intermediate: "O'rta",
  expert: "Yuqori",
};

export interface Exercise {
  id: string;
  name: string;
  englishName: string;
  muscleGroup: MuscleGroupId;
  equipment: Equipment;
  level: Level;
  sets: string;
  reps: string;
  image: string;
  instructions: string[];
}

// Har bir mashqning manba papkasida boshlang'ich va yakuniy holat suratlari
// (0.jpg / 1.jpg) mavjud — shu ikkisini almashtirib, harakatni "jonlantirish" uchun.
export function getAnimationFrames(exercise: Exercise): [string, string] {
  return [exercise.image, exercise.image.replace("/0.jpg", "/1.jpg")];
}
