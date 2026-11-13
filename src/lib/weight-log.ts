"use client";

import { pushSyncTask, getSyncQueue } from "@/lib/idb";
import { createClient } from "@/lib/supabase/client";
import { createUserResource, useUserResource } from "@/lib/user-resource";

export interface WeightEntry {
  id: string;
  weightKg: number;
  loggedAt: string;
}

const weightResource = createUserResource<WeightEntry[]>("weights", [], async (userId) => {
  const before = await getSyncQueue().catch(() => []);
  const { data, error } = await createClient()
    .from("body_weight_logs")
    .select("id, weight_kg, logged_at")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(365);
  if (error) throw error;
  const entries = new Map(
    (data ?? []).map((row) => [row.id, { id: row.id, weightKg: row.weight_kg, loggedAt: row.logged_at }]),
  );
  for (const task of [...before, ...(await getSyncQueue().catch(() => []))]) {
    if (task.type === "INSERT_WEIGHT" && task.payload.userId === userId)
      entries.set(task.payload.entry.id, task.payload.entry);
  }
  return [...entries.values()].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
});

export async function logWeightEntry(userId: string, weightKg: number) {
  if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 500)
    throw new Error("Vazn 20-500 kg oralig'ida bo'lishi kerak.");
  const entry: WeightEntry = { id: crypto.randomUUID(), weightKg, loggedAt: new Date().toISOString() };
  await pushSyncTask({ type: "INSERT_WEIGHT", payload: { userId, entry } });
  weightResource.update(userId, (previous) => [...previous, entry]);
  return entry;
}

export function useWeightHistory() {
  const { value: entries, loading, error, userId } = useUserResource(weightResource);
  return { entries, loading, error, retry: () => userId && weightResource.refresh(userId) };
}
