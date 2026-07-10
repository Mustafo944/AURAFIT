import type { WeightEntry } from "@/lib/weight-log";
import type { MealEntry } from "@/lib/meal-log";
import type { WorkoutSession, ExercisePerformance } from "@/lib/workout-log";
import type { MuscleGroupId } from "@/lib/exercises";
import type { Goal } from "@/context/user-profile-context";

// Sof matematika — I/O yo'q. Barcha funksiyalarni sinov massivlari bilan qo'lda
// tekshirish mumkin (loyihada test runner yo'q).

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_POINTS_FOR_TREND = 3;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================================================
// Chiziqli regressiya (eng kichik kvadratlar usuli)
// ============================================================================

export interface RegressionPoint {
  x: number;
  y: number;
}

export interface Regression {
  slope: number;
  intercept: number;
  r2: number;
}

export function linearRegression(points: RegressionPoint[]): Regression | null {
  const n = points.length;
  if (n < 2) return null;

  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;

  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }
  if (den === 0) return { slope: 0, intercept: meanY, r2: 0 };

  const slope = num / den;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  let ssTot = 0;
  for (const p of points) {
    const predicted = slope * p.x + intercept;
    ssRes += (p.y - predicted) ** 2;
    ssTot += (p.y - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

export function projectPoint(regression: Regression, x: number): number {
  return regression.slope * x + regression.intercept;
}

// ============================================================================
// Vazn dinamikasi va prognoz
// ============================================================================

export interface WeightForecast {
  status: "ok" | "insufficient";
  latestWeightKg?: number;
  slopeKgPerWeek?: number;
  projectedIn30DaysKg?: number;
  etaToGoalDays?: number | null;
  r2?: number;
}

// `entries` `loggedAt` bo'yicha istalgan tartibda kelishi mumkin — funksiya
// ichida o'suvchi tartibga solinadi. Kamida 3 ta yozuv bo'lmasa trend
// hisoblanmaydi (2 nuqta har doim mukammal chiziq beradi — bu chalg'ituvchi).
export function weightForecast(entries: WeightEntry[], targetWeightKg?: number | null): WeightForecast {
  if (entries.length === 0) return { status: "insufficient" };
  const sorted = [...entries].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  const latest = sorted[sorted.length - 1];
  if (entries.length < MIN_POINTS_FOR_TREND) {
    return { status: "insufficient", latestWeightKg: latest.weightKg };
  }

  const t0 = new Date(sorted[0].loggedAt).getTime();
  const points = sorted.map((e) => ({ x: (new Date(e.loggedAt).getTime() - t0) / DAY_MS, y: e.weightKg }));
  const regression = linearRegression(points);
  if (!regression) return { status: "insufficient", latestWeightKg: latest.weightKg };

  const latestX = points[points.length - 1].x;
  const projectedIn30DaysKg = round1(projectPoint(regression, latestX + 30));

  let etaToGoalDays: number | null = null;
  if (targetWeightKg != null && Math.abs(regression.slope) > 1e-6) {
    const goalX = (targetWeightKg - regression.intercept) / regression.slope;
    const daysFromNow = goalX - latestX;
    etaToGoalDays = daysFromNow > 0 ? Math.round(daysFromNow) : null;
  }

  return {
    status: "ok",
    latestWeightKg: latest.weightKg,
    slopeKgPerWeek: round2(regression.slope * 7),
    projectedIn30DaysKg,
    etaToGoalDays,
    r2: round2(regression.r2),
  };
}

// Haftalik og'irlik o'zgarishi maqsad yo'nalishiga zid bo'lsa true qaytaradi.
// Kunlik tebranishlarni filtrlash uchun kichik bufer (0.15 kg/hafta) qo'llanadi.
const DISCREPANCY_THRESHOLD_KG_PER_WEEK = 0.15;

export function weightGoalDiscrepancy(slopeKgPerWeek: number, goal: Goal): boolean {
  if (goal === "lose") return slopeKgPerWeek > DISCREPANCY_THRESHOLD_KG_PER_WEEK;
  if (goal === "gain") return slopeKgPerWeek < -DISCREPANCY_THRESHOLD_KG_PER_WEEK;
  return false;
}

// ============================================================================
// Kalibrlangan TDEE — real vazn o'zgarishi va real kaloriya qabuliga asoslanib
// Mifflin-St Jeor formulasini shaxsiylashtiradi.
// ============================================================================

// ~7700 kcal ≈ 1 kg tana massasi o'zgarishi (keng qo'llaniladigan taxminiy
// energiya zichligi konstantasi; tana tarkibidan mustaqil taxmin, xuddi
// fitness.ts'dagi ACTIVITY_MULTIPLIER kabi soddalashtirish).
const KCAL_PER_KG = 7700;

const CALIBRATION_WINDOW_DAYS = 21;
const MEDIUM_MIN_WEIGHT_POINTS = 5;
const MEDIUM_MIN_MEAL_DAYS = 7;
const HIGH_MIN_WEIGHT_POINTS = 8;
const HIGH_MIN_MEAL_DAYS = 14;
const HIGH_MIN_R2 = 0.5;
const PLAUSIBILITY_MIN_RATIO = 0.5;
const PLAUSIBILITY_MAX_RATIO = 1.8;

export interface CalibratedTdeeOk {
  status: "ok";
  calibratedTdee: number;
  formulaTdee: number;
  confidence: "high" | "medium";
  weightTrendSlopeKgPerDay: number;
  r2: number;
  windowDays: number;
  weightDataPoints: number;
  mealDataDays: number;
}

export interface CalibratedTdeeInsufficient {
  status: "insufficient";
  weightDataPoints: number;
  mealDataDays: number;
}

export type CalibratedTdeeResult = CalibratedTdeeOk | CalibratedTdeeInsufficient;

export function calibrateTDEE(
  weightLogs: WeightEntry[],
  mealHistory: MealEntry[],
  formulaTdee: number,
  windowDays: number = CALIBRATION_WINDOW_DAYS
): CalibratedTdeeResult {
  const cutoff = Date.now() - windowDays * DAY_MS;

  const recentWeights = weightLogs
    .filter((w) => new Date(w.loggedAt).getTime() >= cutoff)
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  const recentMeals = mealHistory.filter((m) => new Date(m.timestamp).getTime() >= cutoff);
  const mealDataDays = new Set(recentMeals.map((m) => new Date(m.timestamp).toDateString())).size;

  if (recentWeights.length < MEDIUM_MIN_WEIGHT_POINTS || mealDataDays < MEDIUM_MIN_MEAL_DAYS) {
    return { status: "insufficient", weightDataPoints: recentWeights.length, mealDataDays };
  }

  const t0 = new Date(recentWeights[0].loggedAt).getTime();
  const points = recentWeights.map((w) => ({ x: (new Date(w.loggedAt).getTime() - t0) / DAY_MS, y: w.weightKg }));
  const regression = linearRegression(points);
  if (!regression) {
    return { status: "insufficient", weightDataPoints: recentWeights.length, mealDataDays };
  }

  const totalCalories = recentMeals.reduce((s, m) => s + m.calories, 0);
  const avgDailyIntake = totalCalories / mealDataDays;
  const impliedDailyBalance = regression.slope * KCAL_PER_KG;
  const calibratedTdee = avgDailyIntake - impliedDailyBalance;

  const ratio = calibratedTdee / formulaTdee;
  if (!Number.isFinite(calibratedTdee) || ratio < PLAUSIBILITY_MIN_RATIO || ratio > PLAUSIBILITY_MAX_RATIO) {
    // Kam/nomunosib qayd etish natijasida chiqqan mantiqsiz raqamni ko'rsatmaymiz.
    return { status: "insufficient", weightDataPoints: recentWeights.length, mealDataDays };
  }

  const confidence: "high" | "medium" =
    recentWeights.length >= HIGH_MIN_WEIGHT_POINTS && mealDataDays >= HIGH_MIN_MEAL_DAYS && regression.r2 >= HIGH_MIN_R2
      ? "high"
      : "medium";

  return {
    status: "ok",
    calibratedTdee: Math.round(calibratedTdee),
    formulaTdee: Math.round(formulaTdee),
    confidence,
    weightTrendSlopeKgPerDay: round2(regression.slope),
    r2: round2(regression.r2),
    windowDays,
    weightDataPoints: recentWeights.length,
    mealDataDays,
  };
}

// ============================================================================
// Haftalik mashg'ulot faolligi
// ============================================================================

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

// ============================================================================
// Mashq progressi (ko'targan tosh o'sishi)
// ============================================================================

export interface ExerciseProgressionTrend {
  status: "ok" | "insufficient";
  slopeKgPerWeek?: number;
  projectedIn4WeeksKg?: number;
  r2?: number;
}

// `history` `getExerciseHistory()`dan keladi — eng yangisi birinchi. Regressiya
// uchun eskidan-yangiga qaytariladi.
export function exerciseProgressionTrend(history: ExercisePerformance[]): ExerciseProgressionTrend {
  if (history.length < MIN_POINTS_FOR_TREND) return { status: "insufficient" };

  const ascending = [...history].reverse();
  const t0 = new Date(ascending[0].finishedAt).getTime();
  const points = ascending.map((h) => ({ x: (new Date(h.finishedAt).getTime() - t0) / DAY_MS, y: h.bestSet.weightKg }));
  const regression = linearRegression(points);
  if (!regression) return { status: "insufficient" };

  const latestX = points[points.length - 1].x;
  return {
    status: "ok",
    slopeKgPerWeek: round2(regression.slope * 7),
    projectedIn4WeeksKg: round1(projectPoint(regression, latestX + 28)),
    r2: round2(regression.r2),
  };
}

// ============================================================================
// Mushak guruhlari bo'yicha hajm balansi
// ============================================================================

export interface MuscleGroupVolume {
  muscleGroup: MuscleGroupId;
  volumeKg: number;
}

export function muscleGroupVolumeBalance(sessions: WorkoutSession[], days: number = 30): MuscleGroupVolume[] {
  const cutoff = Date.now() - days * DAY_MS;
  const totals = new Map<MuscleGroupId, number>();
  for (const s of sessions) {
    if (new Date(s.finishedAt).getTime() < cutoff) continue;
    for (const ex of s.exercises) {
      const volume = ex.sets.reduce((sum, set) => sum + set.weightKg * set.reps, 0);
      totals.set(ex.muscleGroup, (totals.get(ex.muscleGroup) ?? 0) + volume);
    }
  }
  return [...totals.entries()]
    .map(([muscleGroup, volumeKg]) => ({ muscleGroup, volumeKg: Math.round(volumeKg) }))
    .sort((a, b) => b.volumeKg - a.volumeKg);
}
