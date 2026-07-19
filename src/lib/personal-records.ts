import type { MuscleGroupId } from "@/lib/exercises";
import type { SetEntry, WorkoutSession } from "@/lib/workout-log";

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroupId;
  weightKg: number;
  reps: number;
  finishedAt: string;
}

// Ustunlik mezoni: og'irroq podxod yutadi; og'irlik teng bo'lsa — ko'proq takror.
function isBetter(candidate: SetEntry, baseline: SetEntry): boolean {
  return (
    candidate.weightKg > baseline.weightKg ||
    (candidate.weightKg === baseline.weightKg && candidate.reps > baseline.reps)
  );
}

// Barcha mashg'ulotlar bo'ylab bitta o'tishda har mashqning rekordini yig'adi.
// Sof funksiya — chaqiruvchi tomonda useMemo bilan keshlash kutiladi.
export function getPersonalRecords(sessions: WorkoutSession[]): Map<string, PersonalRecord> {
  const records = new Map<string, PersonalRecord>();
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        if (set.weightKg <= 0) continue;
        const current = records.get(exercise.exerciseId);
        if (!current || isBetter(set, current)) {
          records.set(exercise.exerciseId, {
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName,
            muscleGroup: exercise.muscleGroup,
            weightKg: set.weightKg,
            reps: set.reps,
            finishedAt: session.finishedAt,
          });
        }
      }
    }
  }
  return records;
}

// Podxod mavjud rekorddan ustunmi? Rekord bo'lmasa, birinchi natijaning o'zi
// yutuq hisoblanmaydi — taqqoslash uchun kamida bitta tarixiy natija kerak.
export function isNewRecord(record: PersonalRecord | undefined, set: SetEntry): boolean {
  return record !== undefined && isBetter(set, record);
}

export interface RecordHighlight {
  exerciseName: string;
  previousWeightKg: number;
  previousReps: number;
  weightKg: number;
  reps: number;
}

// Yakunlangan mashg'ulotda yangilangan rekordlar ro'yxati — natija ekrani uchun.
// `history` — shu mashg'ulotgacha bo'lgan sessiyalar (yangi sessiya kirmagan holda).
export function collectNewRecords(history: WorkoutSession[], session: WorkoutSession): RecordHighlight[] {
  const records = getPersonalRecords(history);
  const highlights: RecordHighlight[] = [];
  for (const exercise of session.exercises) {
    const record = records.get(exercise.exerciseId);
    if (!record || exercise.sets.length === 0) continue;
    const best = exercise.sets.reduce((a, b) => (isBetter(b, a) ? b : a));
    if (isNewRecord(record, best)) {
      highlights.push({
        exerciseName: exercise.exerciseName,
        previousWeightKg: record.weightKg,
        previousReps: record.reps,
        weightKg: best.weightKg,
        reps: best.reps,
      });
    }
  }
  return highlights;
}
