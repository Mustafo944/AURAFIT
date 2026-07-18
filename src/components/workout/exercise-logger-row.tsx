"use client";

import { useState } from "react";
import Image from "next/image";
import type { Exercise } from "@/lib/exercises";
import type { SetEntry } from "@/lib/workout-log";

const WEIGHT_STEP = 2.5; // eng keng tarqalgan disk qadami
const REPS_STEP = 1;

function Stepper({
  value,
  onChange,
  step,
  suffix,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  step: number;
  suffix: string;
  ariaLabel: string;
}) {
  const adjust = (delta: number) => {
    const next = Math.max(0, Math.round(((Number(value) || 0) + delta) * 100) / 100);
    onChange(String(next));
  };
  return (
    <div className="flex items-center bg-black rounded-lg border border-white/10 overflow-hidden flex-1 min-w-[120px]">
      <button
        type="button"
        onClick={() => adjust(-step)}
        aria-label={`${ariaLabel} kamaytirish`}
        className="w-9 h-11 shrink-0 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-white/5 transition-colors text-[20px] leading-none select-none"
      >
        −
      </button>
      <div className="relative flex-1 min-w-0">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel}
          className="w-full bg-transparent text-center text-on-surface font-headline-md text-[16px] py-2.5 pr-8 outline-none"
        />
        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 font-label-mono text-[9px] text-on-surface-variant uppercase whitespace-nowrap">
          {suffix}
        </span>
      </div>
      <button
        type="button"
        onClick={() => adjust(step)}
        aria-label={`${ariaLabel} oshirish`}
        className="w-9 h-11 shrink-0 flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-white/5 transition-colors text-[20px] leading-none select-none"
      >
        +
      </button>
    </div>
  );
}

export function ExerciseLoggerRow({
  exercise,
  sets,
  lastSets,
  onLogSet,
  onRemoveSet,
  onRemove,
}: {
  exercise: Exercise;
  sets: SetEntry[];
  lastSets: SetEntry[] | null;
  onLogSet: (set: SetEntry) => void;
  onRemoveSet: (index: number) => void;
  onRemove: () => void;
}) {
  // Oxirgi marta shu mashqda qilingan eng og'ir podxod bilan oldindan to'ldiramiz —
  // foydalanuvchi qaytadan eslab yozmasin.
  const lastBest =
    lastSets && lastSets.length > 0
      ? lastSets.reduce((best, s) => (s.weightKg > best.weightKg ? s : best))
      : null;
  const [weight, setWeight] = useState(lastBest ? String(lastBest.weightKg) : "");
  const [reps, setReps] = useState(lastBest ? String(lastBest.reps) : "");

  const add = () => {
    const weightKg = Number(weight);
    const repsCount = Number(reps);
    if (!(weightKg > 0) || !(repsCount > 0)) return;
    onLogSet({ weightKg, reps: repsCount });
  };

  // Oxirgi kiritilgan podxodni bir bosishda takrorlash.
  const repeatLast = () => {
    const last = sets[sets.length - 1];
    if (last) onLogSet({ ...last });
  };

  return (
    <div
      className={`glass-card rounded-xl overflow-hidden transition-colors ${
        sets.length > 0 ? "border-l-[3px] border-l-primary-fixed-dim" : ""
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden">
          <Image src={exercise.image} alt={exercise.englishName} fill sizes="48px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-headline-md text-[16px] text-primary uppercase italic leading-tight truncate">
            {exercise.name}
          </div>
          <div className="font-label-mono text-[11px] text-on-surface-variant">
            Maqsad: {exercise.sets} × {exercise.reps}
            {lastBest && (
              <span className="text-primary-fixed-dim">
                {" "}
                · oxirgi: {lastBest.weightKg}kg×{lastBest.reps}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Mashqni ro'yxatdan olib tashlash"
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {sets.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {sets.map((set, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 bg-surface-container rounded-lg pl-2.5 pr-1.5 py-1 font-label-mono text-[12px] text-on-surface border border-outline/20"
            >
              <span className="text-primary-fixed-dim">{index + 1}.</span>
              {set.weightKg}kg × {set.reps}
              <button
                type="button"
                onClick={() => onRemoveSet(index)}
                aria-label="Podxodni o'chirish"
                className="text-on-surface-variant hover:text-error transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="px-3 pb-3 pt-1 flex items-center gap-2 flex-wrap">
        <Stepper value={weight} onChange={setWeight} step={WEIGHT_STEP} suffix="kg" ariaLabel="Og'irlik" />
        <span className="text-on-surface-variant font-label-mono shrink-0">×</span>
        <Stepper value={reps} onChange={setReps} step={REPS_STEP} suffix="takror" ariaLabel="Takror" />
        <button
          type="button"
          onClick={add}
          aria-label="Podxod qo'shish"
          className="shrink-0 h-11 px-3.5 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center hover:bg-primary-fixed transition-colors"
        >
          <span className="material-symbols-outlined text-[22px]">add</span>
        </button>
      </div>

      {sets.length > 0 && (
        <button
          type="button"
          onClick={repeatLast}
          className="w-full flex items-center justify-center gap-2 py-2 border-t border-white/10 text-on-surface-variant hover:text-primary hover:bg-white/5 transition-colors font-label-mono text-[11px] uppercase"
        >
          <span className="material-symbols-outlined text-[16px]">history</span>
          Oxirgi podxodni takrorlash
        </button>
      )}
    </div>
  );
}
