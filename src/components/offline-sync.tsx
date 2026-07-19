"use client";

import { useEffect, useState, useCallback } from "react";
import { getSyncQueue, removeSyncTask, type SyncTask } from "@/lib/idb";
import { createClient } from "@/lib/supabase/client";

export function OfflineSyncManager() {
  const [isOffline, setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const processQueue = useCallback(async () => {
    const queue = await getSyncQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    const supabase = createClient();

    for (const task of queue) {
      try {
        if (task.type === "INSERT_SESSION") {
          const { userId, session } = task.payload;
          await supabase.from("workout_sessions").insert({
            id: session.id,
            user_id: userId,
            started_at: session.startedAt,
            finished_at: session.finishedAt,
            exercises: session.exercises,
            cardio: session.cardio,
            total_volume_kg: session.totalVolumeKg,
            total_sets: session.totalSets,
            calories_burned: session.caloriesBurned,
          });
        } else if (task.type === "DELETE_SESSION") {
          const { sessionId } = task.payload;
          await supabase.from("workout_sessions").delete().eq("id", sessionId);
        } else if (task.type === "UPDATE_ADVICE") {
          const { id, advice } = task.payload;
          await supabase.from("workout_sessions").update({
            recovery_advice: advice.recoveryAdvice,
            progress_advice: advice.progressAdvice,
          }).eq("id", id);
        } else if (task.type === "INSERT_MEAL") {
          const { userId, id, meal, timestamp } = task.payload;
          await supabase.from("meals").insert({
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
          });
        } else if (task.type === "DELETE_MEAL") {
          const { id } = task.payload;
          await supabase.from("meals").delete().eq("id", id);
        } else if (task.type === "INSERT_WEIGHT") {
          const { userId, entry } = task.payload;
          await supabase.from("body_weight_logs").insert({
            id: entry.id,
            user_id: userId,
            weight_kg: entry.weightKg,
            logged_at: entry.loggedAt,
          });
        } else if (task.type === "UPDATE_PROFILE") {
          const { userId, profile } = task.payload;
          await supabase.from("profiles").upsert({
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
            updated_at: new Date().toISOString(),
          });
        }
        
        // Muaffaqiyatli o'tdi, navbatdan o'chiramiz
        if (task.id) await removeSyncTask(task.id);
      } catch (err) {
        console.error("Sinxronizatsiyada xatolik:", err);
        // Xatolik bo'lsa navbatda qolaveradi, keyinroq yana urinib ko'riladi
      }
    }

    setIsSyncing(false);
  }, []);

  useEffect(() => {
    // Initial holatni aniqlash
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      void processQueue();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Sahifa yuklanganda (agar internet bo'lsa) keshdagi navbatni tozalaymiz
    if (navigator.onLine) {
      void processQueue();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [processQueue]);

  if (!isOffline && !isSyncing) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center p-2 pointer-events-none">
      <div className="bg-surface-container-high/90 backdrop-blur-md text-on-surface text-xs font-medium px-4 py-1.5 rounded-full shadow-lg border border-outline-variant/30 flex items-center gap-2">
        {isOffline ? (
          <>
            <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
            Siz oflaynsiz. Ma'lumotlar saqlanmoqda...
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            Sinxronlanmoqda...
          </>
        )}
      </div>
    </div>
  );
}
