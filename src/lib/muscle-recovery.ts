import { MUSCLE_GROUPS, type MuscleGroupId } from "@/lib/exercises";
import type { WorkoutSession } from "@/lib/workout-log";

// 48 soatlik chiziqli tiklanish modeli — gipertrofiya adabiyotida keng
// qo'llaniladigan taxminiy mushak tiklanish oynasi (ACSM/NSCA tavsiyalari).
// Haqiqiy tiklanish tezligi mushak guruhi va yukka qarab farq qiladi, bu esa
// soddalashtirilgan, ammo real ma'lumotga asoslangan taxmin.
const FULL_RECOVERY_HOURS = 48;

export interface MuscleRecoveryStatus {
  muscleGroup: MuscleGroupId;
  hoursSinceTrained: number | null;
  recoveryPct: number;
}

// `sessions` istalgan tartibda kelishi mumkin — har bir guruh uchun eng oxirgi
// mashq qilingan vaqt qidiriladi. Hech qachon mashq qilinmagan guruh uchun
// `hoursSinceTrained: null`, `recoveryPct: 100` (neytral — "tayyor" holatiga
// teng ko'rsatiladi, chunki hech qachon charchamagan).
export function muscleRecoveryStatus(sessions: WorkoutSession[]): MuscleRecoveryStatus[] {
  const lastTrainedMs = new Map<MuscleGroupId, number>();
  for (const session of sessions) {
    const finishedMs = new Date(session.finishedAt).getTime();
    for (const exercise of session.exercises) {
      const prev = lastTrainedMs.get(exercise.muscleGroup);
      if (prev == null || finishedMs > prev) {
        lastTrainedMs.set(exercise.muscleGroup, finishedMs);
      }
    }
  }

  const now = Date.now();
  return MUSCLE_GROUPS.map(({ id }) => {
    const trainedMs = lastTrainedMs.get(id);
    if (trainedMs == null) {
      return { muscleGroup: id, hoursSinceTrained: null, recoveryPct: 100 };
    }
    const hours = (now - trainedMs) / (60 * 60 * 1000);
    const recoveryPct = Math.round(Math.max(0, Math.min(100, (hours / FULL_RECOVERY_HOURS) * 100)));
    return { muscleGroup: id, hoursSinceTrained: Math.round(hours * 10) / 10, recoveryPct };
  });
}

// 0% (endigina mashq qilingan) -> qizil, 50% -> sariq, 100% (to'liq tiklangan)
// -> yashil. HSL hue 0(qizil) dan 120(yashil) gacha chiziqli interpolyatsiya.
export function recoveryColor(recoveryPct: number): string {
  const clamped = Math.max(0, Math.min(100, recoveryPct));
  const hue = (clamped / 100) * 120;
  return `hsl(${hue}, 80%, 55%)`;
}

export function recoveryLabel(status: MuscleRecoveryStatus): string {
  if (status.hoursSinceTrained == null) return "Hali mashq qilinmagan";
  if (status.recoveryPct >= 100) return "Tayyor";
  const hours = status.hoursSinceTrained;
  return hours < 24 ? `${Math.round(hours)} soat oldin` : `${Math.round(hours / 24)} kun oldin`;
}
