"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useWorkoutSession } from "@/context/workout-session-context";
import {
  EXERCISES,
  MUSCLE_GROUPS,
  EQUIPMENT_LABELS,
  LEVEL_LABELS,
  type Exercise,
  type MuscleGroupId,
} from "@/lib/exercises";

// Mashg'ulot boshida mashqlarni tanlash oynasi: mushak guruhi -> mashqlar ro'yxati.
// Mashqni bosish uni darhol reja (activeSession) ichiga qo'shadi yoki olib
// tashlaydi — alohida "saqlash" qadamisiz, tanlangan holat shu yerdayoq ko'rinadi.
export function ExercisePicker({ onDone }: { onDone: () => void }) {
  const { activeSession, addExercises, removeExercise } = useWorkoutSession();
  const [group, setGroup] = useState<MuscleGroupId | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const selectedIds = useMemo(
    () => new Set(activeSession?.exercises.map((e) => e.exerciseId) ?? []),
    [activeSession]
  );

  const toggle = (exercise: Exercise) => {
    if (selectedIds.has(exercise.id)) removeExercise(exercise.id);
    else addExercises([exercise]);
  };

  const groupExercises = group ? EXERCISES.filter((e) => e.muscleGroup === group) : [];
  const groupInfo = group ? MUSCLE_GROUPS.find((g) => g.id === group) : null;

  return (
    <div className="glass-card rounded-xl p-5 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="font-headline-md text-headline-md text-primary uppercase italic">
            {groupInfo ? groupInfo.label : "Mushak Guruhini Tanlang"}
          </h2>
          <p className="font-label-mono text-label-mono text-on-surface-variant uppercase">
            {selectedIds.size > 0 ? `${selectedIds.size} ta mashq tanlandi` : "Mashqlarni tanlab ro'yxat tuzing"}
          </p>
        </div>
        <button
          type="button"
          onClick={onDone}
          className={`shrink-0 px-5 py-2.5 rounded-lg font-headline-md text-[15px] uppercase italic transition-colors ${
            selectedIds.size > 0
              ? "bg-primary-container text-on-primary-container glow-button hover:bg-primary-fixed"
              : "bg-white/5 text-on-surface-variant border border-white/10 hover:text-primary"
          }`}
        >
          {selectedIds.size > 0 ? "Tayyor" : "O'tkazib yuborish"}
        </button>
      </div>

      {group === null ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-gutter">
          {MUSCLE_GROUPS.map((g) => {
            const exs = EXERCISES.filter((e) => e.muscleGroup === g.id);
            if (exs.length === 0) return null;
            const chosen = exs.filter((e) => selectedIds.has(e.id)).length;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroup(g.id)}
                className="glass-card rounded-xl overflow-hidden relative h-36 text-left group hover:-translate-y-1 hover:border-primary/50 transition-all duration-300"
              >
                <Image
                  src={exs[0].image}
                  alt={g.label}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover opacity-40 group-hover:opacity-60 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
                {chosen > 0 && (
                  <div className="absolute top-3 right-3 min-w-6 h-6 px-1.5 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-mono text-[11px] font-bold">
                    {chosen}
                  </div>
                )}
                <div className="absolute inset-0 flex flex-col items-start justify-end p-4">
                  <span className="material-symbols-outlined text-primary-fixed-dim text-2xl mb-1">{g.icon}</span>
                  <h3 className="font-headline-md text-[19px] text-primary uppercase italic leading-none">{g.label}</h3>
                  <span className="font-label-mono text-label-mono text-on-surface-variant mt-1">{exs.length} TA MASHQ</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setGroup(null)}
            className="flex items-center gap-2 font-label-mono text-label-mono uppercase text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Barcha Guruhlar
          </button>

          <div className="space-y-2.5">
            {groupExercises.map((exercise) => {
              const selected = selectedIds.has(exercise.id);
              const expanded = expandedId === exercise.id;
              return (
                <div
                  key={exercise.id}
                  className={`rounded-xl border overflow-hidden transition-colors ${
                    selected ? "border-primary-fixed-dim/70 bg-primary-fixed-dim/5" : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => toggle(exercise)}
                      aria-pressed={selected}
                      className="flex items-center gap-3 flex-1 min-w-0 p-2.5 text-left"
                    >
                      <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden">
                        <Image
                          src={exercise.image}
                          alt={exercise.englishName}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-body-md text-[15px] text-on-surface font-semibold leading-tight truncate">
                          {exercise.name}
                        </div>
                        <div className="font-label-mono text-[11px] text-on-surface-variant uppercase mt-0.5">
                          {EQUIPMENT_LABELS[exercise.equipment]} · {LEVEL_LABELS[exercise.level]}
                        </div>
                        <div className="font-label-mono text-[11px] text-primary-fixed-dim mt-0.5">
                          {exercise.sets} × {exercise.reps}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          selected
                            ? "bg-primary-container text-on-primary-container"
                            : "bg-white/5 text-on-surface-variant border border-white/15"
                        }`}
                      >
                        <span
                          className="material-symbols-outlined text-[20px]"
                          style={{ fontVariationSettings: selected ? "'FILL' 1" : undefined }}
                        >
                          {selected ? "check_circle" : "add"}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : exercise.id)}
                      aria-expanded={expanded}
                      aria-label="Bajarilish texnikasi"
                      className="shrink-0 w-11 flex items-center justify-center border-l border-white/10 text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span
                        className="material-symbols-outlined text-[20px] transition-transform duration-200"
                        style={{ transform: expanded ? "rotate(180deg)" : undefined }}
                      >
                        expand_more
                      </span>
                    </button>
                  </div>
                  {expanded && (
                    <ol className="px-3 pb-3 pt-1 space-y-1.5 border-t border-white/10">
                      {exercise.instructions.map((step, i) => (
                        <li key={i} className="flex gap-2.5 font-body-md text-[13px] text-on-surface-variant">
                          <span className="font-label-mono text-[11px] text-primary-fixed-dim shrink-0">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
