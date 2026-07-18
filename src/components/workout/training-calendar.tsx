"use client";

import { useMemo, useState } from "react";
import type { WorkoutSession } from "@/lib/workout-log";

const UZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const UZ_MONTHS_SHORT = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
const UZ_WEEKDAYS_SHORT = ["DU", "SE", "CHO", "PA", "JU", "SH", "YA"];

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

// Berilgan kun 7 kunlik chiziqning o'rtasida (4-katak) turishi uchun chiziq
// boshini qaytaradi — kunni 3 kun oldinga suradi.
function centeredWindowStart(d: Date): Date {
  return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -3);
}

// Yillik ko'rinishdagi bitta oy uchun kataklar (dushanbadan boshlab).
function monthCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const leading = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1)),
  ];
}

// Kalendar — boshqariladigan komponent: tanlangan kun (selectedKey) yuqoridan
// keladi, kun bosilganda onSelect chaqiriladi. Ikki ko'rinish: standart "kunlik"
// (haftalik chiziq) va calendar_month ikonkasi bilan ochiladigan "yillik".
export function TrainingCalendar({
  sessions,
  selectedKey,
  onSelect,
}: {
  sessions: WorkoutSession[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const [mode, setMode] = useState<"day" | "year">("day");
  const [weekStart, setWeekStart] = useState(() => centeredWindowStart(new Date()));
  const [year, setYear] = useState(() => new Date().getFullYear());

  const workoutDays = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) set.add(toDateKey(new Date(s.finishedAt)));
    return set;
  }, [sessions]);

  const todayKey = toDateKey(new Date());

  const dayCellClass = (key: string) => {
    const hasWorkout = workoutDays.has(key);
    const isSelected = key === selectedKey;
    const isToday = key === todayKey;
    return [
      "relative flex flex-col items-center justify-center rounded-xl transition-colors",
      hasWorkout ? "bg-primary-fixed-dim/15 text-primary" : "text-on-surface-variant hover:bg-white/5",
      isSelected ? "ring-2 ring-primary-fixed-dim" : "",
      isToday && !isSelected ? "outline outline-1 outline-primary-fixed-dim/60" : "",
    ].join(" ");
  };

  return (
    <div className="glass-card rounded-xl p-5 border-l-[4px] border-l-primary-fixed-dim">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode(mode === "day" ? "year" : "day")}
            aria-label={mode === "day" ? "Yillik ko'rinish" : "Kunlik ko'rinish"}
            aria-pressed={mode === "year"}
            className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors ${
              mode === "year"
                ? "bg-primary-fixed-dim/15 border-primary-fixed-dim/60 text-primary-fixed-dim"
                : "bg-white/5 border-white/10 text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          </button>
          <h3 className="font-headline-md text-headline-md text-primary uppercase italic">
            {mode === "day" ? "Kalendar" : year}
          </h3>
        </div>

        {mode === "day" ? (
          <div className="flex items-center gap-1.5">
            <span className="font-label-mono text-[11px] text-on-surface-variant uppercase mr-1">
              {UZ_MONTHS_SHORT[weekStart.getMonth()]}
            </span>
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              aria-label="Oldingi hafta"
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              aria-label="Keyingi hafta"
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              aria-label="Oldingi yil"
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              aria-label="Keyingi yil"
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        )}
      </div>

      {mode === "day" ? (
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }, (_, i) => {
            const date = addDays(weekStart, i);
            const key = toDateKey(date);
            const hasWorkout = workoutDays.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                aria-pressed={key === selectedKey}
                aria-label={`${date.getDate()}-${UZ_MONTHS[date.getMonth()]}${hasWorkout ? ", mashg'ulot bor" : ""}`}
                className={`${dayCellClass(key)} h-16`}
              >
                <span className="font-label-mono text-[9px] uppercase opacity-70">
                  {UZ_WEEKDAYS_SHORT[(date.getDay() + 6) % 7]}
                </span>
                <span className="font-headline-md text-[18px] leading-none mt-0.5">{date.getDate()}</span>
                {hasWorkout && <span className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-primary-fixed-dim" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, month) => (
            <div key={month}>
              <div className="font-label-mono text-[11px] text-on-surface-variant uppercase mb-1.5">
                {UZ_MONTHS[month]}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {monthCells(year, month).map((date, i) => {
                  if (!date) return <div key={`b-${i}`} className="aspect-square" />;
                  const key = toDateKey(date);
                  const hasWorkout = workoutDays.has(key);
                  const isSelected = key === selectedKey;
                  const isToday = key === todayKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onSelect(key);
                        setWeekStart(centeredWindowStart(date));
                        setMode("day");
                      }}
                      aria-label={`${date.getDate()}-${UZ_MONTHS[month]}${hasWorkout ? ", mashg'ulot bor" : ""}`}
                      className={`aspect-square rounded flex items-center justify-center font-label-mono text-[10px] transition-colors ${
                        hasWorkout
                          ? "bg-primary-fixed-dim/25 text-primary font-bold"
                          : "text-on-surface-variant/60 hover:bg-white/5"
                      } ${isSelected ? "ring-1 ring-primary-fixed-dim" : ""} ${
                        isToday && !isSelected ? "outline outline-1 outline-primary-fixed-dim/50" : ""
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
