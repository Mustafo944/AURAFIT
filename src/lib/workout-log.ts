"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import type { MuscleGroupId } from "@/lib/exercises";

export interface SetEntry {
  weightKg: number;
  reps: number;
}

export interface LoggedExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroupId;
  sets: SetEntry[];
}

export interface WorkoutSession {
  id: string;
  startedAt: string;
  finishedAt: string;
  exercises: LoggedExercise[];
  totalVolumeKg: number;
  totalSets: number;
  caloriesBurned: number;
  recoveryAdvice?: string;
  progressAdvice?: string;
}

// Compendium of Physical Activities (Ainsworth va boshq., 2011), kod 02054:
// erkin og'irlik bilan o'rtacha-yuqori intensivlikdagi kuch mashqlari uchun MET 5.0.
// Standart taxminiy formula: kaloriya (kcal) = MET x tana vazni (kg) x davomiylik (soat),
// chunki 1 MET ~ 1 kcal / kg tana vazni / soat.
const RESISTANCE_TRAINING_MET = 5.0;

// ACSM/NSCA dam olish oralig'i tavsiyalariga ko'ra (gipertrofiya uchun ~1-3 daqiqa),
// har bir podxod (bajarilish + dam olish) o'rtacha ~2.5 daqiqa davom etadi. Bu real
// vaqtni "boshlash"/"yakunlash" bosilishi orasidagi soat vaqtidan ishonchliroq baho
// beradi — foydalanuvchi mashg'ulotni zaldan keyin tezda belgilasa ham to'g'ri chiqadi.
const AVG_SECONDS_PER_SET = 150;

export function computeCaloriesBurned(
  startedAt: string,
  finishedAt: string,
  weightKg: number,
  totalSets: number
): number {
  const wallClockHours = (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / (1000 * 60 * 60);
  const setBasedHours = (totalSets * AVG_SECONDS_PER_SET) / 3600;
  const durationHours = Math.max(wallClockHours, setBasedHours, 1 / 60);
  return Math.round(RESISTANCE_TRAINING_MET * weightKg * durationHours);
}

async function insertSession(userId: string, session: WorkoutSession) {
  const supabase = createClient();
  await supabase.from("workout_sessions").insert({
    id: session.id,
    user_id: userId,
    started_at: session.startedAt,
    finished_at: session.finishedAt,
    exercises: session.exercises,
    total_volume_kg: session.totalVolumeKg,
    total_sets: session.totalSets,
    calories_burned: session.caloriesBurned,
  });
}

async function updateAdvice(id: string, advice: { recoveryAdvice: string; progressAdvice: string }) {
  const supabase = createClient();
  await supabase
    .from("workout_sessions")
    .update({ recovery_advice: advice.recoveryAdvice, progress_advice: advice.progressAdvice })
    .eq("id", id);
}

function byFinishedAtAsc(a: WorkoutSession, b: WorkoutSession) {
  return a.finishedAt.localeCompare(b.finishedAt);
}

// Modul darajasidagi kesh (stale-while-revalidate) — navigatsiyada oldingi
// natija darhol ko'rsatiladi, fonda yangilanadi.
const sessionCache = new Map<string, WorkoutSession[]>();

// Tarix o'sgan sari sahifa sekinlashmasligi uchun faqat oxirgi 200 ta
// mashg'ulot yuklanadi (har qatorda to'liq `exercises` JSON bor — cheklovsiz
// so'rov vaqt o'tishi bilan og'irlashib boradi). Grafik/trend hisoblari uchun
// 200 ta so'nggi sessiya yetarli.
const SESSION_FETCH_LIMIT = 200;

export function useWorkoutHistory() {
  const { userId } = useAuth();
  const [sessions, setSessions] = useState<WorkoutSession[]>(() => (userId && sessionCache.get(userId)) || []);
  const [loading, setLoading] = useState(() => userId != null && !sessionCache.has(userId));

  // Foydalanuvchi o'zgarganda holat render vaqtida moslanadi — effect
  // ichidagi sync setState kaskadli qo'shimcha render chiqarardi.
  const [prevUserId, setPrevUserId] = useState(userId);
  if (prevUserId !== userId) {
    setPrevUserId(userId);
    setSessions((userId && sessionCache.get(userId)) || []);
    setLoading(userId != null && !sessionCache.has(userId));
  }

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("workout_sessions")
      .select(
        "id, started_at, finished_at, exercises, total_volume_kg, total_sets, calories_burned, recovery_advice, progress_advice"
      )
      .eq("user_id", userId)
      .order("finished_at", { ascending: false })
      .limit(SESSION_FETCH_LIMIT)
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          // So'rov eng yangi 200 tani olish uchun descending — iste'molchilar
          // (grafik, trend) esa ascending kutadi, shuning uchun teskari qilamiz.
          const mapped = data.reverse().map((row) => ({
            id: row.id,
            startedAt: row.started_at,
            finishedAt: row.finished_at,
            exercises: row.exercises as LoggedExercise[],
            totalVolumeKg: row.total_volume_kg,
            totalSets: row.total_sets,
            caloriesBurned: row.calories_burned,
            recoveryAdvice: row.recovery_advice ?? undefined,
            progressAdvice: row.progress_advice ?? undefined,
          }));
          sessionCache.set(userId, mapped);
          setSessions(mapped);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Funksional update — addSession'dan keyin (await orqasidan) chaqirilganda
  // ham eskirgan closure ro'yxatni ustidan yozib yubormasligi uchun. Kesh
  // yangilash idempotent, shuning uchun updater ichida xavfsiz.
  const addSession = (session: WorkoutSession) => {
    setSessions((prev) => {
      const next = [...prev, session].sort(byFinishedAtAsc);
      if (userId) sessionCache.set(userId, next);
      return next;
    });
    if (!userId) return;
    void insertSession(userId, session);
  };

  const updateSessionAdvice = (id: string, advice: { recoveryAdvice: string; progressAdvice: string }) => {
    setSessions((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...advice } : s));
      if (userId) sessionCache.set(userId, next);
      return next;
    });
    void updateAdvice(id, advice);
  };

  return { sessions, loading, addSession, updateSessionAdvice };
}

export interface ExercisePerformance {
  finishedAt: string;
  sets: SetEntry[];
  bestSet: SetEntry;
}

// `sessions` ascending (eski -> yangi) tartibda kelishi kutiladi. Shu mashq
// bajarilgan HAR BIR mashg'ulotni qaytaradi — eng yangisi birinchi bo'lib.
export function getExerciseHistory(sessions: WorkoutSession[], exerciseId: string): ExercisePerformance[] {
  const history: ExercisePerformance[] = [];
  for (const session of sessions) {
    const exercise = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (exercise && exercise.sets.length > 0) {
      const bestSet = exercise.sets.reduce((best, set) => (set.weightKg > best.weightKg ? set : best));
      history.push({ finishedAt: session.finishedAt, sets: exercise.sets, bestSet });
    }
  }
  return history.reverse();
}

export interface ExerciseComparison {
  exerciseName: string;
  previousBestWeightKg: number;
  latestBestWeightKg: number;
  deltaKg: number;
}

// Faqat ikkala mashg'ulotda ham bajarilgan mashqlarni solishtiradi — har biri
// uchun eng og'ir podxodni (weightKg) taqqoslash orqali progressni ko'rsatadi.
export function compareExercises(latest: WorkoutSession, previous: WorkoutSession | undefined): ExerciseComparison[] {
  if (!previous) return [];
  const comparisons: ExerciseComparison[] = [];
  for (const exercise of latest.exercises) {
    const prevExercise = previous.exercises.find((e) => e.exerciseId === exercise.exerciseId);
    if (!prevExercise || exercise.sets.length === 0 || prevExercise.sets.length === 0) continue;
    const latestBestWeightKg = Math.max(...exercise.sets.map((s) => s.weightKg));
    const previousBestWeightKg = Math.max(...prevExercise.sets.map((s) => s.weightKg));
    comparisons.push({
      exerciseName: exercise.exerciseName,
      previousBestWeightKg,
      latestBestWeightKg,
      deltaKg: Math.round((latestBestWeightKg - previousBestWeightKg) * 10) / 10,
    });
  }
  return comparisons;
}
