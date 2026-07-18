"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Exercise, MuscleGroupId } from "@/lib/exercises";
import { computeCaloriesBurned, type SetEntry, type WorkoutSession } from "@/lib/workout-log";
import { type CardioEntry } from "@/lib/cardio";
import { useAuth } from "@/context/auth-context";

export interface ActiveExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroupId;
  sets: SetEntry[];
}

export interface ActiveSession {
  startedAt: string;
  // Foydalanuvchi mashg'ulot boshida tanlab qo'ygan mashqlar rejasi. Podxod
  // hali kiritilmagan bo'lsa ham (sets bo'sh) ro'yxatda turadi.
  exercises: ActiveExercise[];
  cardio: CardioEntry[];
}

const STORAGE_PREFIX = "aurafit_active_session";

interface WorkoutSessionContextValue {
  activeSession: ActiveSession | null;
  isActive: boolean;
  startSession: () => void;
  addExercises: (exercises: Exercise[]) => void;
  removeExercise: (exerciseId: string) => void;
  logSet: (exerciseId: string, set: SetEntry) => void;
  removeSet: (exerciseId: string, setIndex: number) => void;
  addCardio: (entry: CardioEntry) => void;
  removeCardio: (index: number) => void;
  discardSession: () => void;
  finishSession: (weightKg: number) => WorkoutSession | null;
  getLoggedSets: (exerciseId: string) => SetEntry[];
}

const WorkoutSessionContext = createContext<WorkoutSessionContextValue | null>(null);

function readDraft(key: string): ActiveSession | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ActiveSession;
    // Eski qoralamada `cardio` bo'lmasligi mumkin — himoya uchun to'ldiramiz.
    return { ...parsed, cardio: parsed.cardio ?? [] };
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

  // Barcha o'zgartirishlar bitta joydan yoziladi — qoralamani localStorage bilan
  // sinxron tutish uchun. `updater` yangi holatni qaytaradi (yoki o'zgarishsiz prev).
  const mutate = (updater: (prev: ActiveSession) => ActiveSession) => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      writeDraft(storageKey, next);
      return next;
    });
  };

  const startSession = () => {
    const session: ActiveSession = { startedAt: new Date().toISOString(), exercises: [], cardio: [] };
    writeDraft(storageKey, session);
    setActiveSession(session);
  };

  const addExercises = (exercises: Exercise[]) => {
    mutate((prev) => {
      const existing = new Set(prev.exercises.map((e) => e.exerciseId));
      const added = exercises
        .filter((e) => !existing.has(e.id))
        .map((e) => ({ exerciseId: e.id, exerciseName: e.name, muscleGroup: e.muscleGroup, sets: [] as SetEntry[] }));
      if (added.length === 0) return prev;
      return { ...prev, exercises: [...prev.exercises, ...added] };
    });
  };

  const removeExercise = (exerciseId: string) => {
    mutate((prev) => ({ ...prev, exercises: prev.exercises.filter((e) => e.exerciseId !== exerciseId) }));
  };

  const logSet = (exerciseId: string, set: SetEntry) => {
    mutate((prev) => ({
      ...prev,
      exercises: prev.exercises.map((e) => (e.exerciseId === exerciseId ? { ...e, sets: [...e.sets, set] } : e)),
    }));
  };

  // Podxod o'chirilganda mashq rejadan CHIQMAYDI (sets bo'sh qolsa ham karta
  // turadi) — foydalanuvchi qayta podxod kirita olishi uchun.
  const removeSet = (exerciseId: string, setIndex: number) => {
    mutate((prev) => ({
      ...prev,
      exercises: prev.exercises.map((e) =>
        e.exerciseId === exerciseId ? { ...e, sets: e.sets.filter((_, i) => i !== setIndex) } : e
      ),
    }));
  };

  const addCardio = (entry: CardioEntry) => {
    mutate((prev) => ({ ...prev, cardio: [...prev.cardio, entry] }));
  };

  const removeCardio = (index: number) => {
    mutate((prev) => ({ ...prev, cardio: prev.cardio.filter((_, i) => i !== index) }));
  };

  const discardSession = () => {
    writeDraft(storageKey, null);
    setActiveSession(null);
  };

  const finishSession = (weightKg: number): WorkoutSession | null => {
    if (!activeSession) return null;
    // Faqat kamida bitta podxod kiritilgan mashqlar saqlanadi.
    const loggedExercises = activeSession.exercises.filter((e) => e.sets.length > 0);
    const cardio = activeSession.cardio;
    if (loggedExercises.length === 0 && cardio.length === 0) return null;

    const finishedAt = new Date().toISOString();
    const totalVolumeKg = loggedExercises.reduce(
      (sum, ex) => sum + ex.sets.reduce((s, set) => s + set.weightKg * set.reps, 0),
      0
    );
    const totalSets = loggedExercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const strengthCalories = computeCaloriesBurned(activeSession.startedAt, finishedAt, weightKg, totalSets);
    const cardioCalories = cardio.reduce((sum, c) => sum + c.caloriesBurned, 0);

    const session: WorkoutSession = {
      id: crypto.randomUUID(),
      startedAt: activeSession.startedAt,
      finishedAt,
      exercises: loggedExercises,
      cardio,
      totalVolumeKg,
      totalSets,
      caloriesBurned: strengthCalories + cardioCalories,
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
        addExercises,
        removeExercise,
        logSet,
        removeSet,
        addCardio,
        removeCardio,
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
