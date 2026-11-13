"use client";

import { RestTimer } from "@/components/workout/rest-timer";
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
  saving = false,
}: {
  sessions: WorkoutSession[];
  weightKg: number;
  onFinish: () => void;
  saving?: boolean;
}) {
  const {
    activeSession,
    removeExercise,
    logSet,
    removeSet,
    addCardio,
    removeCardio,
    discardSession,
    setRestEndsAt,
  } = useWorkoutSession();

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
    <div className={`space-y-stack-md ${pickerOpen ? "" : "max-w-3xl mx-auto"}`}>
      <div className="glass-card glass-card-hover rounded-2xl p-4 md:p-5 flex items-center gap-4 border-l-[4px] border-l-primary-fixed-dim shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary-fixed-dim/10 rounded-full blur-xl pointer-events-none" />
        <div className="relative flex items-center justify-center shrink-0 w-8 h-8 rounded-full bg-primary-fixed-dim/15 border border-primary-fixed-dim/30">
          <span className="w-2.5 h-2.5 rounded-full bg-primary-fixed-dim" />
          <span className="absolute w-5 h-5 rounded-full bg-primary-fixed-dim/30 animate-ping" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-headline-md text-[17px] text-primary uppercase italic tracking-tight flex items-center gap-2">
            Faol Mashg&apos;ulot
            <span className="text-white/20">&middot;</span>
            <span className="font-label-mono text-tertiary-fixed-dim font-bold text-[13px]">{formatElapsed(activeSession.startedAt)}</span>
          </div>
          <div className="font-label-mono text-[11px] text-on-surface-variant truncate mt-0.5">
            {totalSetsLogged} podxod &middot; {activeSession.exercises.length} mashq
            {activeSession.cardio.length > 0 ? ` &middot; ${activeSession.cardio.length} kardio` : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={discardSession}
          className="shrink-0 px-3.5 py-1.5 rounded-xl bg-white/5 text-on-surface-variant border border-white/10 hover:bg-error/15 hover:text-error hover:border-error/30 transition-all font-label-mono text-[11px] uppercase active:scale-95"
        >
          Bekor qilish
        </button>
      </div>

      {!pickerOpen && <RestTimer deadline={activeSession.restEndsAt} onChange={setRestEndsAt} />}
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
            disabled={!canFinish || saving}
            className="w-full bg-primary-container text-on-primary-container font-headline-md text-headline-md uppercase italic py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-fixed glow-button transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            {saving ? "Saqlanmoqda..." : "Mashg'ulotni yakunlash"}
          </button>
        </>
      )}
    </div>
  );
}
