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
        setMeals(
          data.map((row) => ({
            id: row.id,
            mealName: row.meal_name,
            calories: row.calories,
            proteinG: row.protein_g,
            fatG: row.fat_g,
            carbG: row.carb_g,
            items: row.items,
            timestamp: row.logged_at,
          }))
        );
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
