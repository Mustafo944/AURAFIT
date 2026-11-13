"use client";
import { createClient } from "@/lib/supabase/client";
import { getSyncQueue, idbGetStrict } from "@/lib/idb";

// Export every server row, not only the currently loaded history page.
export async function exportAccountData(userId: string) {
  const client = createClient();
  const verify = async () => {
    const { data, error } = await client.auth.getUser();
    if (error || data.user?.id !== userId) throw new Error("Hisob o'zgardi. Qayta tizimga kiring.");
  };
  await verify();
  const cloud: Record<string, unknown[]> = {};
  for (const table of ["profiles", "workout_sessions", "meals", "body_weight_logs"] as const) {
    const rows: unknown[] = [];
    let cursor: string | null = null;
    for (;;) {
      const owned =
        table === "profiles"
          ? client.from("profiles").select("*").eq("id", userId)
          : client.from(table).select("*").eq("user_id", userId);
      let query = owned.order("id", { ascending: true }).limit(500);
      if (cursor) query = query.gt("id", cursor);
      const { data, error } = await query;
      if (error) throw new Error("Serverdagi ma'lumotlarni to'liq yuklab bo'lmadi. Qayta urinib ko'ring.");
      rows.push(...(data ?? []));
      if (!data?.length) break;
      const next: string = data.at(-1)!.id;
      if (cursor && next <= cursor) throw new Error("Eksport sahifalarini yuklab bo'lmadi.");
      cursor = next;
    }
    cloud[table] = rows;
  }
  const local: Record<string, unknown> = {};
  for (const key of [
    "profile",
    "workout-history-v2",
    "meal-history-v2",
    "weights",
    "templates",
    "saved-meals",
    "favorite-exercises",
  ])
    local[key] = (await idbGetStrict(`${key}_${userId}`)) ?? null;
  const draft = localStorage.getItem(`aurafit_active_session_${userId}`);
  local.activeWorkout = draft ? JSON.parse(draft) : null;
  const pending = (await getSyncQueue()).filter((task) => task.payload.userId === userId);
  await verify();
  return {
    format: "aurafit-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    userId,
    cloud,
    local,
    pending,
    note: "Cloud rows and device snapshot are separate. Pending operations may not yet appear on the server. This export is not an atomic database snapshot.",
  };
}
