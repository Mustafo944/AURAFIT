"use client";

import { useEffect, useMemo, useState } from "react";
import type { Gender, Goal } from "@/context/user-profile-context";
import { useHydrated } from "@/lib/use-hydrated";

const STORAGE_KEY = "aurafit_daily_advice";

interface CachedAdvice {
  signature: string;
  advice: string;
}

interface AdviceParams {
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
  consumed: { calories: number; proteinG: number; fatG: number; carbG: number };
  meals: { mealName: string; calories: number }[];
  mealCount: number;
}

// Signature captures every number the advice is derived from, so the cached tip
// is reused only while ALL of them are unchanged. Changing the profile (targets)
// or logging a meal (consumed) shifts the signature and regenerates the advice —
// this is what keeps the tip consistent with the nutrition rings.
function signatureOf(params: AdviceParams) {
  const { metrics, consumed } = params;
  return [
    new Date().toDateString(),
    metrics.targetCalories,
    metrics.proteinG,
    metrics.fatG,
    metrics.carbG,
    consumed.calories,
    consumed.proteinG,
    consumed.fatG,
    consumed.carbG,
  ].join("|");
}

function readCachedAdvice(signature: string): string | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const cached = JSON.parse(raw) as CachedAdvice;
    return cached.signature === signature && typeof cached.advice === "string" ? cached.advice : null;
  } catch {
    return null;
  }
}

// `enabled=false` bo'lsa hech qanday so'rov yuborilmaydi — profil/ovqat
// ma'lumotlari Supabase'dan hali yuklanmagan paytda standart (noto'g'ri)
// qiymatlar bilan AI chaqirilib, kvota ikki barobar sarflanishining oldini oladi.
//
// Kesh (localStorage) render vaqtida o'qiladi (hydration'dan keyingina —
// serverda localStorage yo'q), `advice`/`loading` esa holatdan hisoblab
// chiqariladi: effect'da sync setState yo'q, kaskadli render bo'lmaydi.
export function useDailyAdvice(params: AdviceParams, enabled = true) {
  const hydrated = useHydrated();
  const signature = signatureOf(params);
  const [fetched, setFetched] = useState<CachedAdvice | null>(null);
  // Muvaffaqiyatsiz urinishda ham signatura belgilanadi — aks holda loading
  // abadiy true qolib, effect qayta-qayta so'rov yuborishga urinardi.
  const [attemptedSignature, setAttemptedSignature] = useState<string | null>(null);

  const cachedAdvice = useMemo(() => (hydrated ? readCachedAdvice(signature) : null), [hydrated, signature]);
  const advice = cachedAdvice ?? (fetched?.signature === signature ? fetched.advice : null);
  const loading = enabled && hydrated && advice === null && attemptedSignature !== signature;

  useEffect(() => {
    if (!enabled || !hydrated || advice !== null || attemptedSignature === signature) return;
    let cancelled = false;
    fetch("/api/coach-advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled || !res.ok || typeof data.advice !== "string") return;
        setFetched({ signature, advice: data.advice });
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ signature, advice: data.advice }));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAttemptedSignature(signature);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, enabled, hydrated, advice, attemptedSignature]);

  return { advice, loading };
}
