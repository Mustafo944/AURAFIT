"use client";

import { useState } from "react";
import Image from "next/image";
import { ExerciseDemo } from "@/components/workout/exercise-demo";
import { suggestNextLoad } from "@/lib/progression";
import { isNewRecord, type PersonalRecord } from "@/lib/personal-records";
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
  record,
  onLogSet,
  onRemoveSet,
  onRemove,
}: {
  exercise: Exercise;
  sets: SetEntry[];
  lastSets: SetEntry[] | null;
  record: PersonalRecord | undefined;
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
  // Mashg'ulot payti texnikani eslash uchun: rasm bosilsa animatsiyali demo ochiladi.
  const [demoOpen, setDemoOpen] = useState(false);

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

  // Double progression tavsiyasi — bosilganda stepperlarni o'zi to'ldiradi.
  const suggestion = suggestNextLoad(exercise, lastBest);
  const applySuggestion = () => {
    if (!suggestion) return;
    setWeight(String(suggestion.weightKg));
    setReps(String(suggestion.reps));
  };

  // Shu sessiyadagi eng yaxshi podxod tarixiy rekorddan oshgan bo'lsa,
  // faqat o'sha bitta chipni "yangi rekord" sifatida belgilaymiz.
  const sessionBestIndex = sets.reduce(
    (bestIdx, set, i) =>
      bestIdx === -1 ||
      set.weightKg > sets[bestIdx].weightKg ||
      (set.weightKg === sets[bestIdx].weightKg && set.reps > sets[bestIdx].reps)
        ? i
        : bestIdx,
    -1
  );
  const recordIndex = sessionBestIndex !== -1 && isNewRecord(record, sets[sessionBestIndex]) ? sessionBestIndex : -1;

  return (
    <div
      className={`glass-card item-enter rounded-xl overflow-hidden transition-colors ${
        sets.length > 0 ? "border-l-[3px] border-l-primary-fixed-dim" : ""
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={() => setDemoOpen((v) => !v)}
          aria-expanded={demoOpen}
          aria-label="Bajarilish texnikasini ko'rish"
          className={`relative w-12 h-12 shrink-0 rounded-lg overflow-hidden transition-all ${
            demoOpen ? "ring-2 ring-primary-fixed-dim" : "hover:ring-2 hover:ring-white/30"
          }`}
        >
          <Image src={exercise.image} alt={exercise.englishName} fill sizes="48px" className="object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span
              className="material-symbols-outlined text-white text-[18px] drop-shadow"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {demoOpen ? "close" : "play_arrow"}
            </span>
          </span>
        </button>
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
            {record && (
              <span className="text-tertiary-fixed-dim">
                {" "}
                · rekord: {record.weightKg}kg×{record.reps}
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

      {demoOpen && (
        <div className="px-3 pb-3 space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
          <ExerciseDemo exercise={exercise} />
          <ol className="space-y-1.5">
            {exercise.instructions.map((step, i) => (
              <li key={i} className="flex gap-2.5 font-body-md text-[13px] text-on-surface-variant">
                <span className="font-label-mono text-[11px] text-primary-fixed-dim shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {sets.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-1.5">
          {sets.map((set, index) => {
            const isRecordChip = index === recordIndex;
            return (
              <span
                key={index}
                className={`inline-flex items-center gap-1.5 rounded-lg pl-2.5 pr-1.5 py-1 font-label-mono text-[12px] border ${
                  isRecordChip
                    ? "pr-chip bg-primary-fixed-dim/15 text-primary-fixed border-primary-fixed-dim/60"
                    : "item-enter bg-surface-container text-on-surface border-outline/20"
                }`}
              >
                {isRecordChip ? (
                  <span
                    className="material-symbols-outlined text-[14px] text-primary-fixed-dim"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    military_tech
                  </span>
                ) : (
                  <span className="text-primary-fixed-dim">{index + 1}.</span>
                )}
                {set.weightKg}kg × {set.reps}
                {isRecordChip && <span className="text-[10px] uppercase text-primary-fixed-dim">Rekord!</span>}
                <button
                  type="button"
                  onClick={() => onRemoveSet(index)}
                  aria-label="Podxodni o'chirish"
                  className="text-on-surface-variant hover:text-error transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </span>
            );
          })}
        </div>
      )}

      {suggestion && (
        <div className="px-3 pb-1">
          <button
            type="button"
            onClick={applySuggestion}
            aria-label={`Tavsiyani qo'llash: ${suggestion.weightKg} kilogramm, ${suggestion.reps} takror`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-tertiary-fixed-dim/30 bg-tertiary-fixed-dim/[0.07] px-2.5 py-1.5 font-label-mono text-[11px] text-tertiary-fixed-dim hover:bg-tertiary-fixed-dim/15 transition-colors active:scale-[0.97]"
          >
            <span className="material-symbols-outlined text-[14px]">lightbulb</span>
            Tavsiya: {suggestion.weightKg}kg × {suggestion.reps}
            <span className="text-on-surface-variant">
              {suggestion.weightIncreased ? "(+2.5kg)" : "(+1 takror)"}
            </span>
          </button>
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
