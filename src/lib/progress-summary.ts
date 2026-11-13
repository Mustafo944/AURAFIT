import { MUSCLE_GROUPS } from "@/lib/exercise-metadata";
import type { WorkoutSession } from "@/lib/workout-log";
import type { WeightEntry } from "@/lib/weight-log";

export function summarizeProgress(sessions: WorkoutSession[], weights: WeightEntry[], now: Date) {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - 7);
  const previousStart = new Date(start);
  previousStart.setDate(previousStart.getDate() - 7);
  const unique = [...new Map(sessions.map((session) => [session.id, session])).values()];
  const within = (iso: string, from: Date, to: Date) => {
    const time = new Date(iso).getTime();
    return time >= from.getTime() && time < to.getTime() && time <= now.getTime();
  };
  const current = unique.filter((s) => within(s.finishedAt, start, end));
  const previous = unique.filter((s) => within(s.finishedAt, previousStart, start));
  const volume = (rows: WorkoutSession[]) =>
    rows.reduce(
      (total, session) =>
        total +
        session.exercises.reduce(
          (sum, exercise) => sum + exercise.sets.reduce((n, set) => n + set.weightKg * set.reps, 0),
          0,
        ),
      0,
    );
  const recentWeights = weights
    .filter((w) => within(w.loggedAt, start, end))
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  return {
    count: current.length,
    previousCount: previous.length,
    volume: volume(current),
    previousVolume: volume(previous),
    weightChange:
      recentWeights.length >= 2 ? recentWeights.at(-1)!.weightKg - recentWeights[0].weightKg : null,
    groups: MUSCLE_GROUPS.map((group) => ({
      ...group,
      sets: current.reduce(
        (sum, session) =>
          sum +
          session.exercises.filter((e) => e.muscleGroup === group.id).reduce((n, e) => n + e.sets.length, 0),
        0,
      ),
    })),
  };
}
