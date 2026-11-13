import { EXERCISES, type MuscleGroupId, type Level } from "@/lib/exercises";
import { normalizeTraining, type TrainingPreferences } from "@/lib/training-preferences";
const LEVEL_RANK: Record<Level, number> = { beginner: 0, intermediate: 1, expert: 2 };

export function buildTrainingPlan(preferences: TrainingPreferences) {
  const prefs = normalizeTraining(preferences);
  const full: MuscleGroupId[] = ["legs", "chest", "back", "shoulders", "abs"];
  const upper: MuscleGroupId[] = ["chest", "back", "shoulders", "biceps", "triceps"];
  const lower: MuscleGroupId[] = ["legs", "abs"];
  return Array.from({ length: prefs.daysPerWeek }, (_, day) => {
    const groups = prefs.daysPerWeek <= 3 ? full : day % 2 === 0 ? upper : lower;
    const exercises = groups.flatMap((group) => {
      const available = EXERCISES.filter(
        (e) =>
          e.muscleGroup === group &&
          prefs.equipment.includes(e.equipment) &&
          LEVEL_RANK[e.level] <= LEVEL_RANK[prefs.experience],
      );
      return available.length ? [available[day % available.length]] : [];
    });
    return {
      name: `${day + 1}-kun: ${prefs.daysPerWeek <= 3 ? "Butun tana" : day % 2 === 0 ? "Yuqori tana" : "Oyoq va pres"}`,
      exercises,
    };
  });
}
