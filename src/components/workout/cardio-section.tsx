"use client";

import { useState } from "react";
import {
  CARDIO_TYPES,
  cardioTypeInfo,
  computeCardioCalories,
  type CardioEntry,
  type CardioTypeId,
} from "@/lib/cardio";

function NumberField({
  label,
  value,
  onChange,
  suffix,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  step?: string;
}) {
  return (
    <div className="flex-1 min-w-0">
      <label className="font-label-mono text-[10px] text-on-surface-variant uppercase block mb-1">{label}</label>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 pr-12 text-on-surface font-headline-md text-[16px] focus:border-tertiary-fixed-dim/60 outline-none transition-colors"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-label-mono text-[10px] text-on-surface-variant uppercase">
          {suffix}
        </span>
      </div>
    </div>
  );
}

// Aerobik mashqlar bo'limi — foydalanuvchi turdan tanlaydi, ko'rsatkichlarni
// kiritadi, kaloriya vaznga tayanib FORMULA bilan darhol hisoblanadi. Yurish
// yo'lagida tezlik + qiyalik + vaqt (aniq ACSM hisobi), qolganlarida faqat vaqt.
export function CardioSection({
  weightKg,
  cardio,
  onAdd,
  onRemove,
}: {
  weightKg: number;
  cardio: CardioEntry[];
  onAdd: (entry: CardioEntry) => void;
  onRemove: (index: number) => void;
}) {
  const [typeId, setTypeId] = useState<CardioTypeId>("treadmill");
  const [duration, setDuration] = useState("");
  const [speed, setSpeed] = useState("");
  const [incline, setIncline] = useState("");

  const info = cardioTypeInfo(typeId);
  const isTreadmill = info.mode === "treadmill";

  const durationMin = Number(duration);
  const speedKmh = speed ? Number(speed) : undefined;
  const inclinePct = incline ? Number(incline) : undefined;
  const input = { durationMin, speedKmh, inclinePct };
  const preview = durationMin > 0 ? computeCardioCalories(typeId, input, weightKg) : 0;

  const selectType = (id: CardioTypeId) => {
    setTypeId(id);
    setSpeed("");
    setIncline("");
  };

  const add = () => {
    if (!(durationMin > 0)) return;
    onAdd({
      typeId,
      label: info.label,
      durationMin,
      speedKmh: isTreadmill ? speedKmh : undefined,
      inclinePct: isTreadmill ? inclinePct : undefined,
      caloriesBurned: computeCardioCalories(typeId, input, weightKg),
    });
    setDuration("");
    setSpeed("");
    setIncline("");
  };

  return (
    <section className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-tertiary-fixed-dim">directions_run</span>
        <h3 className="font-headline-md text-headline-md text-primary uppercase italic">Aerobik / Kardio</h3>
      </div>
      <p className="font-body-md text-[13px] text-on-surface-variant -mt-2">
        Kardio mashqlarini kiriting — kaloriya vazningizga tayanib avtomatik hisoblanadi.
      </p>

      {cardio.length > 0 && (
        <div className="space-y-1.5">
          {cardio.map((entry, index) => (
            <div
              key={index}
              className="flex items-center gap-3 bg-surface-container/60 rounded-lg px-3 py-2 border border-outline/20"
            >
              <span className="material-symbols-outlined text-tertiary-fixed-dim text-[18px]">directions_run</span>
              <div className="min-w-0 flex-1">
                <div className="font-body-md text-[14px] text-on-surface font-semibold truncate">{entry.label}</div>
                <div className="font-label-mono text-[11px] text-on-surface-variant">
                  {entry.durationMin} daqiqa
                  {entry.speedKmh ? ` · ${entry.speedKmh} km/s` : ""}
                  {entry.inclinePct ? ` · ${entry.inclinePct}% qiyalik` : ""}
                </div>
              </div>
              <span className="font-headline-md text-[16px] text-primary-fixed-dim shrink-0">
                {entry.caloriesBurned} kcal
              </span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label="O'chirish"
                className="shrink-0 text-on-surface-variant hover:text-error transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {CARDIO_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectType(t.id)}
            className={`px-3 py-1.5 rounded-lg font-label-mono text-[12px] uppercase border transition-colors ${
              typeId === t.id
                ? "bg-tertiary-fixed-dim/15 border-tertiary-fixed-dim/60 text-tertiary-fixed-dim"
                : "bg-white/[0.02] border-white/10 text-on-surface-variant hover:text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2">
        {isTreadmill && (
          <>
            <NumberField label="Tezlik" value={speed} onChange={setSpeed} suffix="km/s" step="0.1" />
            <NumberField label="Qiyalik" value={incline} onChange={setIncline} suffix="%" step="0.5" />
          </>
        )}
        <NumberField label="Davomiylik" value={duration} onChange={setDuration} suffix="daqiqa" />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-baseline gap-2">
          <span className="font-display-lg-mobile text-[28px] text-primary-fixed-dim font-bold">{preview}</span>
          <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">kcal (taxminiy)</span>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={!(durationMin > 0)}
          className="shrink-0 px-5 py-2.5 rounded-lg bg-tertiary-fixed-dim/15 text-tertiary-fixed-dim border border-tertiary-fixed-dim/40 font-headline-md text-[15px] uppercase italic hover:bg-tertiary-fixed-dim/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Qo&apos;shish
        </button>
      </div>
    </section>
  );
}
