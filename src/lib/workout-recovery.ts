import type { Gender, Goal } from "@/context/user-profile-context";
import type { ExerciseComparison } from "@/lib/workout-log";

export interface WorkoutRecoveryRequest {
  profile: { age: number; gender: Gender; weightKg: number; goal: Goal };
  session: {
    muscleGroups: string[];
    exercises: { name: string; sets: number; topWeightKg: number }[];
    totalSets: number;
    totalVolumeKg: number;
    caloriesBurned: number;
  };
  comparison: ExerciseComparison[];
  nutrition: {
    consumed: { calories: number; proteinG: number; fatG: number; carbG: number };
    target: { calories: number; proteinG: number; fatG: number; carbG: number };
  };
}

export interface WorkoutRecoveryResult {
  recoveryAdvice: string;
  progressAdvice: string;
}

export async function fetchWorkoutRecovery(
  payload: WorkoutRecoveryRequest
): Promise<WorkoutRecoveryResult | { error: string }> {
  try {
    const res = await fetch("/api/workout-recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || typeof data.recoveryAdvice !== "string" || typeof data.progressAdvice !== "string") {
      return { error: data.error ?? "AI javobi noto'g'ri formatda keldi." };
    }
    return { recoveryAdvice: data.recoveryAdvice, progressAdvice: data.progressAdvice };
  } catch {
    return { error: "Tarmoq xatosi yuz berdi." };
  }
}
