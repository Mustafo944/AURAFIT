"use client";

import { useEffect, useMemo, useState } from "react";
import type { Gender, Goal } from "@/context/user-profile-context";
import { useHydrated } from "@/lib/use-hydrated";

const STORAGE_KEY = "aurafit_profile_insight";

interface ProfileInsight {
  analysis: string;
  tips: string[];
}

interface CachedInsight extends ProfileInsight {
  signature: string;
}

interface InsightParams {
  profile: { age: number; gender: Gender; weightKg: number; heightCm: number; goal: Goal };
  metrics: {
    bmr: number;
    tdee: number;
    targetCalories: number;
    bmi: number;
    bmiCategory: string;
    proteinG: number;
    fatG: number;
    carbG: number;
  };
}

function signatureOf(profile: InsightParams["profile"]) {
  return `${profile.age}|${profile.gender}|${profile.weightKg}|${profile.heightCm}|${profile.goal}`;
}

// Regenerates only when age/gender/weight/height/goal actually change (not on
// every keystroke) — cached by that exact combination, so re-saving the same
// values reuses the previous AI analysis instead of calling Groq again.
function readCachedInsight(signature: string): ProfileInsight | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const cached = JSON.parse(raw) as CachedInsight;
    if (cached.signature === signature && typeof cached.analysis === "string" && Array.isArray(cached.tips)) {
      return { analysis: cached.analysis, tips: cached.tips };
    }
    return null;
  } catch {
    return null;
  }
}

// `enabled=false` bo'lsa so'rov yuborilmaydi — profil Supabase'dan hali
// yuklanmagan paytda DEFAULT_PROFILE qiymatlari bilan AI chaqirilib,
// kvota behuda sarflanishining oldini oladi.
//
// Kesh (localStorage) render vaqtida o'qiladi (hydration'dan keyingina),
// `insight`/`loading` holatdan hisoblab chiqariladi — effect'da sync setState
// yo'q, kaskadli render bo'lmaydi (daily-advice.ts bilan bir xil naqsh).
export function useProfileInsight(params: InsightParams, enabled = true) {
  const hydrated = useHydrated();
  const signature = signatureOf(params.profile);
  const [fetched, setFetched] = useState<{ signature: string; insight: ProfileInsight } | null>(null);
  const [attemptedSignature, setAttemptedSignature] = useState<string | null>(null);

  const cachedInsight = useMemo(() => (hydrated ? readCachedInsight(signature) : null), [hydrated, signature]);
  const insight = cachedInsight ?? (fetched?.signature === signature ? fetched.insight : null);
  const loading = enabled && hydrated && insight === null && attemptedSignature !== signature;

  useEffect(() => {
    if (!enabled || !hydrated || insight !== null || attemptedSignature === signature) return;
    let cancelled = false;
    fetch("/api/profile-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled || !res.ok || typeof data.analysis !== "string") return;
        const tips = Array.isArray(data.tips) ? data.tips.filter((t: unknown) => typeof t === "string") : [];
        const next: ProfileInsight = { analysis: data.analysis, tips };
        setFetched({ signature, insight: next });
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, signature }));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAttemptedSignature(signature);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, enabled, hydrated, insight, attemptedSignature]);

  return { insight, loading };
}
