"use client";

import { useEffect, useState } from "react";
import {
  CARDIO_TYPES,
  cardioTypeInfo,
  cardioSessionInsight,
  computeCardioCalories,
  type CardioEntry,
  type CardioTypeId,
} from "@/lib/cardio";

function formatStopwatch(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  step,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  step?: string;
  disabled?: boolean;
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
          disabled={disabled}
          placeholder="0"
          className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 pr-12 text-on-surface font-headline-md text-[16px] focus:border-tertiary-fixed-dim/60 outline-none transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-label-mono text-[10px] text-on-surface-variant uppercase">
          {suffix}
        </span>
      </div>
    </div>
  );
}

// Aerobik mashqlar bo'limi — foydalanuvchi turdan tanlaydi, ko'rsatkichlarni
// kiritadi, kaloriya vaznga tayanib FORMULA bilan darhol hisoblanadi. Yugurish
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
  // Yugurish yo'lagi ekranida kaloriya deyarli har doim to'g'ridan-to'g'ri
  // ko'rsatiladi — foydalanuvchi shu raqamni qo'lda kiritsa, taxminiy MET
  // formulasi o'rniga aynan shu qiymat saqlanadi (mashinaning o'zi hisoblagani
  // ko'pincha yurak urishi kabi qo'shimcha ma'lumotni ham hisobga oladi).
  const [manualCalories, setManualCalories] = useState("");
  // Yugurish yo'lagidan boshqa barcha turlarda (velotrenajyor, eshkak,
  // elliptik, arg'amchi) davomiylik qo'lda raqam kiritish o'rniga play/pauza
  // taymer bilan o'lchanadi — mashq paytida vaqtni taxmin qilish shart emas.
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);

  const info = cardioTypeInfo(typeId);
  const isTreadmill = info.mode === "treadmill";

  useEffect(() => {
    if (!stopwatchRunning) return;
    const id = setInterval(() => setStopwatchSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [stopwatchRunning]);

  // Qo'lda kiritilgan qiymat har doim ustuvor — bo'sh bo'lsa (faqat yugurish
  // yo'lagidan boshqa turlarda) taymerdan hisoblanadi.
  const durationMin = duration ? Number(duration) : isTreadmill ? 0 : Math.round((stopwatchSeconds / 60) * 10) / 10;
  const speedKmh = speed ? Number(speed) : undefined;
  const inclinePct = incline ? Number(incline) : undefined;
  const input = { durationMin, speedKmh, inclinePct };
  const manualKcal = manualCalories ? Number(manualCalories) : undefined;
  const computedKcal = durationMin > 0 ? computeCardioCalories(typeId, input, weightKg) : 0;
  const preview = manualKcal && manualKcal > 0 ? manualKcal : computedKcal;

  const resetStopwatch = () => {
    setStopwatchRunning(false);
    setStopwatchSeconds(0);
  };

  const selectType = (id: CardioTypeId) => {
    setTypeId(id);
    setSpeed("");
    setIncline("");
    setManualCalories("");
    setDuration("");
    resetStopwatch();
  };

  const add = () => {
    if (!(durationMin > 0)) return;
    onAdd({
      typeId,
      label: info.label,
      durationMin,
      speedKmh: isTreadmill ? speedKmh : undefined,
      inclinePct: isTreadmill ? inclinePct : undefined,
      caloriesBurned: manualKcal && manualKcal > 0 ? manualKcal : computeCardioCalories(typeId, input, weightKg),
    });
    setDuration("");
    setSpeed("");
    setIncline("");
    setManualCalories("");
    resetStopwatch();
  };

  const insight = cardio.length > 0 ? cardioSessionInsight(cardio) : null;

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

      {isTreadmill ? (
        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <NumberField label="Tezlik" value={speed} onChange={setSpeed} suffix="km/s" step="0.1" />
            <NumberField label="Qiyalik" value={incline} onChange={setIncline} suffix="%" step="0.5" />
          </div>
          <div className="flex items-end gap-2">
            <NumberField label="Davomiylik" value={duration} onChange={setDuration} suffix="daqiqa" />
            <NumberField label="Yoqilgan Kaloriya" value={manualCalories} onChange={setManualCalories} suffix="kcal" />
          </div>
          <p className="font-body-md text-[11px] text-on-surface-variant">
            Yugurish yo&apos;lagi ekranida kaloriya ko&apos;rsatilsa, o&apos;sha raqamni shu yerga kiriting — taxminiy
            formula o&apos;rniga aynan shu qiymat saqlanadi.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-end gap-2">
            <NumberField
              label="Davomiylik"
              value={duration}
              onChange={setDuration}
              suffix="daqiqa"
              disabled={stopwatchRunning}
            />
            <button
              type="button"
              onClick={() => setStopwatchRunning((r) => !r)}
              disabled={!!duration}
              aria-label={stopwatchRunning ? "Pauza" : "Taymerni Boshlash"}
              className={`shrink-0 h-[46px] w-[46px] rounded-lg flex items-center justify-center border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                stopwatchRunning
                  ? "bg-error/15 text-error border-error/40"
                  : "bg-tertiary-fixed-dim/15 text-tertiary-fixed-dim border-tertiary-fixed-dim/40"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{stopwatchRunning ? "pause" : "play_arrow"}</span>
            </button>
          </div>
          {(stopwatchRunning || stopwatchSeconds > 0) && !duration && (
            <p className="font-label-mono text-[11px] text-tertiary-fixed-dim">
              Taymer: {formatStopwatch(stopwatchSeconds)} {stopwatchRunning ? "· ishlamoqda" : "· pauzada"}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-baseline gap-2">
          <span className="font-display-lg-mobile text-[28px] text-primary-fixed-dim font-bold">{preview}</span>
          <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">
            kcal {manualKcal && manualKcal > 0 ? "(kiritilgan)" : "(taxminiy)"}
          </span>
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

      {insight && (
        <div className="border-t border-white/10 pt-4 space-y-3">
          <div className="flex items-center gap-4">
            <div>
              <div className="font-headline-md text-[20px] text-primary font-bold">{insight.totalMinutes}</div>
              <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">Jami Daqiqa</div>
            </div>
            <div>
              <div className="font-headline-md text-[20px] text-primary-fixed-dim font-bold">{insight.totalKcal}</div>
              <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">Jami Kcal</div>
            </div>
          </div>
          <ul className="space-y-2">
            {insight.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 font-body-md text-[13px] text-on-surface-variant">
                <span className="shrink-0 font-label-mono text-[9px] text-tertiary-fixed-dim border border-tertiary-fixed-dim/40 bg-tertiary-fixed-dim/10 px-1.5 py-0.5 rounded uppercase mt-0.5">
                  Maslahat
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
