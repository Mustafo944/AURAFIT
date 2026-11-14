import type { Exercise } from "@/lib/exercise-metadata";
import type { SetEntry } from "@/lib/workout-log";

// Podxod jadvali uchun sof mantiq (UI'siz) — alohida fayl, chunki test qilinadi.

export interface SetDraft {
  weight: string;
  reps: string;
}

// "4" -> 4; tushunarsiz yoki juda katta qiymat -> 3 (standart), 1..10 oralig'ida.
export function parseTargetSets(sets: string): number {
  const value = Number.parseInt(sets, 10);
  if (!Number.isFinite(value) || value < 1) return 3;
  return Math.min(value, 10);
}

// Podxodlar orasidagi dam olish: og'ir asosiy mashqlar uzoqroq, yengil
// (qo'l, qorin, o'z vazni) qisqaroq tiklanish talab qiladi.
export function restSecondsFor(exercise: Pick<Exercise, "equipment" | "muscleGroup">): number {
  if (exercise.equipment === "bodyweight") return 60;
  if (exercise.muscleGroup === "biceps" || exercise.muscleGroup === "triceps" || exercise.muscleGroup === "abs")
    return 60;
  if (exercise.equipment === "barbell") return exercise.muscleGroup === "legs" ? 150 : 120;
  return 90;
}

// i-podxod uchun tayyor (oldindan to'ldirilgan) qiymat: o'tgan mashg'ulotdagi
// shu raqamli podxod -> bugun oxirgi kiritilgani -> o'tgan mashg'ulotning
// oxirgi podxodi. Hech narsa bo'lmasa bo'sh (o'z vazni mashqida og'irlik "0").
export function defaultDraft(
  index: number,
  logged: SetEntry[],
  lastSets: SetEntry[] | null,
  bodyweight: boolean,
): SetDraft {
  const prior = lastSets?.[index] ?? logged[logged.length - 1] ?? lastSets?.[lastSets.length - 1] ?? null;
  if (prior) return { weight: String(prior.weightKg), reps: String(prior.reps) };
  return { weight: bodyweight ? "0" : "", reps: "" };
}

// Qator qiymatlarini podxodga aylantiradi; noto'g'ri bo'lsa null.
export function draftToSet(draft: SetDraft, bodyweight: boolean): SetEntry | null {
  const weightKg = Number(draft.weight);
  const reps = Number(draft.reps);
  if (draft.weight.trim() === "" && !bodyweight) return null;
  if (!Number.isFinite(weightKg) || weightKg < 0) return null;
  if (weightKg === 0 && !bodyweight) return null;
  if (!Number.isInteger(reps) || reps <= 0) return null;
  return { weightKg, reps };
}

export function adjustValue(value: string, delta: number): string {
  const next = Math.max(0, Math.round(((Number(value) || 0) + delta) * 100) / 100);
  return String(next);
}

export function formatSetShort(set: SetEntry | null | undefined): string {
  if (!set) return "—";
  return set.weightKg > 0 ? `${set.weightKg}×${set.reps}` : `${set.reps} takror`;
}

export function setVolume(sets: SetEntry[]): number {
  return sets.reduce((sum, set) => sum + set.weightKg * set.reps, 0);
}
