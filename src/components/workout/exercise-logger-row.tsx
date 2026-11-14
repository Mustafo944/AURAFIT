"use client";

import { useState } from "react";
import { ExerciseImage } from "@/components/workout/exercise-image";
import { ExerciseDemo } from "@/components/workout/exercise-demo";
import { suggestNextLoad } from "@/lib/progression";
import { isNewRecord, type PersonalRecord } from "@/lib/personal-records";
import type { Exercise } from "@/lib/exercise-metadata";
import type { SetEntry } from "@/lib/workout-log";
import {
  adjustValue,
  defaultDraft,
  draftToSet,
  formatSetShort,
  parseTargetSets,
  type SetDraft,
} from "@/lib/workout-rows";
import { unlockRestAudio } from "@/lib/rest-alert";

const WEIGHT_STEP = 2.5; // eng keng tarqalgan disk qadami

const inputClass =
  "w-full h-11 min-w-0 rounded-lg bg-black border text-center font-headline-md text-[17px] text-on-surface outline-none focus:border-primary-container tabular-nums";

// Mashq kartasi: yopiq holatda bitta qator (xulosa), ochiq holatda podxod
// jadvali — # | OLDINGI | KG | TAKROR | ✓. Qiymatlar o'tgan mashg'ulotdan
// oldindan to'ldirilgan: o'zgarmagan bo'lsa, faqat ✓ bosiladi.
export function ExerciseLoggerRow({
  exercise,
  sets,
  lastSets,
  record,
  open,
  onToggle,
  onLogSet,
  onRemoveSet,
  onRemove,
}: {
  exercise: Exercise;
  sets: SetEntry[];
  lastSets: SetEntry[] | null;
  record: PersonalRecord | undefined;
  open: boolean;
  onToggle: () => void;
  onLogSet: (set: SetEntry) => void;
  onRemoveSet: (index: number) => void;
  onRemove: () => void;
}) {
  const bodyweight = exercise.equipment === "bodyweight";
  const target = parseTargetSets(exercise.sets);
  const [extra, setExtra] = useState(0);
  const [drafts, setDrafts] = useState<Record<number, SetDraft>>({});
  const [invalidRow, setInvalidRow] = useState<number | null>(null);
  const [demoOpen, setDemoOpen] = useState(false);

  const pendingCount = Math.max(0, target + extra - sets.length);
  const draftAt = (index: number): SetDraft =>
    drafts[index] ?? defaultDraft(index, sets, lastSets, bodyweight);
  const patchDraft = (index: number, patch: Partial<SetDraft>) => {
    setInvalidRow(null);
    setDrafts((current) => ({ ...current, [index]: { ...draftAt(index), ...patch } }));
  };

  const lastBest =
    lastSets && lastSets.length > 0
      ? lastSets.reduce((best, s) => (s.weightKg > best.weightKg ? s : best))
      : null;

  const logRow = (index: number) => {
    const set = draftToSet(draftAt(index), bodyweight);
    if (!set) {
      setInvalidRow(index);
      return;
    }
    unlockRestAudio();
    onLogSet(set);
  };

  // Bajarilgan qatorni qayta bosish — bekor qilish: qiymatlari qatorda qoladi,
  // foydalanuvchi to'g'rilab qaytadan ✓ bosadi.
  const undoRow = (index: number) => {
    const set = sets[index];
    if (!set) return;
    setDrafts((current) => ({ ...current, [index]: { weight: String(set.weightKg), reps: String(set.reps) } }));
    onRemoveSet(index);
  };

  const suggestion = suggestNextLoad(exercise, lastSets);
  const applySuggestion = () => {
    if (!suggestion) return;
    setInvalidRow(null);
    setDrafts((current) => {
      const next = { ...current };
      for (let i = sets.length; i < sets.length + pendingCount; i++)
        next[i] = { weight: String(suggestion.weightKg), reps: String(suggestion.reps) };
      return next;
    });
  };

  const sessionBestIndex = sets.reduce(
    (bestIdx, set, i) =>
      bestIdx === -1 ||
      set.weightKg > sets[bestIdx].weightKg ||
      (set.weightKg === sets[bestIdx].weightKg && set.reps > sets[bestIdx].reps)
        ? i
        : bestIdx,
    -1,
  );
  const recordIndex =
    sessionBestIndex !== -1 && isNewRecord(record, sets[sessionBestIndex]) ? sessionBestIndex : -1;

  const complete = sets.length >= target;
  const lastLogged = sets[sets.length - 1];

  // ---------- Yopiq holat: bitta qator ----------
  if (!open) {
    return (
      <div
        className={`glass-card item-enter rounded-xl overflow-hidden ${
          complete ? "border-l-[3px] border-l-primary-fixed-dim" : ""
        }`}
      >
        <button type="button" onClick={onToggle} aria-expanded={false} className="w-full flex items-center gap-3 p-3 text-left">
          <span
            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center border ${
              complete
                ? "bg-primary-fixed-dim/20 border-primary-fixed-dim/60 text-primary-fixed-dim"
                : "bg-white/5 border-white/10 text-on-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{complete ? "check" : "fitness_center"}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-white leading-snug truncate">{exercise.name}</span>
            <span className="block font-label-mono text-[11px] text-on-surface-variant">
              {sets.length}/{target} podxod
              {lastLogged ? ` · oxirgi ${formatSetShort(lastLogged)}` : ` · maqsad ${exercise.sets} × ${exercise.reps}`}
            </span>
          </span>
          <span className="material-symbols-outlined text-on-surface-variant text-[22px]">expand_more</span>
        </button>
      </div>
    );
  }

  // ---------- Ochiq holat: jadval ----------
  const rows = Array.from({ length: Math.max(sets.length + pendingCount, sets.length) }, (_, i) => i);
  const firstPending = sets.length;

  return (
    <div className="glass-card item-enter rounded-xl overflow-hidden border-l-[3px] border-l-primary-fixed-dim">
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={() => setDemoOpen((v) => !v)}
          aria-expanded={demoOpen}
          aria-label="Bajarilish texnikasini ko'rish"
          className={`relative w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-[#f5f5f1] transition-all ${
            demoOpen ? "ring-2 ring-primary-fixed-dim" : "hover:ring-2 hover:ring-white/30"
          }`}
        >
          <ExerciseImage exercise={exercise} sizes="64px" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="material-symbols-outlined text-white text-[18px] drop-shadow" style={{ fontVariationSettings: "'FILL' 1" }}>
              {demoOpen ? "close" : "play_arrow"}
            </span>
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onToggle} aria-expanded className="block w-full text-left">
            <span className="block text-[16px] font-semibold text-white leading-snug">{exercise.name}</span>
          </button>
          <div className="font-label-mono text-[11px] text-on-surface-variant">
            Maqsad: {exercise.sets} × {exercise.reps}
            {record && (
              <span className="text-tertiary-fixed-dim">
                {" "}
                · rekord: {record.weightKg}kg×{record.reps}
              </span>
            )}
          </div>
          {lastBest && (
            <div className="font-label-mono text-[11px] text-primary-fixed-dim">
              oxirgi marta: {formatSetShort(lastBest)}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (sets.length === 0 || window.confirm("Mashq va uning podxodlari o'chiriladi. Davom etasizmi?")) onRemove();
          }}
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
                <span className="font-label-mono text-[11px] text-primary-fixed-dim shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {suggestion && pendingCount > 0 && (
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={applySuggestion}
            aria-label={`Tavsiyani qo'llash: ${suggestion.weightKg} kilogramm, ${suggestion.reps} takror`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-tertiary-fixed-dim/30 bg-tertiary-fixed-dim/[0.07] px-2.5 py-1.5 font-label-mono text-[11px] text-tertiary-fixed-dim hover:bg-tertiary-fixed-dim/15 transition-colors active:scale-[0.97]"
          >
            <span className="material-symbols-outlined text-[14px]">lightbulb</span>
            Tavsiya: {suggestion.weightKg}kg × {suggestion.reps}
            <span className="text-on-surface-variant">{suggestion.weightIncreased ? "(+2.5kg)" : "(shu og'irlikda)"}</span>
          </button>
          <p className="text-[11px] text-on-surface-variant mt-1.5">{suggestion.reason}</p>
        </div>
      )}

      <div className="px-3 pb-3">
        <div className="grid grid-cols-[1.75rem_4.25rem_1fr_1fr_2.75rem] gap-1.5 px-0.5 pb-1 font-label-mono text-[9px] uppercase tracking-wider text-on-surface-variant">
          <span className="text-center">#</span>
          <span className="text-center">Oldingi</span>
          <span className="text-center">Kg</span>
          <span className="text-center">Takror</span>
          <span />
        </div>
        <div className="space-y-1.5">
          {rows.map((index) => {
            const logged = sets[index];
            const isActive = !logged && index === firstPending;
            const draft = logged ? { weight: String(logged.weightKg), reps: String(logged.reps) } : draftAt(index);
            const isRecord = index === recordIndex;
            const invalid = invalidRow === index;
            return (
              <div key={index} className="space-y-1">
                <div
                  className={`grid grid-cols-[1.75rem_4.25rem_1fr_1fr_2.75rem] gap-1.5 items-center rounded-xl p-0.5 transition-colors ${
                    logged ? "bg-primary-fixed-dim/10" : isActive ? "bg-white/[0.04]" : "opacity-60"
                  }`}
                >
                  <span
                    className={`text-center font-label-mono text-[12px] ${isRecord ? "text-primary-fixed-dim" : "text-on-surface-variant"}`}
                  >
                    {isRecord ? (
                      <span className="material-symbols-outlined text-[16px] text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>
                        military_tech
                      </span>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className="text-center font-label-mono text-[11px] text-on-surface-variant truncate">
                    {formatSetShort(lastSets?.[index])}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={draft.weight}
                    readOnly={!!logged}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => patchDraft(index, { weight: e.target.value })}
                    aria-label={`${index + 1}-podxod og'irligi, kilogramm`}
                    className={`${inputClass} ${logged ? "border-transparent text-primary" : invalid ? "border-error" : "border-white/10"}`}
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={draft.reps}
                    readOnly={!!logged}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => patchDraft(index, { reps: e.target.value })}
                    aria-label={`${index + 1}-podxod takrori`}
                    className={`${inputClass} ${logged ? "border-transparent text-primary" : invalid ? "border-error" : "border-white/10"}`}
                  />
                  {logged ? (
                    <button
                      type="button"
                      onClick={() => undoRow(index)}
                      aria-label={`${index + 1}-podxodni bekor qilish`}
                      className="h-11 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[22px]">check</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!isActive}
                      onClick={() => logRow(index)}
                      aria-label={`${index + 1}-podxodni saqlash`}
                      className="h-11 rounded-lg border border-primary-container/60 text-primary-fixed-dim flex items-center justify-center hover:bg-primary-container/15 disabled:opacity-30 disabled:border-white/10 disabled:text-on-surface-variant active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[22px]">check</span>
                    </button>
                  )}
                </div>
                {isActive && (
                  <div className="flex items-center justify-end gap-1.5 pr-0.5">
                    {[
                      { label: `−${WEIGHT_STEP}`, field: "weight" as const, delta: -WEIGHT_STEP },
                      { label: `+${WEIGHT_STEP}`, field: "weight" as const, delta: WEIGHT_STEP },
                      { label: "−1", field: "reps" as const, delta: -1 },
                      { label: "+1", field: "reps" as const, delta: 1 },
                    ].map((chip) => (
                      <button
                        key={`${chip.field}${chip.label}`}
                        type="button"
                        onClick={() => patchDraft(index, { [chip.field]: adjustValue(draft[chip.field], chip.delta) })}
                        aria-label={`${chip.field === "weight" ? "Og'irlik" : "Takror"} ${chip.label}`}
                        className={`h-8 min-w-[3rem] px-2 rounded-lg border font-label-mono text-[12px] active:scale-95 ${
                          chip.field === "weight"
                            ? "border-primary-fixed-dim/30 text-primary-fixed-dim"
                            : "border-tertiary-fixed-dim/30 text-tertiary-fixed-dim"
                        }`}
                      >
                        {chip.label}
                        <span className="opacity-60 ml-0.5 text-[10px]">{chip.field === "weight" ? "kg" : ""}</span>
                      </button>
                    ))}
                  </div>
                )}
                {invalid && (
                  <p role="alert" className="text-error text-[11px] text-right pr-1">
                    {bodyweight ? "Takrorni kiriting." : "Og'irlik va takrorni kiriting."}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setExtra((n) => n + 1)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-white/15 text-on-surface-variant hover:text-primary hover:border-primary/40 font-label-mono text-[11px] uppercase transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Podxod qo&apos;shish
        </button>
      </div>
    </div>
  );
}
