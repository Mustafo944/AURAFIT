"use client";
import { getSyncQueue, removeSyncTask, type SyncTask } from "@/lib/idb";
import { createClient } from "@/lib/supabase/client";

export async function applySyncTask(task: SyncTask, supabase = createClient()) {
  let result: { error: { message: string } | null; data?: unknown } | undefined;
  if (task.type === "INSERT_SESSION") {
    const { userId, session } = task.payload;
    result = await supabase.from("workout_sessions").upsert(
      {
        id: session.id,
        user_id: userId,
        started_at: session.startedAt,
        finished_at: session.finishedAt,
        exercises: session.exercises,
        cardio: session.cardio,
        total_volume_kg: session.totalVolumeKg,
        total_sets: session.totalSets,
        calories_burned: session.caloriesBurned,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  } else if (task.type === "DELETE_SESSION") {
    const { userId, sessionId } = task.payload;
    result = await supabase
      .from("workout_sessions")
      .delete()
      .eq("id", sessionId)
      .eq("user_id", userId)
      .select("id");
  } else if (task.type === "UPDATE_ADVICE") {
    const { userId, id, advice } = task.payload;
    result = await supabase
      .from("workout_sessions")
      .update({
        recovery_advice: advice.recoveryAdvice,
        progress_advice: advice.progressAdvice,
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");
  } else if (task.type === "INSERT_MEAL") {
    const { userId, id, meal, timestamp } = task.payload;
    result = await supabase.from("meals").upsert(
      {
        id,
        user_id: userId,
        meal_name: meal.mealName,
        meal_type: meal.mealType,
        calories: meal.calories,
        protein_g: meal.proteinG,
        fat_g: meal.fatG,
        carb_g: meal.carbG,
        items: meal.items,
        logged_at: timestamp,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  } else if (task.type === "DELETE_MEAL") {
    const { userId, id } = task.payload;
    result = await supabase.from("meals").delete().eq("id", id).eq("user_id", userId).select("id");
  } else if (task.type === "INSERT_WEIGHT") {
    const { userId, entry } = task.payload;
    result = await supabase.from("body_weight_logs").upsert(
      {
        id: entry.id,
        user_id: userId,
        weight_kg: entry.weightKg,
        logged_at: entry.loggedAt,
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
  } else if (task.type === "UPDATE_PROFILE") {
    const { userId, profile } = task.payload;
    result = await supabase.from("profiles").upsert({
      id: userId,
      first_name: profile.firstName,
      last_name: profile.lastName,
      age: profile.age,
      gender: profile.gender,
      weight_kg: profile.weightKg,
      height_cm: profile.heightCm,
      goal: profile.goal,
      target_weight_kg: profile.targetWeightKg,
      avatar_url: profile.avatarUrl,
      activity_level: profile.activityLevel ?? "moderate",
      training_preferences: profile.training ?? {
        experience: "beginner",
        equipment: ["bodyweight"],
        daysPerWeek: 3,
      },
      updated_at: new Date().toISOString(),
    });
  }

  if (!result) throw new Error("Noma'lum sinxronizatsiya vazifasi");
  if (result.error) throw new Error(result.error.message);
  if (task.type === "UPDATE_ADVICE" && Array.isArray(result.data) && result.data.length === 0) {
    throw new Error("Mashg'ulot hali serverga saqlanmagan");
  }
  if (task.type === "DELETE_SESSION" || task.type === "DELETE_MEAL") {
    const table = task.type === "DELETE_SESSION" ? "workout_sessions" : "meals";
    const id = task.type === "DELETE_SESSION" ? task.payload.sessionId : task.payload.id;
    const check = await supabase
      .from(table)
      .select("id")
      .eq("id", id)
      .eq("user_id", task.payload.userId)
      .maybeSingle();
    if (check.error || check.data) throw new Error("Yozuvni serverdan o'chirib bo'lmadi");
  }
}

let running: Promise<void> | null = null;
export function syncQueue(userId: string): Promise<void> {
  if (running) return running;
  const run = async () => {
    const queue = await getSyncQueue();
    if (!queue.some((task) => task.payload.userId === userId)) return;
    const supabase = createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || data.user?.id !== userId) throw new Error("Qayta tizimga kiring");
    const checkSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user.id !== userId) throw new Error("Hisob o'zgardi. Qayta urinib ko'ring");
    };
    for (const task of queue) {
      // Old, unowned delete tasks are retained; never guess their owner.
      if (task.payload.userId !== userId) continue;
      await checkSession();
      await applySyncTask(task, supabase);
      await checkSession();
      if (task.id != null) await removeSyncTask(task.id);
    }
  };
  running = Promise.resolve(
    typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request("aurafit-sync", run)
      : run(),
  )
    .then(() => {})
    .finally(() => {
      running = null;
    });
  return running;
}
