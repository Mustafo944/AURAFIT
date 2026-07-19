"use client";

import { createClient } from "@/lib/supabase/client";

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

// Tarixni yuklamasdan bitta vazn yozuvini qo'shish — profil sahifasi kabi
// faqat yozish kerak bo'lgan joylar uchun (butun tarixni bekorga tortmaslik uchun).
// O'qish tomoni hozircha yo'q: yozuvlar kelajakdagi vazn-trend funksiyalari
// uchun bazada to'planib boradi.
export function logWeightEntry(userId: string, weightKg: number) {
  const entry: WeightEntry = { id: crypto.randomUUID(), weightKg, loggedAt: new Date().toISOString() };
  void insertWeightEntry(userId, entry);
}
