"use client";

import { useEffect, useState } from "react";
import type { Goal } from "@/context/user-profile-context";
import type { CalibratedTdeeResult, WeightForecast } from "@/lib/forecast";

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

export function useAnalyticsForecast(params: AnalyticsForecastParams) {
  const [insight, setInsight] = useState<AnalyticsInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const signature = signatureOf(params);

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

    if (
      cached &&
      cached.signature === signature &&
      typeof cached.summary === "string" &&
      typeof cached.forecast === "string"
    ) {
      setInsight({ summary: cached.summary, forecast: cached.forecast, tips: cached.tips, warnings: cached.warnings });
      return;
    }

    setLoading(true);
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
