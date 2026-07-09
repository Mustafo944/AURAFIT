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
}

export const DEFAULT_PROFILE: UserProfile = {
  age: 28,
  gender: "male",
  weightKg: 78,
  heightCm: 178,
  goal: "maintain",
};

interface UserProfileContextValue {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  loading: boolean;
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null);

async function persistProfile(userId: string, profile: UserProfile) {
  const supabase = createClient();
  await supabase.from("profiles").upsert({
    id: userId,
    age: profile.age,
    gender: profile.gender,
    weight_kg: profile.weightKg,
    height_cm: profile.heightCm,
    goal: profile.goal,
    updated_at: new Date().toISOString(),
  });
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [profile, setProfileState] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProfileState(DEFAULT_PROFILE);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("age, gender, weight_kg, height_cm, goal")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setProfileState({
            age: data.age,
            gender: data.gender,
            weightKg: data.weight_kg,
            heightCm: data.height_cm,
            goal: data.goal,
          });
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setProfile = (next: UserProfile) => {
    setProfileState(next);
    if (!userId) return;
    void persistProfile(userId, next);
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
