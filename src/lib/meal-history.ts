"use client";

import { createClient } from "@/lib/supabase/client";
import { getSyncQueue } from "@/lib/idb";
import { mapMealRow, type MealEntry, type MealType } from "@/lib/meal-log";
import { dayKey } from "@/lib/date-key";

export { dayKey };

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Nonushta",
  lunch: "Tushlik",
  dinner: "Kechki ovqat",
  snack: "Qo'shimcha",
};

// Taomlarni kunlarga ajratadi; har kun ichida vaqt bo'yicha tartiblangan.
export function groupMealsByDay(meals: MealEntry[]): Map<string, MealEntry[]> {
  const days = new Map<string, MealEntry[]>();
  for (const meal of [...meals].sort((a, b) => a.timestamp.localeCompare(b.timestamp))) {
    const key = dayKey(new Date(meal.timestamp));
    const list = days.get(key);
    if (list) list.push(meal);
    else days.set(key, [meal]);
  }
  return days;
}

// Bir oylik taomlar: serverdagi yozuvlar + hali sinxronlanmagan (oflayn) qo'shish
// va o'chirishlar. Oy chegaralari foydalanuvchining mahalliy vaqti bo'yicha.
export async function fetchMealsForMonth(userId: string, year: number, month: number): Promise<MealEntry[]> {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const before = await getSyncQueue().catch(() => []);
  const { data, error } = await createClient()
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", start.toISOString())
    .lt("logged_at", end.toISOString())
    .order("logged_at", { ascending: true });
  if (error) throw error;
  const meals = new Map((data ?? []).map((row) => [row.id, mapMealRow(row)]));
  for (const task of [...before, ...(await getSyncQueue().catch(() => []))]) {
    if (task.payload.userId !== userId) continue;
    if (task.type === "INSERT_MEAL") {
      const at = new Date(task.payload.timestamp);
      if (at >= start && at < end)
        meals.set(task.payload.id, { ...task.payload.meal, id: task.payload.id, timestamp: task.payload.timestamp });
    }
    if (task.type === "DELETE_MEAL") meals.delete(task.payload.id);
  }
  return [...meals.values()];
}
