"use client";
import { idbGet, idbSetStrict } from "@/lib/idb";
import { createUserResource, useUserResource } from "@/lib/user-resource";

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
export function useFavoriteExercises() {
  return useSavedItems(favorites, "favorite-exercises");
}
