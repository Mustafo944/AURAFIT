"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";
import { idbGet, idbSet, pushSyncTask } from "@/lib/idb";

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
};

interface UserProfileContextValue {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => Promise<{ error: string | null }>;
  loading: boolean;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

async function persistProfile(userId: string, profile: UserProfile): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("profiles").upsert({
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
    if (error) {
      console.error("Profilni saqlashda xatolik:", error.message);
      throw error;
    }
  } catch (err) {
    if (!navigator.onLine || err instanceof TypeError) {
      // Oflayn bo'lsa navbatga yozamiz
      await pushSyncTask({ type: "UPDATE_PROFILE", payload: { userId, profile } });
    } else {
      return { error: (err as Error).message };
    }
  }
  return { error: null };
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
        setProfileState((prev) => (prev === DEFAULT_PROFILE ? cached : prev));
      }
    });

    const supabase = createClient();
    supabase
      .from("profiles")
      .select("first_name, last_name, age, gender, weight_kg, height_cm, goal, target_weight_kg, avatar_url")
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
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
          };
          setProfileState(fetchedProfile);
          idbSet(`profile_${userId}`, fetchedProfile);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setProfile = async (next: UserProfile) => {
    setProfileState(next);
    if (!userId) return { error: null };
    idbSet(`profile_${userId}`, next);
    return persistProfile(userId, next);
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
