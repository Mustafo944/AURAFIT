import type { WorkoutSession } from "@/lib/workout-log";

export interface WeeklyActivityPoint {
  weekLabel: string;
  weekStart: string;
  count: number;
  totalVolumeKg: number;
}

const UZ_MONTHS_SHORT = [
  "yan",
  "fev",
  "mar",
  "apr",
  "may",
  "iyun",
  "iyul",
  "avg",
  "sen",
  "okt",
  "noy",
  "dek",
];

function startOfIsoWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // dushanba = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

export function weeklyWorkoutFrequency(
  sessions: WorkoutSession[],
  weeks = 8,
  now = new Date(),
): WeeklyActivityPoint[] {
  const count = Math.max(1, Math.min(52, Math.floor(weeks)));
  const current = startOfIsoWeek(now);
  const buckets = new Map<string, WeeklyActivityPoint>();
  for (let offset = count - 1; offset >= 0; offset--) {
    const start = new Date(current);
    start.setDate(start.getDate() - offset * 7);
    const key = start.toISOString();
    buckets.set(key, {
      weekLabel: `${start.getDate()}-${UZ_MONTHS_SHORT[start.getMonth()]}`,
      weekStart: key,
      count: 0,
      totalVolumeKg: 0,
    });
  }
  for (const session of sessions) {
    const date = new Date(session.finishedAt);
    if (!Number.isFinite(date.getTime()) || date > now) continue;
    const point = buckets.get(startOfIsoWeek(date).toISOString());
    if (point) {
      point.count++;
      point.totalVolumeKg += session.totalVolumeKg;
    }
  }
  return [...buckets.values()];
}
