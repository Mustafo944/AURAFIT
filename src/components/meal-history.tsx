"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { sumMeals, type MealEntry } from "@/lib/meal-log";
import { MEAL_TYPE_LABELS, dayKey, fetchMealsForMonth, groupMealsByDay } from "@/lib/meal-history";

const UZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];
const WEEKDAYS = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

function monthCells(year: number, month: number): (Date | null)[] {
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: days }, (_, i) => new Date(year, month, i + 1)),
  ];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Profil: har kuni yeyilgan taomlar tarixi. Kalendardan kun tanlanadi — o'sha
// kundagi taomlar (vaqti, turi, kaloriya va BJU) va kunlik jami ko'rsatiladi.
// Faqat matnli ma'lumot saqlanadi va ko'rsatiladi, rasm saqlanmaydi.
export function MealHistory() {
  const { userId } = useAuth();
  const today = new Date();
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(() => dayKey(today));
  const [reload, setReload] = useState(0);
  // Natija qaysi oy (va qayta urinish) uchun yuklanganini kalit bilan belgilaymiz:
  // kalit mos kelmasa — yangi oy hali yuklanmoqda.
  const fetchKey = `${userId}:${view.year}-${view.month}:${reload}`;
  const [state, setState] = useState<{ key: string; meals: MealEntry[]; error: string | null }>({
    key: "",
    meals: [],
    error: null,
  });
  const loading = state.key !== fetchKey;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchMealsForMonth(userId, view.year, view.month)
      .then((meals) => {
        if (!cancelled) setState({ key: fetchKey, meals, error: null });
      })
      .catch(() => {
        if (!cancelled)
          setState({ key: fetchKey, meals: [], error: "Tarixni yuklab bo'lmadi. Internetni tekshiring." });
      });
    return () => {
      cancelled = true;
    };
  }, [userId, view.year, view.month, fetchKey]);

  const byDay = useMemo(() => groupMealsByDay(loading ? [] : state.meals), [loading, state.meals]);
  const dayMeals = byDay.get(selected) ?? [];
  const totals = sumMeals(dayMeals);
  const todayKey = dayKey(today);
  const isCurrentMonth = view.year === today.getFullYear() && view.month === today.getMonth();
  const [sy, sm, sd] = selected.split("-").map(Number);

  const shiftMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <section className="glass-card rounded-xl p-6 space-y-5" aria-label="Ovqatlanish tarixi">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-fixed-dim">restaurant_menu</span>
          <h3 className="font-headline-md text-headline-md text-primary uppercase">Ovqatlanish tarixi</h3>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Oldingi oy"
          className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-[18px]">chevron_left</span>
        </button>
        <span className="font-label-mono text-label-mono text-on-surface uppercase tracking-wider">
          {UZ_MONTHS[view.month]} {view.year}
        </span>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          disabled={isCurrentMonth}
          aria-label="Keyingi oy"
          className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-on-surface-variant disabled:opacity-30"
        >
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
          {monthCells(view.year, view.month).map((date, i) => {
            if (!date) return <div key={`b-${i}`} />;
            const key = dayKey(date);
            const hasMeals = byDay.has(key);
            const isSelected = key === selected;
            const isFuture = key > todayKey;
            return (
              <button
                key={key}
                type="button"
                disabled={isFuture}
                onClick={() => setSelected(key)}
                aria-pressed={isSelected}
                aria-label={`${date.getDate()}-${UZ_MONTHS[date.getMonth()].toLowerCase()}${hasMeals ? ", ovqat qayd etilgan" : ""}`}
                className={`relative aspect-square rounded-lg flex items-center justify-center font-label-mono text-[13px] transition-colors disabled:opacity-25 ${
                  hasMeals ? "bg-primary-fixed-dim/15 text-primary font-bold" : "text-on-surface-variant hover:bg-white/5"
                } ${isSelected ? "ring-2 ring-primary-fixed-dim" : ""} ${
                  key === todayKey && !isSelected ? "outline outline-1 outline-primary-fixed-dim/60" : ""
                }`}
              >
                {date.getDate()}
                {hasMeals && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary-fixed-dim" />}
              </button>
            );
          })}
        </div>
      </div>

      {!loading && state.error ? (
        <div className="space-y-2">
          <p className="text-error text-sm">{state.error}</p>
          <button type="button" onClick={() => setReload((n) => n + 1)} className="text-primary text-sm underline">
            Qayta urinish
          </button>
        </div>
      ) : (
        <div className="border-t border-white/10 pt-5 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="font-headline-md text-[20px] text-primary">
                {sd}-{UZ_MONTHS[sm - 1].toLowerCase()}, {sy}
              </div>
              <div className="font-label-mono text-[11px] text-on-surface-variant uppercase mt-0.5">
                {dayMeals.length > 0 ? `${dayMeals.length} ta taom` : "Taom yo'q"}
              </div>
            </div>
            {dayMeals.length > 0 && (
              <div className="text-right">
                <div className="font-headline-md text-[26px] text-primary-fixed-dim font-bold leading-none">
                  {totals.calories}
                </div>
                <div className="font-label-mono text-[10px] text-on-surface-variant uppercase mt-1">jami kcal</div>
              </div>
            )}
          </div>

          {dayMeals.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Oqsil", value: totals.proteinG, color: "text-primary-fixed-dim" },
                { label: "Yog'", value: totals.fatG, color: "text-error" },
                { label: "Uglevod", value: totals.carbG, color: "text-tertiary-fixed-dim" },
              ].map((m) => (
                <div key={m.label} className="rounded-lg bg-white/5 border border-white/10 py-2 text-center">
                  <div className={`font-headline-md text-[18px] font-bold ${m.color}`}>{m.value}g</div>
                  <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">{m.label}</div>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <p role="status" className="text-sm text-on-surface-variant">
              Yuklanmoqda...
            </p>
          ) : dayMeals.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Bu kunda ovqat qayd etilmagan.</p>
          ) : (
            <ul className="space-y-2">
              {dayMeals.map((meal) => (
                <li key={meal.id} className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">
                        {formatTime(meal.timestamp)} · {MEAL_TYPE_LABELS[meal.mealType]}
                      </div>
                      <div className="font-body-md text-[15px] text-on-surface font-semibold mt-0.5 break-words">
                        {meal.mealName}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-headline-md text-[18px] text-primary font-bold">{meal.calories}</div>
                      <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">kcal</div>
                    </div>
                  </div>
                  {meal.items.length > 0 && (
                    <p className="text-[12px] text-on-surface-variant mt-1.5">{meal.items.join(", ")}</p>
                  )}
                  <div className="font-label-mono text-[11px] text-on-surface-variant mt-1.5">
                    O {meal.proteinG}g · Y {meal.fatG}g · U {meal.carbG}g
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
