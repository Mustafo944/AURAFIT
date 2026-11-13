"use client";

import { useRef, useState } from "react";
import { createUserResource, useUserResource } from "@/lib/user-resource";
import type { Database } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import { pushSyncTask, getSyncQueue } from "@/lib/idb";
import type { MuscleGroupId } from "@/lib/exercise-metadata";
import type { CardioEntry } from "@/lib/cardio";

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
  cardio: CardioEntry[];
  totalVolumeKg: number;
  totalSets: number;
  // Kuch mashqlari + kardio jami yoqilgan kaloriya.
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
  totalSets: number,
  cardioMinutes = 0,
): number {
  if (totalSets <= 0) return 0;
  const wallClockHours = Math.max(
    0,
    (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / (1000 * 60 * 60) - cardioMinutes / 60,
  );
  const setBasedHours = (totalSets * AVG_SECONDS_PER_SET) / 3600;
  const durationHours = Math.max(wallClockHours, setBasedHours, 1 / 60);
  return Math.round(RESISTANCE_TRAINING_MET * weightKg * durationHours);
}

const PAGE_SIZE = 50;
type SessionRow = Database["public"]["Tables"]["workout_sessions"]["Row"];
type Cursor = { finishedAt: string; id: string };
interface WorkoutHistoryState {
  sessions: WorkoutSession[];
  cursor: Cursor | null;
  hasMore: boolean;
}

function mapSession(row: SessionRow): WorkoutSession {
  return {
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    exercises: row.exercises as LoggedExercise[],
    cardio: (row.cardio as CardioEntry[] | null) ?? [],
    totalVolumeKg: row.total_volume_kg,
    totalSets: row.total_sets,
    caloriesBurned: row.calories_burned,
    recoveryAdvice: row.recovery_advice ?? undefined,
    progressAdvice: row.progress_advice ?? undefined,
  };
}
const byFinishedAt = (a: WorkoutSession, b: WorkoutSession) =>
  a.finishedAt.localeCompare(b.finishedAt) || a.id.localeCompare(b.id);
async function fetchPage(userId: string, cursor: Cursor | null): Promise<WorkoutHistoryState> {
  const before = await getSyncQueue().catch(() => []);
  let query = createClient()
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("finished_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);
  if (cursor)
    query = query.or(
      `finished_at.lt.${cursor.finishedAt},and(finished_at.eq.${cursor.finishedAt},id.lt.${cursor.id})`,
    );
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []).slice(0, PAGE_SIZE);
  const sessions = new Map(rows.map((row) => [row.id, mapSession(row)]));
  for (const task of [...before, ...(await getSyncQueue().catch(() => []))]) {
    if (task.payload.userId !== userId) continue;
    if (task.type === "INSERT_SESSION") sessions.set(task.payload.session.id, task.payload.session);
    if (task.type === "DELETE_SESSION") sessions.delete(task.payload.sessionId);
    if (task.type === "UPDATE_ADVICE") {
      const session = sessions.get(task.payload.id);
      if (session) sessions.set(session.id, { ...session, ...task.payload.advice });
    }
  }
  const last = rows[rows.length - 1];
  return {
    sessions: [...sessions.values()].sort(byFinishedAt),
    cursor: last ? { finishedAt: last.finished_at, id: last.id } : null,
    hasMore: (data?.length ?? 0) > PAGE_SIZE,
  };
}
const historyResource = createUserResource<WorkoutHistoryState>(
  "workout-history-v2",
  { sessions: [], cursor: null, hasMore: false },
  async (userId, previous) => {
    const latest = await fetchPage(userId, null);
    if (!latest.cursor || !previous.cursor || previous.cursor.finishedAt >= latest.cursor.finishedAt)
      return latest;
    const older = previous.sessions.filter((session) => session.finishedAt < latest.cursor!.finishedAt);
    const merged = new Map([...older, ...latest.sessions].map((session) => [session.id, session]));
    return {
      sessions: [...merged.values()].sort(byFinishedAt),
      cursor: previous.cursor,
      hasMore: previous.hasMore,
    };
  },
);

export function useWorkoutHistory() {
  const { value, loading, error, userId } = useUserResource(historyResource);
  const [paging, setPaging] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ userId: string; message: string } | null>(null);
  const pageLock = useRef(false);
  const loadMore = async () => {
    if (!userId || pageLock.current || !value.hasMore || !value.cursor) return;
    const cursor = value.cursor;
    pageLock.current = true;
    setPaging(userId);
    setActionError(null);
    try {
      const page = await fetchPage(userId, cursor);
      historyResource.update(userId, (current) => {
        if (current.cursor?.id !== cursor.id) return current;
        const merged = new Map(
          [...page.sessions, ...current.sessions].map((session) => [session.id, session]),
        );
        return { ...page, sessions: [...merged.values()].sort(byFinishedAt) };
      });
    } catch {
      setActionError({ userId, message: "Eski tarixni yuklab bo'lmadi. Qayta urinib ko'ring." });
    } finally {
      pageLock.current = false;
      setPaging(null);
    }
  };
  const addSession = async (session: WorkoutSession) => {
    if (!userId) throw new Error("Tizimga kiring.");
    await pushSyncTask({ type: "INSERT_SESSION", payload: { userId, session } });
    historyResource.update(userId, (current) => ({
      ...current,
      sessions: [...current.sessions.filter((s) => s.id !== session.id), session].sort(byFinishedAt),
    }));
  };
  const removeSession = async (sessionId: string) => {
    if (!userId) return;
    try {
      await pushSyncTask({ type: "DELETE_SESSION", payload: { userId, sessionId } });
      historyResource.update(userId, (current) => ({
        ...current,
        sessions: current.sessions.filter((s) => s.id !== sessionId),
      }));
    } catch {
      setActionError({ userId, message: "O'chirishni saqlab bo'lmadi. Qayta urinib ko'ring." });
    }
  };
  const updateSessionAdvice = async (
    id: string,
    advice: { recoveryAdvice: string; progressAdvice: string },
  ) => {
    if (!userId) return;
    try {
      await pushSyncTask({ type: "UPDATE_ADVICE", payload: { userId, id, advice } });
      historyResource.update(userId, (current) => ({
        ...current,
        sessions: current.sessions.map((s) => (s.id === id ? { ...s, ...advice } : s)),
      }));
    } catch {
      setActionError({ userId, message: "Maslahatni saqlab bo'lmadi." });
    }
  };
  return {
    sessions: value.sessions,
    hasMore: value.hasMore,
    loading,
    loadingMore: paging === userId && paging !== null,
    error: actionError?.userId === userId ? actionError.message : error,
    loadMore,
    addSession,
    removeSession,
    updateSessionAdvice,
  };
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
export function compareExercises(
  latest: WorkoutSession,
  previous: WorkoutSession | undefined,
): ExerciseComparison[] {
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
