"use client";

import { useMemo, useState } from "react";
import type { WorkoutSession } from "@/lib/workout-log";
import { MUSCLE_GROUPS } from "@/lib/exercises";

const UZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const UZ_WEEKDAYS_SHORT = ["DU", "SE", "CHO", "PA", "JU", "SH", "YA"];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// "yyyy-mm-dd" ni `new Date(string)` orqali emas, qo'lda mahalliy vaqt sifatida
// tiklaydi — aks holda UTC deb talqin qilinib, ba'zi vaqt zonalarida sana bir
// kunga siljib ketishi mumkin edi.
function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function muscleInfo(id: string) {
  return MUSCLE_GROUPS.find((g) => g.id === id);
}

export function WorkoutCalendar({ sessions }: { sessions: WorkoutSession[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const session of sessions) {
      const key = toDateKey(new Date(session.finishedAt));
      const existing = map.get(key);
      if (existing) existing.push(session);
      else map.set(key, [session]);
    }
    return map;
  }, [sessions]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7; // dushanba = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date());

  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const goPrevMonth = () => {
    setCursor(new Date(year, month - 1, 1));
    setSelectedKey(null);
  };
  const goNextMonth = () => {
    setCursor(new Date(year, month + 1, 1));
    setSelectedKey(null);
  };

  const selectedSessions = selectedKey ? (sessionsByDay.get(selectedKey) ?? []) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goPrevMonth}
          aria-label="Oldingi oy"
          className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        <span className="font-headline-md text-[16px] text-primary uppercase tracking-wide">
          {UZ_MONTHS[month]} {year}
        </span>
        <button
          onClick={goNextMonth}
          aria-label="Keyingi oy"
          className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {UZ_WEEKDAYS_SHORT.map((label) => (
          <div key={label} className="text-center font-label-mono text-[10px] text-on-surface-variant uppercase">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />;
          const key = toDateKey(date);
          const daySessions = sessionsByDay.get(key);
          const hasWorkout = !!daySessions && daySessions.length > 0;
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;

          return (
            <button
              key={key}
              type="button"
              disabled={!hasWorkout}
              onClick={() => setSelectedKey(isSelected ? null : key)}
              aria-pressed={isSelected}
              aria-label={hasWorkout ? `${date.getDate()} — mashg'ulot bor, batafsil ko'rish` : `${date.getDate()}`}
              className={`relative aspect-square rounded-lg flex items-center justify-center font-label-mono text-[12px] transition-colors ${
                hasWorkout
                  ? "bg-error/20 text-error hover:bg-error/35 cursor-pointer"
                  : "text-on-surface-variant/70 cursor-default"
              } ${isSelected ? "ring-2 ring-error" : ""} ${isToday ? "outline outline-1 outline-primary-fixed-dim" : ""}`}
            >
              {date.getDate()}
              {hasWorkout && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-error" />}
            </button>
          );
        })}
      </div>

      {selectedKey && selectedSessions.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/10 space-y-4">
          <div className="font-label-mono text-label-mono text-error uppercase">
            {(() => {
              const d = fromDateKey(selectedKey);
              return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
            })()}
          </div>

          {selectedSessions.map((session) => (
            <div key={session.id} className="space-y-3">
              {session.exercises.map((exercise) => {
                const info = muscleInfo(exercise.muscleGroup);
                return (
                  <div key={exercise.exerciseId} className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-tertiary-fixed-dim text-[16px]">
                        {info?.icon ?? "fitness_center"}
                      </span>
                      <span className="font-body-md text-[14px] text-on-surface font-bold">{exercise.exerciseName}</span>
                      <span className="font-label-mono text-[10px] text-on-surface-variant uppercase ml-auto">
                        {info?.label ?? exercise.muscleGroup}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {exercise.sets.map((set, i) => (
                        <div key={i} className="font-body-md text-[13px] text-on-surface-variant">
                          {i + 1}-podxod: <span className="text-primary font-bold">{set.weightKg} kg</span> &times; {set.reps}{" "}
                          takror
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-label-mono text-[11px] text-on-surface-variant uppercase">
                <span>
                  Jami Hajm: <span className="text-primary-fixed-dim">{Math.round(session.totalVolumeKg)} kg</span>
                </span>
                <span>
                  Setlar: <span className="text-primary-fixed-dim">{session.totalSets}</span>
                </span>
                <span>
                  Kaloriya: <span className="text-primary-fixed-dim">{session.caloriesBurned}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
