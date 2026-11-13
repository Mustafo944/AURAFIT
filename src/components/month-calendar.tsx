"use client";

import { UZ_MONTHS, dayKey } from "@/lib/date-key";

const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

function monthCells(year: number, month: number): (Date | null)[] {
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1)),
  ];
}

// Oylik kalendar — Dieta va Mashg'ulot tarixlari uchun umumiy. Qayd bor kunlar
// belgilanadi; kelajakdagi kunlar va oylar tanlanmaydi.
export function MonthCalendar({
  year,
  month,
  onMonthChange,
  selectedKey,
  onSelect,
  markedDays,
  markedLabel,
  loading = false,
}: {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  selectedKey: string;
  onSelect: (key: string) => void;
  markedDays: Set<string>;
  markedLabel: string;
  loading?: boolean;
}) {
  const today = new Date();
  const todayKey = dayKey(today);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    onMonthChange(d.getFullYear(), d.getMonth());
  };
  const navClass =
    "w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-on-surface-variant disabled:opacity-30";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} aria-label="Oldingi oy" className={navClass}>
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        <span className="font-label-mono text-label-mono text-on-surface uppercase tracking-wider">
          {UZ_MONTHS[month]} {year}
        </span>
        <button type="button" onClick={() => shift(1)} disabled={isCurrentMonth} aria-label="Keyingi oy" className={navClass}>
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>
      <div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center font-label-mono text-[10px] text-on-surface-variant/70 uppercase">
              {w}
            </div>
          ))}
        </div>
        <div className={`grid grid-cols-7 gap-1 transition-opacity ${loading ? "opacity-50" : ""}`}>
          {monthCells(year, month).map((date, i) => {
            if (!date) return <div key={`b-${i}`} />;
            const key = dayKey(date);
            const marked = markedDays.has(key);
            const isSelected = key === selectedKey;
            return (
              <button
                key={key}
                type="button"
                disabled={key > todayKey}
                onClick={() => onSelect(key)}
                aria-pressed={isSelected}
                aria-label={`${date.getDate()}-${UZ_MONTHS[month].toLowerCase()}${marked ? `, ${markedLabel}` : ""}`}
                className={`relative aspect-square rounded-lg flex items-center justify-center font-label-mono text-[13px] transition-colors disabled:opacity-25 ${
                  marked ? "bg-primary-fixed-dim/15 text-primary font-bold" : "text-on-surface-variant hover:bg-white/5"
                } ${isSelected ? "ring-2 ring-primary-fixed-dim" : ""} ${
                  key === todayKey && !isSelected ? "outline outline-1 outline-primary-fixed-dim/60" : ""
                }`}
              >
                {date.getDate()}
                {marked && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary-fixed-dim" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
