"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkoutSession } from "@/context/workout-session-context";
import { getPersonalRecords } from "@/lib/personal-records";
import { getExerciseHistory, type WorkoutSession } from "@/lib/workout-log";
import { EXERCISES } from "@/lib/exercises";
import { ExercisePicker } from "@/components/workout/exercise-picker";
import { ExerciseLoggerRow } from "@/components/workout/exercise-logger-row";
import { CardioSection } from "@/components/workout/cardio-section";

function formatElapsed(startedAt: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}s ${rest}d` : `${rest}d`;
}

// Faol mashg'ulot ekrani: mashqlar rejasi -> podxod kiritish -> kardio ->
// yakunlash. Mashg'ulot boshida reja bo'sh bo'lsa, avval tanlash oynasi ochiladi.
export function ActiveWorkout({
  sessions,
  weightKg,
  onFinish,
}: {
  sessions: WorkoutSession[];
  weightKg: number;
  onFinish: () => void;
}) {
  const { activeSession, removeExercise, logSet, removeSet, addCardio, removeCardio, discardSession } =
    useWorkoutSession();

  const [pickerOpen, setPickerOpen] = useState((activeSession?.exercises.length ?? 0) === 0);

  // Tarixiy rekordlar bir marta hisoblanadi — har podxod kiritilishida
  // qatorlar 80 ta mashq bo'ylab qayta izlanmasin.
  const records = useMemo(() => getPersonalRecords(sessions), [sessions]);

  // Sarlavhadagi o'tgan vaqtni har 30 soniyada yangilab turadi.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  if (!activeSession) return null;

  const totalSetsLogged = activeSession.exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const canFinish = totalSetsLogged > 0 || activeSession.cardio.length > 0;

  return (
    <div className="space-y-stack-md">
      <div className="glass-card rounded-xl p-4 flex items-center gap-3 border-l-[3px] border-l-primary-fixed-dim">
        <span className="material-symbols-outlined text-primary-fixed-dim animate-pulse">fiber_manual_record</span>
        <div className="min-w-0 flex-1">
          <div className="font-headline-md text-[16px] text-primary uppercase italic">
            Faol Mashg&apos;ulot &middot; {formatElapsed(activeSession.startedAt)}
          </div>
          <div className="font-label-mono text-[11px] text-on-surface-variant truncate">
            {totalSetsLogged} podxod · {activeSession.exercises.length} mashq
            {activeSession.cardio.length > 0 ? ` · ${activeSession.cardio.length} kardio` : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={discardSession}
          className="shrink-0 px-3 py-2 rounded-lg bg-white/5 text-on-surface-variant border border-white/10 hover:bg-white/10 transition-colors font-label-mono text-[11px] uppercase"
        >
          Bekor
        </button>
      </div>

      {pickerOpen ? (
        <ExercisePicker onDone={() => setPickerOpen(false)} />
      ) : (
        <>
          <div className="space-y-2.5">
            {activeSession.exercises.map((ex) => {
              const exercise = EXERCISES.find((e) => e.id === ex.exerciseId);
              if (!exercise) return null;
              const lastSets = getExerciseHistory(sessions, ex.exerciseId)[0]?.sets ?? null;
              return (
                <ExerciseLoggerRow
                  key={ex.exerciseId}
                  exercise={exercise}
                  sets={ex.sets}
                  lastSets={lastSets}
                  record={records.get(ex.exerciseId)}
                  onLogSet={(set) => logSet(ex.exerciseId, set)}
                  onRemoveSet={(index) => removeSet(ex.exerciseId, index)}
                  onRemove={() => removeExercise(ex.exerciseId)}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/20 text-on-surface-variant hover:text-primary hover:border-primary/40 transition-colors font-label-mono text-label-mono uppercase"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Mashq Qo&apos;shish
          </button>

          <CardioSection
            weightKg={weightKg}
            cardio={activeSession.cardio}
            onAdd={addCardio}
            onRemove={removeCardio}
          />

          <button
            type="button"
            onClick={onFinish}
            disabled={!canFinish}
            className="w-full bg-primary-container text-on-primary-container font-headline-md text-headline-md uppercase italic py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-fixed glow-button transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            Mashg&apos;ulotni Yakunlash
          </button>
        </>
      )}
    </div>
  );
}
