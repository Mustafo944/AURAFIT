"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Exercise, MuscleGroupId } from "@/lib/exercises";
import { computeCaloriesBurned, type SetEntry, type WorkoutSession } from "@/lib/workout-log";
import { useAuth } from "@/context/auth-context";

export interface ActiveExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroupId;
  sets: SetEntry[];
}

export interface ActiveSession {
  startedAt: string;
  exercises: ActiveExercise[];
}

const STORAGE_PREFIX = "aurafit_active_session";

interface WorkoutSessionContextValue {
  activeSession: ActiveSession | null;
  isActive: boolean;
  startSession: () => void;
  logSet: (exercise: Exercise, set: SetEntry) => void;
  removeSet: (exerciseId: string, setIndex: number) => void;
  discardSession: () => void;
  finishSession: (weightKg: number) => WorkoutSession | null;
  getLoggedSets: (exerciseId: string) => SetEntry[];
}

const WorkoutSessionContext = createContext<WorkoutSessionContextValue | null>(null);

function readDraft(key: string): ActiveSession | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveSession;
  } catch {
    return null;
  }
}

function writeDraft(key: string, session: ActiveSession | null) {
  if (session) localStorage.setItem(key, JSON.stringify(session));
  else localStorage.removeItem(key);
}

// Faol (hali yakunlanmagan) mashg'ulot qoralamasi ataylab faqat shu qurilmada,
// localStorage'da saqlanadi — har bir podxodni tarmoqqa real vaqtda yozish
// ortiqcha; yakunlangan mashg'ulotgina Supabase'ga (workout-log.ts) yuboriladi.
// Kalit foydalanuvchi ID'siga bog'langan, shuning uchun bitta qurilmada
// turli hisoblar orasida qoralama aralashib qolmaydi.
export function WorkoutSessionProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const storageKey = `${STORAGE_PREFIX}_${userId ?? "anon"}`;

  useEffect(() => {
    // Qoralama localStorage'da saqlanadi — u serverda mavjud emas, shuning
    // uchun hydration mosligini buzmaslik uchun faqat mount'dan keyin o'qiladi;
    // bu yerda sync setState muqarrar (renderda localStorage o'qib bo'lmaydi).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveSession(userId ? readDraft(`${STORAGE_PREFIX}_${userId}`) : null);
  }, [userId]);

  const startSession = () => {
    const session: ActiveSession = { startedAt: new Date().toISOString(), exercises: [] };
    writeDraft(storageKey, session);
    setActiveSession(session);
  };

  const logSet = (exercise: Exercise, set: SetEntry) => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      const exercises = [...prev.exercises];
      const index = exercises.findIndex((e) => e.exerciseId === exercise.id);
      if (index === -1) {
        exercises.push({
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          muscleGroup: exercise.muscleGroup,
          sets: [set],
        });
      } else {
        exercises[index] = { ...exercises[index], sets: [...exercises[index].sets, set] };
      }
      const next = { ...prev, exercises };
      writeDraft(storageKey, next);
      return next;
    });
  };

  const removeSet = (exerciseId: string, setIndex: number) => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      const exercises = prev.exercises
        .map((e) => (e.exerciseId === exerciseId ? { ...e, sets: e.sets.filter((_, i) => i !== setIndex) } : e))
        .filter((e) => e.sets.length > 0);
      const next = { ...prev, exercises };
      writeDraft(storageKey, next);
      return next;
    });
  };

  const discardSession = () => {
    writeDraft(storageKey, null);
    setActiveSession(null);
  };

  const finishSession = (weightKg: number): WorkoutSession | null => {
    if (!activeSession || activeSession.exercises.length === 0) return null;
    const finishedAt = new Date().toISOString();
    const totalVolumeKg = activeSession.exercises.reduce(
      (sum, ex) => sum + ex.sets.reduce((s, set) => s + set.weightKg * set.reps, 0),
      0
    );
    const totalSets = activeSession.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const session: WorkoutSession = {
      id: crypto.randomUUID(),
      startedAt: activeSession.startedAt,
      finishedAt,
      exercises: activeSession.exercises,
      totalVolumeKg,
      totalSets,
      caloriesBurned: computeCaloriesBurned(activeSession.startedAt, finishedAt, weightKg, totalSets),
    };
    writeDraft(storageKey, null);
    setActiveSession(null);
    return session;
  };

  const getLoggedSets = (exerciseId: string) =>
    activeSession?.exercises.find((e) => e.exerciseId === exerciseId)?.sets ?? [];

  return (
    <WorkoutSessionContext.Provider
      value={{
        activeSession,
        isActive: activeSession !== null,
        startSession,
        logSet,
        removeSet,
        discardSession,
        finishSession,
        getLoggedSets,
      }}
    >
      {children}
    </WorkoutSessionContext.Provider>
  );
}

export function useWorkoutSession() {
  const ctx = useContext(WorkoutSessionContext);
  if (!ctx) {
    throw new Error("useWorkoutSession must be used within a WorkoutSessionProvider");
  }
  return ctx;
}
