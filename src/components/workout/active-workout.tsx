"use client";

import { WorkoutHud } from "@/components/workout/workout-hud";
import { CollapsiblePanel } from "@/components/collapsible-panel";
import { parseTargetSets, restSecondsFor, setVolume } from "@/lib/workout-rows";
import { useMemo, useState } from "react";
import { useWorkoutSession } from "@/context/workout-session-context";
import { getPersonalRecords } from "@/lib/personal-records";
import { getExerciseHistory, type WorkoutSession } from "@/lib/workout-log";
import { EXERCISES } from "@/lib/exercises";
import { ExercisePicker } from "@/components/workout/exercise-picker";
import { ExerciseLoggerRow } from "@/components/workout/exercise-logger-row";
import { CardioSection } from "@/components/workout/cardio-section";

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

  const [cardioOpen, setCardioOpen] = useState(false);
  // null — avtomatik (birinchi tugallanmagan mashq ochiq); "" — hammasi yopiq;
  // aks holda foydalanuvchi qo'lda ochgan mashq.
  const [manualOpen, setManualOpen] = useState<string | null>(null);

  if (!activeSession) return null;

  const targetOf = (exerciseId: string) => {
    const exercise = EXERCISES.find((e) => e.id === exerciseId);
    return exercise ? parseTargetSets(exercise.sets) : 3;
  };
  const totalSetsLogged = activeSession.exercises.reduce((sum, e) => sum + e.sets.length, 0);
  const totalSetsPlanned = activeSession.exercises.reduce(
    (sum, e) => sum + Math.max(targetOf(e.exerciseId), e.sets.length),
    0,
  );
  const volumeKg = activeSession.exercises.reduce((sum, e) => sum + setVolume(e.sets), 0);
  const canFinish = totalSetsLogged > 0 || activeSession.cardio.length > 0;
  const firstIncomplete = activeSession.exercises.find((e) => e.sets.length < targetOf(e.exerciseId));
  const openId = manualOpen ?? firstIncomplete?.exerciseId ?? "";

  return (
    <div className={`space-y-stack-md ${pickerOpen ? "" : "max-w-3xl mx-auto"}`}>
      {!pickerOpen && (
        <WorkoutHud
          startedAt={activeSession.startedAt}
          volumeKg={volumeKg}
          setsDone={totalSetsLogged}
          setsTotal={totalSetsPlanned}
          restEndsAt={activeSession.restEndsAt}
          onRestChange={setRestEndsAt}
          onDiscard={discardSession}
        />
      )}
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
                  open={openId === ex.exerciseId}
                  onToggle={() => setManualOpen(openId === ex.exerciseId ? "" : ex.exerciseId)}
                  onLogSet={(set) => {
                    logSet(ex.exerciseId, set, restSecondsFor(exercise));
                    // Mashq tugagach keyingi tugallanmagan mashq o'zi ochiladi.
                    if (ex.sets.length + 1 === targetOf(ex.exerciseId)) setManualOpen(null);
                  }}
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

          <CollapsiblePanel
            title={`Kardio${activeSession.cardio.length > 0 ? ` (${activeSession.cardio.length})` : ""}`}
            icon="directions_run"
            open={cardioOpen}
            onToggle={() => setCardioOpen((v) => !v)}
          >
            <CardioSection
              weightKg={weightKg}
              cardio={activeSession.cardio}
              onAdd={addCardio}
              onRemove={removeCardio}
            />
          </CollapsiblePanel>

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
