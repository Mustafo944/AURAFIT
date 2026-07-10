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

export function useMealLog() {
  const { userId } = useAuth();
  const [meals, setMeals] = useState<MealEntry[]>([]);

  useEffect(() => {
    if (!userId) {
      setMeals([]);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("meals")
      .select("id, meal_name, calories, protein_g, fat_g, carb_g, items, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", startOfTodayIso())
      .order("logged_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled || !data) return;
        setMeals(data.map(mapMealRow));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addMeal = (meal: Omit<MealEntry, "id" | "timestamp">) => {
    if (!userId) return;
    const timestamp = new Date().toISOString();
    const id = crypto.randomUUID();
    setMeals((prev) => [...prev, { ...meal, id, timestamp }]);
    void insertMeal(userId, id, meal, timestamp);
  };

  const removeMeal = (id: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== id));
    void deleteMeal(id);
  };

  return { meals, addMeal, removeMeal };
}

// Kalibrlangan TDEE hisobi (forecast.ts) uchun oxirgi N kunlik ovqat tarixini
// oladi — useMealLog()dan farqli, bugungi kun bilan cheklanmaydi.
export function useMealHistory(days: number) {
  const { userId } = useAuth();
  const [meals, setMeals] = useState<MealEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setMeals([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("meals")
      .select("id, meal_name, calories, protein_g, fat_g, carb_g, items, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", daysAgoIso(days))
      .order("logged_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setMeals(data.map(mapMealRow));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, days]);

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
