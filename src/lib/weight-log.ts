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

// Modul darajasidagi kesh (stale-while-revalidate) — navigatsiyada oldingi
// natija darhol ko'rsatiladi, fonda yangilanadi.
const weightCache = new Map<string, WeightEntry[]>();

// Tarixni yuklamasdan bitta vazn yozuvini qo'shish — profil sahifasi kabi
// faqat yozish kerak bo'lgan joylar uchun (butun tarixni bekorga tortmaslik uchun).
export function logWeightEntry(userId: string, weightKg: number) {
  const entry: WeightEntry = { id: crypto.randomUUID(), weightKg, loggedAt: new Date().toISOString() };
  const cached = weightCache.get(userId);
  if (cached) weightCache.set(userId, [...cached, entry].sort(byLoggedAtAsc));
  void insertWeightEntry(userId, entry);
}

// Butun vazn tarixini (eskidan yangiga) qaytaradi — grafik va prognoz
// (chiziqli regressiya) shu tartibga tayangan holda ishlaydi.
export function useWeightHistory() {
  const { userId } = useAuth();
  const [entries, setEntries] = useState<WeightEntry[]>(() => (userId && weightCache.get(userId)) || []);
  const [loading, setLoading] = useState(() => userId != null && !weightCache.has(userId));

  // Foydalanuvchi o'zgarganda holat render vaqtida moslanadi — effect
  // ichidagi sync setState kaskadli qo'shimcha render chiqarardi.
  const [prevUserId, setPrevUserId] = useState(userId);
  if (prevUserId !== userId) {
    setPrevUserId(userId);
    setEntries((userId && weightCache.get(userId)) || []);
    setLoading(userId != null && !weightCache.has(userId));
  }

  useEffect(() => {
    if (!userId) return;
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
        if (data) {
          const mapped = data.map((row) => ({
            id: row.id,
            weightKg: row.weight_kg,
            loggedAt: row.logged_at,
          }));
          weightCache.set(userId, mapped);
          setEntries(mapped);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const addWeightEntry = (weightKg: number, loggedAt: string = new Date().toISOString()) => {
    if (!userId) return;
    const entry: WeightEntry = { id: crypto.randomUUID(), weightKg, loggedAt };
    setEntries((prev) => {
      const next = [...prev, entry].sort(byLoggedAtAsc);
      weightCache.set(userId, next);
      return next;
    });
    void insertWeightEntry(userId, entry);
  };

  const deleteWeightEntry = (id: string) => {
    if (!userId) return;
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      weightCache.set(userId, next);
      return next;
    });
    void deleteWeightEntryRow(id);
  };

  return { entries, loading, addWeightEntry, deleteWeightEntry };
}
