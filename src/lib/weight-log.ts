"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";

export interface WeightEntry {
  id: string;
  weightKg: number;
  loggedAt: string;
}

async function insertWeightEntry(userId: string, entry: WeightEntry) {
  const supabase = createClient();
  const { error } = await supabase.from("body_weight_logs").insert({
    id: entry.id,
    user_id: userId,
    weight_kg: entry.weightKg,
    logged_at: entry.loggedAt,
  });
  if (error) console.error("Vazn yozuvini saqlashda xatolik:", error.message);
}

async function deleteWeightEntryRow(id: string) {
  const supabase = createClient();
  await supabase.from("body_weight_logs").delete().eq("id", id);
}

function byLoggedAtAsc(a: WeightEntry, b: WeightEntry) {
  return a.loggedAt.localeCompare(b.loggedAt);
}

// Butun vazn tarixini (eskidan yangiga) qaytaradi — grafik va prognoz
// (chiziqli regressiya) shu tartibga tayangan holda ishlaydi.
export function useWeightHistory() {
  const { userId } = useAuth();
  const [entries, setEntries] = useState<WeightEntry[]>([]);

  useEffect(() => {
    if (!userId) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("body_weight_logs")
      .select("id, weight_kg, logged_at")
      .eq("user_id", userId)
      .order("logged_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Vazn tarixini o'qishda xatolik:", error.message);
        if (!data) return;
        setEntries(
          data.map((row) => ({
            id: row.id,
            weightKg: row.weight_kg,
            loggedAt: row.logged_at,
          }))
        );
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addWeightEntry = (weightKg: number, loggedAt: string = new Date().toISOString()) => {
    if (!userId) return;
    const entry: WeightEntry = { id: crypto.randomUUID(), weightKg, loggedAt };
    setEntries((prev) => [...prev, entry].sort(byLoggedAtAsc));
    void insertWeightEntry(userId, entry);
  };

  const deleteWeightEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    void deleteWeightEntryRow(id);
  };

  return { entries, addWeightEntry, deleteWeightEntry };
}
