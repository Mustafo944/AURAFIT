"use client";

import { useEffect, useRef } from "react";
import { ExerciseDemo } from "@/components/workout/exercise-demo";
import { EQUIPMENT_LABELS, LEVEL_LABELS, MUSCLE_GROUPS, type Exercise } from "@/lib/exercise-metadata";

export function ExerciseDetails({
  exercise,
  selected,
  locked,
  onToggle,
  onClose,
}: {
  exercise: Exercise;
  selected: boolean;
  locked: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      onClose={(event) => {
        // Strict Mode can close and reopen the dialog before its queued close event.
        if (!event.currentTarget.open) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="exercise-detail-title"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-4xl overflow-y-auto rounded-3xl border border-white/15 bg-[#181c1a] p-0 text-on-surface shadow-2xl backdrop:bg-black/80 backdrop:backdrop-blur-sm"
    >
      <div className="px-5 md:px-8">
        <div className="sticky top-0 z-10 mb-6 flex items-start gap-4 border-b border-white/10 bg-[#181c1a]/95 py-5 backdrop-blur-xl md:py-6">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary">
              Bajarish qo&apos;llanmasi
            </p>
            <h2 id="exercise-detail-title" className="text-xl font-semibold md:text-2xl">
              {exercise.name}
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">{exercise.englishName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Qo'llanmani yopish"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-xl hover:bg-white/10"
          >
            ×
          </button>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <ExerciseDemo key={exercise.id} exercise={exercise} />
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-on-surface-variant">
              <span className="rounded-lg bg-white/5 px-3 py-2">
                {MUSCLE_GROUPS.find((group) => group.id === exercise.muscleGroup)?.label}
              </span>
              <span className="rounded-lg bg-white/5 px-3 py-2">{EQUIPMENT_LABELS[exercise.equipment]}</span>
              <span className="rounded-lg bg-white/5 px-3 py-2">{LEVEL_LABELS[exercise.level]}</span>
            </div>
          </div>
          <div>
            <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs text-on-surface-variant">Namunaviy hajm</p>
              <p className="mt-1 text-xl font-semibold text-primary">
                {exercise.sets} podxod <span className="text-on-surface-variant">×</span> {exercise.reps}
              </p>
              <p className="mt-2 text-xs text-on-surface-variant">
                Hajmni o&apos;z tayyorgarligingizga moslang.
              </p>
            </div>
            <h3 className="mb-4 font-semibold">Qanday bajariladi?</h3>
            <ol className="space-y-4">
              {exercise.instructions.map((step, index) => (
                <li key={index} className="flex gap-3 text-sm leading-relaxed text-on-surface-variant">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs text-primary">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          disabled={locked}
          className="sticky bottom-4 z-10 my-7 min-h-12 w-full rounded-xl bg-primary-container px-4 py-3 font-semibold text-on-primary-container shadow-[0_0_0_8px_#181c1a] disabled:opacity-50"
        >
          {locked ? "Podxodlar qayd etilgan" : selected ? "Rejadan olib tashlash" : "Rejaga qo'shish"}
        </button>
      </div>
    </dialog>
  );
}
