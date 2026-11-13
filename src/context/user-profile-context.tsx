"use client";

import {
  DEFAULT_TRAINING,
  normalizeActivity,
  normalizeTraining,
  type ActivityLevel,
  type TrainingPreferences,
} from "@/lib/training-preferences";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import { idbGet, idbSet, pushSyncTask, getSyncQueue } from "@/lib/idb";

export type Gender = "male" | "female";
export type Goal = "lose" | "maintain" | "gain";

export interface UserProfile {
  firstName: string;
  lastName: string;
  age: number;
  gender: Gender;
  weightKg: number;
  heightCm: number;
  goal: Goal;
  targetWeightKg: number | null;
  avatarUrl: string | null;
  activityLevel: ActivityLevel;
  training: TrainingPreferences;
}

export const DEFAULT_PROFILE: UserProfile = {
  firstName: "",
  lastName: "",
  age: 28,
  gender: "male",
  weightKg: 78,
  heightCm: 178,
  goal: "maintain",
  targetWeightKg: null,
  avatarUrl: null,
  activityLevel: "moderate",
  training: DEFAULT_TRAINING,
};

interface UserProfileContextValue {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => Promise<{ error: string | null }>;
  loading: boolean;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

async function persistProfile(userId: string, profile: UserProfile): Promise<{ error: string | null }> {
  try {
    await pushSyncTask({ type: "UPDATE_PROFILE", payload: { userId, profile } });
    return { error: null };
  } catch {
    return { error: "Profilni qurilmada saqlab bo'lmadi. Qayta urinib ko'ring." };
  }
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [profile, setProfileState] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(() => userId != null);

  // Foydalanuvchi o'zgarganda (login/logout) holat render vaqtida moslanadi —
  // effect ichidagi sync setState kaskadli qo'shimcha render chiqarardi.
  const [prevUserId, setPrevUserId] = useState(userId);
  if (prevUserId !== userId) {
    setPrevUserId(userId);
    setProfileState(DEFAULT_PROFILE);
    setLoading(userId != null);
  }

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    // OFLAYN KESHDAN O'QISH - "Miltillash" (Flash of unstyled content) va oflayn uchun
    idbGet<UserProfile>(`profile_${userId}`).then((cached) => {
      if (cancelled) return;
      if (cached) {
        setProfileState((prev) =>
          prev === DEFAULT_PROFILE
            ? {
                ...DEFAULT_PROFILE,
                ...cached,
                activityLevel: normalizeActivity(cached.activityLevel),
                training: normalizeTraining(cached.training),
              }
            : prev,
        );
      }
    });

    const supabase = createClient();
    getSyncQueue()
      .catch(() => [])
      .then(async (pendingBefore) => {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (cancelled) return;
        if (error) {
          console.error("Profilni o'qishda xatolik:", error.message);
        } else if (data) {
          const fetchedProfile: UserProfile = {
            firstName: data.first_name ?? "",
            lastName: data.last_name ?? "",
            age: data.age,
            gender: data.gender,
            weightKg: data.weight_kg,
            heightCm: data.height_cm,
            goal: data.goal,
            targetWeightKg: data.target_weight_kg ?? null,
            avatarUrl: data.avatar_url ?? null,
            activityLevel: normalizeActivity(data.activity_level),
            training: normalizeTraining(data.training_preferences),
          };
          const pending = [...pendingBefore, ...(await getSyncQueue().catch(() => []))];
          if (cancelled) return;
          for (const task of pending) {
            if (task.type === "UPDATE_PROFILE" && task.payload.userId === userId)
              Object.assign(fetchedProfile, task.payload.profile);
          }
          setProfileState(fetchedProfile);
          idbSet(`profile_${userId}`, fetchedProfile);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setProfile = async (next: UserProfile) => {
    if (!userId) return { error: "Tizimga kiring." };
    const result = await persistProfile(userId, next);
    if (result.error) return result;
    setProfileState(next);
    void idbSet(`profile_${userId}`, next);
    return result;
  };

  return (
    <UserProfileContext.Provider value={{ profile, setProfile, loading }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) {
    throw new Error("useUserProfile must be used within a UserProfileProvider");
  }
  return ctx;
}
