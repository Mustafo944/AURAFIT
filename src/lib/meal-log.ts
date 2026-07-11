"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";

export interface MealEntry {
  id: string;
  mealName: string;
  calories: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  items: string[];
  timestamp: string;
}

function startOfTodayIso(): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function mapMealRow(row: {
  id: string;
  meal_name: string;
  calories: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
  items: string[];
  logged_at: string;
}): MealEntry {
  return {
    id: row.id,
    mealName: row.meal_name,
    calories: row.calories,
    proteinG: row.protein_g,
    fatG: row.fat_g,
    carbG: row.carb_g,
    items: row.items,
    timestamp: row.logged_at,
  };
}

async function insertMeal(userId: string, id: string, meal: Omit<MealEntry, "id" | "timestamp">, timestamp: string) {
  const supabase = createClient();
  await supabase.from("meals").insert({
    id,
    user_id: userId,
    meal_name: meal.mealName,
    calories: meal.calories,
    protein_g: meal.proteinG,
    fat_g: meal.fatG,
    carb_g: meal.carbG,
    items: meal.items,
    logged_at: timestamp,
  });
}

async function deleteMeal(id: string) {
  const supabase = createClient();
  await supabase.from("meals").delete().eq("id", id);
}

// Modul darajasidagi kesh (stale-while-revalidate): bir sahifadan ikkinchisiga
// o'tilganda oldingi natija darhol ko'rsatiladi, yangisi fonda tortib olinib
// keshni yangilaydi. Shu hook bir nechta komponentda ishlatilganda ham har
// navigatsiyada foydalanuvchi bo'sh holat/kutishni ko'rmaydi.
const mealCache = new Map<string, MealEntry[]>();

export function useMealLog() {
  const { userId } = useAuth();
  // Kunga bog'langan kalit — yarim tundan keyin kechagi taomlar keshi ishlatilmaydi.
  const cacheKey = `${userId}|${startOfTodayIso()}`;
  const [meals, setMeals] = useState<MealEntry[]>(() => mealCache.get(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => userId != null && !mealCache.has(cacheKey));

  // Kalit (foydalanuvchi yoki kun) o'zgarganda holat render vaqtida moslanadi —
  // effect ichidagi sync setState kaskadli qo'shimcha render chiqarardi.
  const [prevKey, setPrevKey] = useState(cacheKey);
  if (prevKey !== cacheKey) {
    setPrevKey(cacheKey);
    setMeals(mealCache.get(cacheKey) ?? []);
    setLoading(userId != null && !mealCache.has(cacheKey));
  }

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("meals")
      .select("id, meal_name, calories, protein_g, fat_g, carb_g, items, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", startOfTodayIso())
      .order("logged_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          const mapped = data.map(mapMealRow);
          mealCache.set(cacheKey, mapped);
          setMeals(mapped);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, cacheKey]);

  const addMeal = (meal: Omit<MealEntry, "id" | "timestamp">) => {
    if (!userId) return;
    const timestamp = new Date().toISOString();
    const id = crypto.randomUUID();
    setMeals((prev) => {
      const next = [...prev, { ...meal, id, timestamp }];
      mealCache.set(cacheKey, next);
      return next;
    });
    void insertMeal(userId, id, meal, timestamp);
  };

  const removeMeal = (id: string) => {
    setMeals((prev) => {
      const next = prev.filter((m) => m.id !== id);
      mealCache.set(cacheKey, next);
      return next;
    });
    void deleteMeal(id);
  };

  return { meals, loading, addMeal, removeMeal };
}

// Kalibrlangan TDEE hisobi (forecast.ts) uchun oxirgi N kunlik ovqat tarixini
// oladi — useMealLog()dan farqli, bugungi kun bilan cheklanmaydi.
const mealHistoryCache = new Map<string, MealEntry[]>();

export function useMealHistory(days: number) {
  const { userId } = useAuth();
  const cacheKey = `${userId}|${days}`;
  const [meals, setMeals] = useState<MealEntry[]>(() => mealHistoryCache.get(cacheKey) ?? []);
  const [loading, setLoading] = useState(() => userId != null && !mealHistoryCache.has(cacheKey));

  // Kalit o'zgarganda holat render vaqtida moslanadi (useMealLog'dagi kabi).
  const [prevKey, setPrevKey] = useState(cacheKey);
  if (prevKey !== cacheKey) {
    setPrevKey(cacheKey);
    setMeals(mealHistoryCache.get(cacheKey) ?? []);
    setLoading(userId != null && !mealHistoryCache.has(cacheKey));
  }

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("meals")
      .select("id, meal_name, calories, protein_g, fat_g, carb_g, items, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", daysAgoIso(days))
      .order("logged_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          const mapped = data.map(mapMealRow);
          mealHistoryCache.set(cacheKey, mapped);
          setMeals(mapped);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, days, cacheKey]);

  return { meals, loading };
}

export function sumMeals(meals: MealEntry[]) {
  return meals.reduce(
    (totals, meal) => ({
      calories: totals.calories + meal.calories,
      proteinG: totals.proteinG + meal.proteinG,
      fatG: totals.fatG + meal.fatG,
      carbG: totals.carbG + meal.carbG,
    }),
    { calories: 0, proteinG: 0, fatG: 0, carbG: 0 }
  );
}
