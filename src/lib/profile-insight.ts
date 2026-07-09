"use client";

import { useEffect, useState } from "react";
import type { Gender, Goal } from "@/context/user-profile-context";

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
export function useProfileInsight(params: InsightParams) {
  const [insight, setInsight] = useState<ProfileInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const signature = signatureOf(params.profile);

  useEffect(() => {
    let cancelled = false;
    const raw = localStorage.getItem(STORAGE_KEY);
    let cached: CachedInsight | null = null;
    if (raw) {
      try {
        cached = JSON.parse(raw);
      } catch {
        cached = null;
      }
    }

    if (cached && cached.signature === signature && typeof cached.analysis === "string" && Array.isArray(cached.tips)) {
      setInsight({ analysis: cached.analysis, tips: cached.tips });
      return;
    }

    setLoading(true);
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
        setInsight(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, signature }));
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

  return { insight, loading };
}
