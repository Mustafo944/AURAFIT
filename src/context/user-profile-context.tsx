"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/auth-context";

export type Gender = "male" | "female";
export type Goal = "lose" | "maintain" | "gain";

export interface UserProfile {
  age: number;
  gender: Gender;
  weightKg: number;
  heightCm: number;
  goal: Goal;
  targetWeightKg: number | null;
  avatarUrl: string | null;
}

export const DEFAULT_PROFILE: UserProfile = {
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
  const supabase = createClient();
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
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
    // Xatoni yutib yubormaslik uchun — masalan bazada ustun/jadval hali
    // yaratilmagan bo'lsa (schema.sql to'liq bajarilmagan), foydalanuvchi
    // "Saqlandi" ko'rib, aslida hech narsa saqlanmagani bilmay qolmasligi kerak.
    console.error("Profilni saqlashda xatolik:", error.message);
    return { error: error.message };
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
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("age, gender, weight_kg, height_cm, goal, target_weight_kg, avatar_url")
      .eq("id", userId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("Profilni o'qishda xatolik:", error.message);
        } else if (data) {
          setProfileState({
            age: data.age,
            gender: data.gender,
            weightKg: data.weight_kg,
            heightCm: data.height_cm,
            goal: data.goal,
            targetWeightKg: data.target_weight_kg ?? null,
            avatarUrl: data.avatar_url ?? null,
          });
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
