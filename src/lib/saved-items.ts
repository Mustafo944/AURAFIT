"use client";
import { idbGet, idbSetStrict } from "@/lib/idb";
import { createUserResource, useUserResource } from "@/lib/user-resource";
import type { MealEntry } from "@/lib/meal-log";

export interface WorkoutTemplate {
  id: string;
  name: string;
  exerciseIds: string[];
}
export interface SavedMeal {
  id: string;
  meal: Omit<MealEntry, "id" | "timestamp">;
}
const templates = createUserResource<WorkoutTemplate[]>(
  "templates",
  [],
  async (userId) => (await idbGet<WorkoutTemplate[]>(`templates_${userId}`)) ?? [],
);
const foods = createUserResource<SavedMeal[]>(
  "saved-meals",
  [],
  async (userId) => (await idbGet<SavedMeal[]>(`saved-meals_${userId}`)) ?? [],
);
const favorites = createUserResource<string[]>(
  "favorite-exercises",
  [],
  async (userId) => (await idbGet<string[]>(`favorite-exercises_${userId}`)) ?? [],
);

function useSavedItems<T>(resource: ReturnType<typeof createUserResource<T[]>>, key: string) {
  const { value: items, loading, userId } = useUserResource(resource);
  const save = async (next: T[]) => {
    if (!userId) throw new Error("Tizimga kiring.");
    await idbSetStrict(`${key}_${userId}`, next);
    resource.update(userId, () => next);
  };
  return { items, loading, save };
}
export function useWorkoutTemplates() {
  return useSavedItems(templates, "templates");
}
export function useSavedMeals() {
  return useSavedItems(foods, "saved-meals");
}
export function useFavoriteExercises() {
  return useSavedItems(favorites, "favorite-exercises");
}
