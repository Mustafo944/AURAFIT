"use client";

import { useEffect, useState } from "react";
import { useWorkoutSession } from "@/context/workout-session-context";
import { useWorkoutHistory, getExerciseHistory } from "@/lib/workout-log";
import type { Exercise } from "@/lib/exercises";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" });
}

export function ExerciseSetLogger({ exercise }: { exercise: Exercise }) {
  const { getLoggedSets, logSet, removeSet } = useWorkoutSession();
  const { sessions } = useWorkoutHistory();
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");

  const sets = getLoggedSets(exercise.id);
  const history = getExerciseHistory(sessions, exercise.id);
  const lastPerformance = history[0] ?? null;

  // Oxirgi safar shu mashqda bajarilgan eng og'ir podxod ma'lum bo'lishi bilan
  // maydonlarni shu qiymatlar bilan oldindan to'ldiradi — foydalanuvchi qayta
  // eslab, qayta yozib o'tirmasin. Faqat maydonlar hali bo'sh bo'lsagina ishlaydi.
  useEffect(() => {
    if (lastPerformance && weight === "" && reps === "") {
      setWeight(String(lastPerformance.bestSet.weightKg));
      setReps(String(lastPerformance.bestSet.reps));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastPerformance]);

  const handleAdd = () => {
    const weightKg = Number(weight);
    const repsCount = Number(reps);
    if (!(weightKg > 0) || !(repsCount > 0)) return;
    logSet(exercise, { weightKg, reps: repsCount });
    setWeight("");
    setReps("");
  };

  return (
    <div className="px-4 pb-4 pt-3 border-t border-white/10 space-y-3">
      <div className="flex items-center gap-2 font-label-mono text-label-mono text-tertiary-fixed-dim uppercase">
        <span className="material-symbols-outlined text-[16px]">edit_note</span>
        Bajarilgan Podxodlar
      </div>

      {history.length > 0 && (
        <div className="bg-surface-container/30 rounded px-3 py-2 space-y-1.5">
          <div className="flex items-center gap-2 font-label-mono text-[10px] text-primary-fixed-dim uppercase">
            <span className="material-symbols-outlined text-[14px]">history</span>
            Barcha O&apos;tgan Natijalar ({history.length})
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
            {history.map((performance, index) => (
              <div key={performance.finishedAt} className="flex items-center gap-2 font-label-mono text-[11px]">
                <span className="text-on-surface-variant shrink-0 w-10">{formatDate(performance.finishedAt)}</span>
                <span className={index === 0 ? "text-on-surface" : "text-on-surface-variant"}>
                  {performance.sets.map((s) => `${s.weightKg}kg×${s.reps}`).join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sets.length > 0 && (
        <div className="space-y-1.5">
          {sets.map((set, index) => (
            <div key={index} className="flex items-center justify-between bg-surface-container/50 rounded px-3 py-1.5">
              <span className="font-body-md text-[13px] text-on-surface">
                {index + 1}-podxod: <span className="text-primary font-bold">{set.weightKg} kg</span> &times; {set.reps} takror
              </span>
              <button
                type="button"
                onClick={() => removeSet(exercise.id, index)}
                aria-label="Podxodni o'chirish"
                className="text-on-surface-variant hover:text-error transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          placeholder="kg"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="w-full min-w-0 bg-[#000000] border border-white/10 rounded px-3 py-2 text-on-surface font-body-md text-[14px] focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none"
        />
        <span className="text-on-surface-variant font-label-mono text-label-mono shrink-0">&times;</span>
        <input
          type="number"
          inputMode="numeric"
          placeholder="takror"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="w-full min-w-0 bg-[#000000] border border-white/10 rounded px-3 py-2 text-on-surface font-body-md text-[14px] focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none"
        />
        <button
          type="button"
          onClick={handleAdd}
          aria-label="Podxod qo'shish"
          className="shrink-0 w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center hover:bg-primary-fixed transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
        </button>
      </div>
    </div>
  );
}
