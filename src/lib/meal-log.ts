"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createUserResource, useUserResource } from "@/lib/user-resource";
import { pushSyncTask, getSyncQueue } from "@/lib/idb";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealEntry {
  id: string;
  mealName: string;
  mealType: MealType;
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

function mapMealRow(row: {
  id: string;
  meal_name: string;
  meal_type: MealType;
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
    mealType: row.meal_type,
    calories: row.calories,
    proteinG: row.protein_g,
    fatG: row.fat_g,
    carbG: row.carb_g,
    items: row.items,
    timestamp: row.logged_at,
  };
}

interface MealState {
  day: string;
  meals: MealEntry[];
}
const mealResource = createUserResource<MealState>(
  "meal-history-v2",
  { day: "", meals: [] },
  async (userId) => {
    const day = startOfTodayIso();
    const before = await getSyncQueue().catch(() => []);
    const end = new Date(day);
    end.setDate(end.getDate() + 1);
    const { data, error } = await createClient()
      .from("meals")
      .select("*")
      .eq("user_id", userId)
      .gte("logged_at", day)
      .lt("logged_at", end.toISOString())
      .order("logged_at", { ascending: true });
    if (error) throw error;
    const meals = new Map((data ?? []).map((row) => [row.id, mapMealRow(row)]));
    for (const task of [...before, ...(await getSyncQueue().catch(() => []))]) {
      if (task.payload.userId !== userId) continue;
      if (
        task.type === "INSERT_MEAL" &&
        task.payload.timestamp >= day &&
        task.payload.timestamp < end.toISOString()
      )
        meals.set(task.payload.id, {
          ...task.payload.meal,
          id: task.payload.id,
          timestamp: task.payload.timestamp,
        });
      if (task.type === "DELETE_MEAL") meals.delete(task.payload.id);
    }
    return { day, meals: [...meals.values()].sort((a, b) => a.timestamp.localeCompare(b.timestamp)) };
  },
);
export function useMealLog() {
  const { value, userId, loading, error } = useUserResource(mealResource);
  const [actionError, setActionError] = useState<{ userId: string; message: string } | null>(null);
  useEffect(() => {
    if (!userId) return;
    const checkDay = () => {
      if (mealResource.get(userId).value.day !== startOfTodayIso()) void mealResource.refresh(userId);
    };
    const timer = setInterval(checkDay, 30000);
    window.addEventListener("focus", checkDay);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", checkDay);
    };
  }, [userId]);
  const addMeal = async (meal: Omit<MealEntry, "id" | "timestamp">) => {
    if (!userId) throw new Error("Tizimga kiring.");
    const timestamp = new Date().toISOString();
    const id = crypto.randomUUID();
    await pushSyncTask({ type: "INSERT_MEAL", payload: { userId, id, meal, timestamp } });
    const day = startOfTodayIso();
    mealResource.update(userId, (current) => ({
      day,
      meals: [...(current.day === day ? current.meals : []), { ...meal, id, timestamp }],
    }));
  };
  const removeMeal = async (id: string) => {
    if (!userId) return;
    try {
      await pushSyncTask({ type: "DELETE_MEAL", payload: { userId, id } });
      mealResource.update(userId, (current) => ({
        ...current,
        meals: current.meals.filter((meal) => meal.id !== id),
      }));
      setActionError(null);
    } catch {
      setActionError({ userId, message: "Taomni o'chirish saqlanmadi. Qayta urinib ko'ring." });
    }
  };
  return {
    meals: value.day === startOfTodayIso() ? value.meals : [],
    loading,
    error: actionError?.userId === userId ? actionError.message : error,
    addMeal,
    removeMeal,
  };
}

export function sumMeals(meals: MealEntry[]) {
  return meals.reduce(
    (totals, meal) => ({
      calories: totals.calories + meal.calories,
      proteinG: totals.proteinG + meal.proteinG,
      fatG: totals.fatG + meal.fatG,
      carbG: totals.carbG + meal.carbG,
    }),
    { calories: 0, proteinG: 0, fatG: 0, carbG: 0 },
  );
}
