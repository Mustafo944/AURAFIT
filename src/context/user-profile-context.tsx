"use client";

import {
  DEFAULT_TRAINING,
  normalizeActivity,
  normalizeTraining,
  type ActivityLevel,
  type TrainingPreferences,
} from "@/lib/training-preferences";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
  // Foydalanuvchi o'z parametrlarini kiritganmi. Kiritilmaguncha bosh sahifa
  // namunaviy raqamlar o'rniga "ma'lumotlaringizni kiriting" kartasini ko'rsatadi.
  onboarded: boolean;
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
  onboarded: false,
};

interface UserProfileContextValue {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => Promise<{ error: string | null }>;
  loading: boolean;
  /**
   * Profilni serverdan o'qib bo'lmadi (tarmoq/server xatosi) va qurilmada ham nusxasi yo'q.
   * Bu holatda `profile` — namunaviy qiymatlar, haqiqiy ma'lumot EMAS: "yangi akkaunt"
   * deb ko'rsatmaslik va ustidan yozmaslik kerak.
   */
  loadError: boolean;
  reload: () => void;
}

// Xato bo'lganda avtomatik qayta urinish kechikishlari (ms).
const RETRY_DELAYS_MS = [2000, 5000, 10000, 20000, 30000];

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
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Qurilmadagi (IndexedDB) haqiqiy nusxa o'qildimi — xatoda uni ko'rsatishda davom etamiz.
  const hasCachedProfileRef = useRef(false);

  // Foydalanuvchi o'zgarganda (login/logout) holat render vaqtida moslanadi —
  // effect ichidagi sync setState kaskadli qo'shimcha render chiqarardi.
  const [prevUserId, setPrevUserId] = useState(userId);
  if (prevUserId !== userId) {
    setPrevUserId(userId);
    setProfileState(DEFAULT_PROFILE);
    setLoading(userId != null);
    setLoadError(false);
  }

  useEffect(() => {
    if (!userId) return;
    hasCachedProfileRef.current = false;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    // OFLAYN KESHDAN O'QISH - "Miltillash" (Flash of unstyled content) va oflayn uchun
    idbGet<UserProfile>(`profile_${userId}`).then((cached) => {
      if (cancelled) return;
      if (cached) {
        hasCachedProfileRef.current = true;
        setProfileState((prev) =>
          prev === DEFAULT_PROFILE
            ? {
                ...DEFAULT_PROFILE,
                ...cached,
                activityLevel: normalizeActivity(cached.activityLevel),
                training: normalizeTraining(cached.training),
                // Bu maydon paydo bo'lishidan oldingi kesh — foydalanuvchi profilni allaqachon ishlatgan.
                onboarded: cached.onboarded ?? true,
              }
            : prev,
        );
      }
    });

    const supabase = createClient();

    const scheduleRetry = () => {
      if (cancelled || attempt >= RETRY_DELAYS_MS.length) return;
      retryTimer = setTimeout(() => void load(), RETRY_DELAYS_MS[attempt]);
      attempt += 1;
    };

    const load = async () => {
      try {
        const pendingBefore = await getSyncQueue().catch(() => []);
        const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (cancelled) return;

        if (error) {
          // PGRST116 — qator topilmadi: bu haqiqatan yangi akkaunt (anketa kerak).
          // Boshqa xatolar — vaqtinchalik muammo: yangi akkaunt deb QABUL QILMAYMIZ.
          if (error.code === "PGRST116") {
            setLoadError(false);
            setLoading(false);
            return;
          }
          console.error("Profilni o'qishda xatolik:", error.message);
          // Qurilmada nusxa bo'lsa, uni ko'rsatamiz; bo'lmasa xato holati (qayta urinish bilan).
          setLoadError(!hasCachedProfileRef.current);
          setLoading(false);
          scheduleRetry();
          return;
        }

        if (data) {
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
            // Ustun yo'q (migratsiya qo'llanmagan) bo'lsa, anketani majburlamaymiz.
            onboarded: data.onboarded ?? true,
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
        setLoadError(false);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setLoadError(!hasCachedProfileRef.current);
        setLoading(false);
        scheduleRetry();
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [userId, reloadKey]);

  const reload = () => {
    setLoading(true);
    setLoadError(false);
    setReloadKey((key) => key + 1);
  };

  const setProfile = async (next: UserProfile) => {
    if (!userId) return { error: "Tizimga kiring." };
    // Profil serverdan yuklanmagan bo'lsa, namunaviy qiymatlar (ism va rasm bo'sh) haqiqiy
    // ma'lumot ustidan yozilib ketmasligi uchun saqlashga ruxsat bermaymiz.
    if (loading || loadError) {
      return { error: "Profil hali yuklanmadi. Internetni tekshirib, birozdan so'ng qayta urinib ko'ring." };
    }
    const result = await persistProfile(userId, next);
    if (result.error) return result;
    setProfileState(next);
    void idbSet(`profile_${userId}`, next);
    return result;
  };

  return (
    <UserProfileContext.Provider value={{ profile, setProfile, loading, loadError, reload }}>
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
