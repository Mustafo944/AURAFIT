"use client";

import type { Exercise } from "@/lib/exercise-metadata";
import type { WorkoutSession } from "@/lib/workout-log";
import {
  WORKOUT_PROGRAMS,
  daysAgoLabel,
  lastRepeatableSession,
  resolveExercises,
  sessionTitle,
} from "@/lib/workout-programs";
import { MuscleIcon } from "@/components/workout/muscle-icon";

// Mashg'ulotni boshlash ekrani — uch yo'l, tezligi bo'yicha tartiblangan:
// 1) oxirgi mashg'ulotni takrorlash, 2) tayyor dastur, 3) mashqlarni o'zi tanlash.
// `onStart(exercises)` reja bilan boshlaydi; argumentsiz — mashq tanlash oynasini ochadi.
export function StartPanel({
  sessions,
  onStart,
}: {
  sessions: WorkoutSession[];
  onStart: (exercises?: Exercise[]) => void;
}) {
  const last = lastRepeatableSession(sessions);
  const lastExercises = last ? resolveExercises(last.exercises.map((e) => e.exerciseId)) : [];

  return (
    <section aria-label="Mashg'ulotni boshlash" className="space-y-4">
      {last && (
        <div className="glass-card rounded-2xl p-5 border-l-[4px] border-l-primary-fixed-dim space-y-4">
          <div>
            <p className="font-label-mono text-[10px] uppercase tracking-widest text-primary-fixed-dim">
              Oxirgi mashg&apos;ulot · {daysAgoLabel(last.finishedAt, new Date())}
            </p>
            <h3 className="font-headline-md text-[22px] text-primary leading-tight mt-1">{sessionTitle(last)}</h3>
            <p className="font-label-mono text-[11px] text-on-surface-variant mt-1">
              {lastExercises.length} mashq · {last.totalSets} podxod
            </p>
          </div>
          <button
            type="button"
            onClick={() => onStart(lastExercises)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary-container text-on-primary-container py-3.5 font-headline-md text-[17px] uppercase italic glow-button hover:bg-primary-fixed transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              play_arrow
            </span>
            Takrorlash
          </button>
        </div>
      )}

      <div>
        <h3 className="font-label-mono text-[11px] uppercase tracking-widest text-on-surface-variant mb-2 px-1">
          Tayyor dasturlar
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {WORKOUT_PROGRAMS.map((program) => (
            <button
              key={program.id}
              type="button"
              onClick={() => onStart(resolveExercises(program.exerciseIds))}
              aria-label={`${program.name}: ${program.exerciseIds.length} mashq bilan boshlash`}
              className="glass-card press-card flex flex-col items-start rounded-2xl p-4 text-left hover:border-primary-fixed-dim/40 transition-colors"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-fixed-dim/15 text-primary-fixed-dim">
                <MuscleIcon group={program.muscleGroup} size={24} />
              </span>
              <span className="block font-headline-md text-[17px] text-primary mt-3 leading-tight">
                {program.name}
              </span>
              <span className="block text-[12px] text-on-surface-variant mt-1 leading-snug">{program.focus}</span>
              <span className="block font-label-mono text-[10px] uppercase text-primary-fixed-dim mt-2">
                {program.exerciseIds.length} mashq
              </span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onStart()}
        className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-label-mono text-label-mono uppercase tracking-wider transition-colors ${
          last
            ? "border border-white/15 text-on-surface hover:border-primary/40 hover:text-primary"
            : "bg-primary-container text-on-primary-container glow-button hover:bg-primary-fixed"
        }`}
      >
        <span className="material-symbols-outlined text-[20px]">add</span>
        O&apos;zim tanlayman
      </button>
    </section>
  );
}
