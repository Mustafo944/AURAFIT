"use client";

import { useEffect, useMemo, useState } from "react";
import type { Goal } from "@/context/user-profile-context";
import type { CalibratedTdeeResult, WeightForecast } from "@/lib/forecast";
import { useHydrated } from "@/lib/use-hydrated";

const STORAGE_KEY = "aurafit_analytics_forecast";

export interface AnalyticsInsight {
  summary: string;
  forecast: string;
  tips: string[];
  warnings: string[];
}

interface CachedInsight extends AnalyticsInsight {
  signature: string;
}

export interface AnalyticsForecastParams {
  goal: Goal;
  formulaTdee: number;
  calibratedTdee: CalibratedTdeeResult;
  weightForecast: WeightForecast;
  hasGoalDiscrepancy: boolean;
  weeklyActivity: { avgSessionsPerWeek: number; weeksTracked: number };
  muscleBalance: { muscleGroup: string; volumeKg: number }[];
}

// Sana kiritilgani uchun kunlik kamida bir marta yangilanadi (daily-advice.ts
// naqshida); shu bilan birga har qanday asosiy raqam (kalibrlangan TDEE, vazn
// trendi, haftalik faollik) o'zgarsa ham signatura o'zgaradi va AI qayta chaqiriladi.
function signatureOf(params: AnalyticsForecastParams) {
  return [
    new Date().toDateString(),
    params.goal,
    params.formulaTdee,
    params.calibratedTdee.status,
    params.calibratedTdee.status === "ok" ? params.calibratedTdee.calibratedTdee : "",
    params.weightForecast.status,
    params.weightForecast.status === "ok" ? params.weightForecast.slopeKgPerWeek : "",
    params.hasGoalDiscrepancy,
    params.weeklyActivity.avgSessionsPerWeek,
  ].join("|");
}

function readCachedInsight(signature: string): AnalyticsInsight | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const cached = JSON.parse(raw) as CachedInsight;
    if (cached.signature === signature && typeof cached.summary === "string" && typeof cached.forecast === "string") {
      return { summary: cached.summary, forecast: cached.forecast, tips: cached.tips, warnings: cached.warnings };
    }
    return null;
  } catch {
    return null;
  }
}

// `enabled=false` bo'lsa so'rov yuborilmaydi — vazn/mashg'ulot/ovqat tarixi
// Supabase'dan hali yuklanmagan paytda bo'sh ma'lumot bilan AI chaqirilib,
// kvota ikki barobar sarflanishining oldini oladi.
//
// Kesh (localStorage) render vaqtida o'qiladi (hydration'dan keyingina),
// `insight`/`loading` holatdan hisoblab chiqariladi — effect'da sync setState
// yo'q, kaskadli render bo'lmaydi (daily-advice.ts bilan bir xil naqsh).
export function useAnalyticsForecast(params: AnalyticsForecastParams, enabled = true) {
  const hydrated = useHydrated();
  const signature = signatureOf(params);
  const [fetched, setFetched] = useState<{ signature: string; insight: AnalyticsInsight } | null>(null);
  const [attemptedSignature, setAttemptedSignature] = useState<string | null>(null);

  const cachedInsight = useMemo(() => (hydrated ? readCachedInsight(signature) : null), [hydrated, signature]);
  const insight = cachedInsight ?? (fetched?.signature === signature ? fetched.insight : null);
  const loading = enabled && hydrated && insight === null && attemptedSignature !== signature;

  useEffect(() => {
    if (!enabled || !hydrated || insight !== null || attemptedSignature === signature) return;
    let cancelled = false;
    fetch("/api/analytics-forecast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled || !res.ok || typeof data.summary !== "string" || typeof data.forecast !== "string") return;
        const tips = Array.isArray(data.tips) ? data.tips.filter((t: unknown) => typeof t === "string") : [];
        const warnings = Array.isArray(data.warnings) ? data.warnings.filter((w: unknown) => typeof w === "string") : [];
        const next: AnalyticsInsight = { summary: data.summary, forecast: data.forecast, tips, warnings };
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
