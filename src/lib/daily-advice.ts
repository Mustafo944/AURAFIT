"use client";

import { useEffect, useState } from "react";
import type { Gender, Goal } from "@/context/user-profile-context";

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

export function useDailyAdvice(params: AdviceParams) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const signature = signatureOf(params);

  useEffect(() => {
    let cancelled = false;
    const raw = localStorage.getItem(STORAGE_KEY);
    let cached: CachedAdvice | null = null;
    if (raw) {
      try {
        cached = JSON.parse(raw);
      } catch {
        cached = null;
      }
    }

    if (cached && cached.signature === signature && typeof cached.advice === "string") {
      setAdvice(cached.advice);
      return;
    }

    setLoading(true);
    fetch("/api/coach-advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled || !res.ok || typeof data.advice !== "string") return;
        setAdvice(data.advice);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ signature, advice: data.advice }));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return { advice, loading };
}
