import type { WorkoutSession } from "@/lib/workout-log";

// Sof matematika — I/O yo'q. Funksiyani sinov massivlari bilan qo'lda
// tekshirish mumkin (loyihada test runner yo'q).

export interface WeeklyActivityPoint {
  weekLabel: string;
  weekStart: string;
  count: number;
  totalVolumeKg: number;
}

const UZ_MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];

function startOfIsoWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // dushanba = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

export function weeklyWorkoutFrequency(sessions: WorkoutSession[], weeks: number = 8): WeeklyActivityPoint[] {
  const buckets = new Map<string, WeeklyActivityPoint>();
  for (const s of sessions) {
    const weekStart = startOfIsoWeek(new Date(s.finishedAt));
    const key = weekStart.toISOString();
    const existing = buckets.get(key);
    if (existing) {
      existing.count += 1;
      existing.totalVolumeKg += s.totalVolumeKg;
    } else {
      buckets.set(key, {
        weekLabel: `${weekStart.getDate()}-${UZ_MONTHS_SHORT[weekStart.getMonth()]}`,
        weekStart: key,
        count: 1,
        totalVolumeKg: s.totalVolumeKg,
      });
    }
  }
  return [...buckets.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart)).slice(-weeks);
}
