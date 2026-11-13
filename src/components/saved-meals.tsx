"use client";
import { useState } from "react";
import { useSavedMeals } from "@/lib/saved-items";
import type { MealEntry, MealType } from "@/lib/meal-log";
export function SavedMeals({
  meals,
  onAdd,
}: {
  meals: MealEntry[];
  onAdd: (meal: Omit<MealEntry, "id" | "timestamp">) => Promise<void>;
}) {
  const { items, save, loading } = useSavedMeals();
  const [mealType, setMealType] = useState<MealType>("snack");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage("Saqlandi.");
    } catch {
      setMessage("Saqlab bo'lmadi. Qayta urinib ko'ring.");
    } finally {
      setBusy(false);
    }
  };
  const remember = (entry: MealEntry) => {
    const { mealName, calories, proteinG, fatG, carbG, items: ingredients } = entry;
    return save([
      ...items,
      {
        id: crypto.randomUUID(),
        meal: { mealName, mealType: entry.mealType, calories, proteinG, fatG, carbG, items: ingredients },
      },
    ]);
  };
  return (
    <section className="glass-card rounded-xl p-5 space-y-4">
      <h3 className="text-xl text-primary font-headline-md">Saqlangan taomlar</h3>
      <p className="text-xs text-on-surface-variant">
        Tez qayta qo&apos;shish uchun shu qurilmada saqlanadi. Porsiya oldingi yozuv bilan bir xil.
      </p>
      <label className="text-sm block">
        Qaysi ovqatlanishga qo&apos;shilsin?
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value as MealType)}
          className="block mt-2 bg-black border border-white/10 rounded-lg p-2"
        >
          <option value="breakfast">Nonushta</option>
          <option value="lunch">Tushlik</option>
          <option value="dinner">Kechki ovqat</option>
          <option value="snack">Qo&apos;shimcha taom</option>
        </select>
      </label>
      {!items.length && (
        <p className="text-sm text-on-surface-variant">
          Bugungi jurnaldan tez-tez yeydigan taomingizni tanlang.
        </p>
      )}
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-center gap-2 border border-white/10 rounded-lg p-3"
        >
          <span className="flex-1 min-w-32 text-sm">
            {item.meal.mealName} · {item.meal.calories} kcal
          </span>
          <button
            disabled={busy || loading}
            onClick={() => void run(() => onAdd({ ...item.meal, mealType }))}
            className="text-primary border border-primary/20 rounded-lg px-3 py-2 disabled:opacity-50"
          >
            Qo&apos;shish
          </button>
          <button
            disabled={busy || loading}
            onClick={() => void run(() => save(items.filter((value) => value.id !== item.id)))}
            aria-label={`${item.meal.mealName} saqlangan taomini o'chirish`}
            className="text-error px-2 py-2 disabled:opacity-50"
          >
            O&apos;chirish
          </button>
        </div>
      ))}
      {meals.length > 0 && (
        <details>
          <summary className="text-sm cursor-pointer">Bugungi jurnaldan saqlash</summary>
          <div className="flex flex-wrap gap-2 mt-3">
            {meals.map((meal) => (
              <button
                key={meal.id}
                disabled={busy || loading}
                onClick={() => void run(() => remember(meal))}
                className="text-sm border border-white/10 rounded-lg px-3 py-2 disabled:opacity-50"
              >
                {meal.mealName}
              </button>
            ))}
          </div>
        </details>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
