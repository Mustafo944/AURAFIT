"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useUserProfile } from "@/context/user-profile-context";
import { calculateFitnessMetrics, GOAL_LABELS } from "@/lib/fitness";
import { useMealLog, useMealHistory, sumMeals, type MealType } from "@/lib/meal-log";
import { useWeightHistory } from "@/lib/weight-log";
import { useWorkoutHistory, getExerciseHistory } from "@/lib/workout-log";
import {
  weightForecast,
  weightGoalDiscrepancy,
  calibrateTDEE,
  weeklyWorkoutFrequency,
  exerciseProgressionTrend,
  muscleGroupVolumeBalance,
} from "@/lib/forecast";
import { useAnalyticsForecast } from "@/lib/analytics-forecast";
import { ProgressRing } from "@/components/progress-ring";
import { MacroBar } from "@/components/macro-bar";
import { TrendLineChart } from "@/components/trend-line-chart";
import { WeeklyActivityChart } from "@/components/weekly-activity-chart";
import { BarcodeScanner } from "@/components/barcode-scanner";

const UZ_MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];

// Nonushta/Tushlik/Kechki ovqat kunning ma'lum vaqtiga tavsiya etiladi, Perekus
// esa istalgan payt qo'shilishi mumkin — shu sabab alohida vaqt oralig'i yo'q.
// Tavsiya etilgan kaloriya kunlik maqsadning taxminiy ulushidan hisoblanadi.
const MEAL_TYPES: Array<{ type: MealType; label: string; dativeLabel: string; icon: string; split: number }> = [
  { type: "breakfast", label: "Nonushta", dativeLabel: "Nonushtaga", icon: "free_breakfast", split: 0.25 },
  { type: "lunch", label: "Tushlik", dativeLabel: "Tushlikka", icon: "lunch_dining", split: 0.35 },
  { type: "dinner", label: "Kechki ovqat", dativeLabel: "Kechki ovqatga", icon: "dinner_dining", split: 0.3 },
  { type: "snack", label: "Perekus", dativeLabel: "Perekusga", icon: "cookie", split: 0.1 },
];

function formatDateLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}-${UZ_MONTHS_SHORT[d.getMonth()]}`;
}

interface ScanResult {
  mealName: string;
  items: string[];
  totalCalories: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  note: string;
}

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ base64: result.split(",")[1] ?? "", mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AnalyticsPage() {
  const { profile, loading: profileLoading } = useUserProfile();
  const metrics = calculateFitnessMetrics(
    profile.age,
    profile.gender,
    profile.weightKg,
    profile.heightCm,
    profile.goal
  );
  const { meals, addMeal, removeMeal } = useMealLog();

  const [activeMealType, setActiveMealType] = useState<MealType | null>(null);
  const consumedByType = useMemo(() => {
    const totals: Record<MealType, number> = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
    for (const meal of meals) totals[meal.mealType] += meal.calories;
    return totals;
  }, [meals]);

  const [scanMode, setScanMode] = useState<"photo" | "barcode">("photo");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  // Barkod natijasi 100g uchun keladi — mahsulotning umumiy og'irligi
  // (topilsa) shu bilan birga saqlanadi, "necha foizini yedingiz" hisobi
  // shunga tayanadi. Rasm-skaner uchun bazasi to'g'ridan-to'g'ri AI natijasi.
  const [isPer100g, setIsPer100g] = useState(false);
  const [packageGrams, setPackageGrams] = useState<number | null>(null);
  // Aniqlangan/topilgan taomning necha foizini haqiqatan yeganingiz — standart
  // 100% ("kirgizmasam hammasini yedim degani"), kamroq yesangiz pasaytirasiz.
  const [eatenPct, setEatenPct] = useState("100");
  const [error, setError] = useState<string | null>(null);

  const consumed = sumMeals(meals);
  const remainingCalories = metrics.targetCalories - consumed.calories;
  const caloriePct = metrics.targetCalories > 0 ? (consumed.calories / metrics.targetCalories) * 100 : 0;

  // ==========================================================================
  // Aqlli Tahlil — vazn dinamikasi, haftalik faollik, kuch progressi va
  // formula/kalibrlangan TDEE'ni birlashtiruvchi bo'limlar uchun ma'lumotlar.
  // ==========================================================================
  const { entries: weightEntries, loading: weightsLoading, addWeightEntry } = useWeightHistory();
  const { sessions, loading: sessionsLoading } = useWorkoutHistory();
  const { meals: mealHistory, loading: mealHistoryLoading } = useMealHistory(30);

  const wForecast = weightForecast(weightEntries, profile.targetWeightKg);
  const weightDiscrepancy =
    wForecast.status === "ok" ? weightGoalDiscrepancy(wForecast.slopeKgPerWeek!, profile.goal) : false;
  const tdeeCalibration = calibrateTDEE(weightEntries, mealHistory, metrics.tdee);

  const weightChartPoints = weightEntries.map((e) => ({
    id: e.id,
    dateLabel: formatDateLabel(e.loggedAt),
    value: e.weightKg,
  }));
  const weightForecastPoints =
    wForecast.status === "ok" ? [{ id: "weight-forecast-30", dateLabel: "+30 kun", value: wForecast.projectedIn30DaysKg! }] : [];

  const [weightInput, setWeightInput] = useState("");
  const handleLogWeight = () => {
    const value = Number(weightInput);
    if (!(value > 0)) return;
    addWeightEntry(value);
    setWeightInput("");
  };

  const weeklyActivity = useMemo(() => weeklyWorkoutFrequency(sessions), [sessions]);
  const avgSessionsPerWeek =
    weeklyActivity.length > 0
      ? Math.round((weeklyActivity.reduce((s, w) => s + w.count, 0) / weeklyActivity.length) * 10) / 10
      : 0;
  const muscleBalance = useMemo(() => muscleGroupVolumeBalance(sessions, 30), [sessions]);

  const performedExercises = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sessions) {
      for (const ex of s.exercises) {
        if (!map.has(ex.exerciseId)) map.set(ex.exerciseId, ex.exerciseName);
      }
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [sessions]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const activeExerciseId = selectedExerciseId ?? performedExercises[0]?.id ?? null;
  const exerciseHistory = activeExerciseId ? getExerciseHistory(sessions, activeExerciseId) : [];
  const exerciseTrend = exerciseProgressionTrend(exerciseHistory);
  const exerciseChartPoints = [...exerciseHistory].reverse().map((h) => ({
    id: h.finishedAt,
    dateLabel: formatDateLabel(h.finishedAt),
    value: h.bestSet.weightKg,
  }));
  const exerciseForecastPoints =
    exerciseTrend.status === "ok"
      ? [{ id: "exercise-forecast-4w", dateLabel: "+4 hafta", value: exerciseTrend.projectedIn4WeeksKg! }]
      : [];

  const { insight: forecastInsight, loading: forecastLoading } = useAnalyticsForecast({
    goal: profile.goal,
    formulaTdee: metrics.tdee,
    calibratedTdee: tdeeCalibration,
    weightForecast: wForecast,
    hasGoalDiscrepancy: weightDiscrepancy,
    weeklyActivity: { avgSessionsPerWeek, weeksTracked: weeklyActivity.length },
    muscleBalance: muscleBalance.slice(0, 4),
    // Barcha manba ma'lumotlar (profil, vazn, mashg'ulot, ovqat tarixi)
    // yuklanmaguncha AI chaqirilmaydi — bo'sh ma'lumot bilan ortiqcha
    // so'rov ketmasligi uchun.
  }, !profileLoading && !weightsLoading && !sessionsLoading && !mealHistoryLoading);

  const resetScan = () => {
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setIsPer100g(false);
    setPackageGrams(null);
    setEatenPct("100");
  };

  const handleBarcodeDetected = async (code: string) => {
    setBarcodeLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lookup-barcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xatolik yuz berdi.");
      } else {
        setResult(data);
        setIsPer100g(true);
        setPackageGrams(typeof data.packageGrams === "number" ? data.packageGrams : null);
      }
    } catch {
      setError("Tarmoq xatosi yuz berdi.");
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (scanning) return;
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setScanning(true);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const res = await fetch("/api/scan-food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xatolik yuz berdi.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Tarmoq xatosi yuz berdi.");
    } finally {
      setScanning(false);
    }
  };

  // "Necha foizini yedingiz" — standart 100% ("kirgizmasam hammasini yedim
  // degani"). Barkod natijasi avval 100g bazadan mahsulotning umumiy
  // og'irligiga (topilsa) ko'tariladi, keyin ikkalasi ham shu foizga
  // qisqartiriladi. Rasm-skaner uchun baza AI'ning to'liq taom bahosi.
  const eatenFraction = Math.max(0, Math.min(100, Number(eatenPct) || 0)) / 100;
  const scaleToPackage = (value: number) => (isPer100g && packageGrams ? (value * packageGrams) / 100 : value);
  const displayResult: ScanResult | null = result && {
    ...result,
    totalCalories: Math.round(scaleToPackage(result.totalCalories) * eatenFraction),
    proteinG: Math.round(scaleToPackage(result.proteinG) * eatenFraction),
    fatG: Math.round(scaleToPackage(result.fatG) * eatenFraction),
    carbG: Math.round(scaleToPackage(result.carbG) * eatenFraction),
  };
  const eatenGramsHint = isPer100g && packageGrams ? Math.round(packageGrams * eatenFraction) : null;

  const handleAddToLog = () => {
    if (!displayResult || !activeMealType) return;
    addMeal({
      mealName: displayResult.mealName,
      mealType: activeMealType,
      calories: displayResult.totalCalories,
      proteinG: displayResult.proteinG,
      fatG: displayResult.fatG,
      carbG: displayResult.carbG,
      items: displayResult.items ?? [],
    });
    resetScan();
    setActiveMealType(null);
  };

  const resultMaxMacro = displayResult ? Math.max(displayResult.proteinG, displayResult.fatG, displayResult.carbG) : 0;

  // Rasm-skaner va barkod-skaner bir xil tasdiqlash/jurnalga-qo'shish
  // ekranidan foydalanadi — dublikat komponent yozilmaydi.
  const resultCard = displayResult && (
    <div className="space-y-4 border-t border-white/10 pt-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="font-headline-md text-[20px] font-bold text-primary uppercase tracking-tight">
            {displayResult.mealName}
          </h4>
          {displayResult.items?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {displayResult.items.map((item, i) => (
                <span key={i} className="font-label-mono text-[11px] bg-[#1a1a1a] border border-white/20 text-on-surface-variant px-2 py-1 rounded">
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-display-lg-mobile text-[32px] text-primary font-bold leading-none">
            {displayResult.totalCalories}
          </div>
          <div className="font-label-mono text-label-mono text-tertiary-fixed-dim">KCAL</div>
        </div>
      </div>

      <div>
        <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2">
          NECHA FOIZINI YEDINGIZ?
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={100}
            value={eatenPct}
            onChange={(e) => setEatenPct(e.target.value)}
            className="w-24 bg-black/40 border border-white/10 rounded px-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none"
          />
          <span className="font-label-mono text-label-mono text-on-surface-variant">%</span>
          {eatenGramsHint != null && (
            <span className="font-label-mono text-[11px] text-on-surface-variant ml-auto whitespace-nowrap">
              &asymp; {eatenGramsHint}g / {packageGrams}g
            </span>
          )}
        </div>
        <p className="font-label-mono text-[10px] text-on-surface-variant/70 mt-1.5">
          Hammasini yegan bo&apos;lsangiz 100% qoldiring — bo&apos;lak qoldirgan bo&apos;lsangiz kamaytiring.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MacroBar label="Oqsil" grams={displayResult.proteinG} color="#abd600" max={resultMaxMacro} />
        <MacroBar label="Yog'" grams={displayResult.fatG} color="#ffb4ab" max={resultMaxMacro} />
        <MacroBar label="Uglevod" grams={displayResult.carbG} color="#00dbe9" max={resultMaxMacro} />
      </div>

      {displayResult.note && (
        <p className="font-body-md text-[14px] text-on-surface-variant">
          <span className="material-symbols-outlined text-[14px] align-middle text-tertiary-fixed-dim mr-1">lightbulb</span>
          {displayResult.note}
        </p>
      )}

      <div className="flex flex-col md:flex-row gap-3 pt-2">
        <button
          onClick={handleAddToLog}
          className="flex-1 bg-primary-container text-on-primary-container font-headline-md text-sm px-6 py-3 rounded-lg uppercase tracking-wider glow-button hover:bg-primary-fixed transition-colors"
        >
          Jurnalga Qo&apos;shish
        </button>
        <button
          onClick={resetScan}
          className="px-6 py-3 rounded-lg bg-white/5 text-on-surface-variant border border-white/10 hover:bg-white/10 transition-colors font-label-mono text-label-mono"
        >
          {scanMode === "photo" ? "Boshqa Rasm" : "Boshqa Mahsulot"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-stack-lg">
      {/* Header Section */}
      <div>
        <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary uppercase italic mb-2">
          OVQATLANISH TAHLILI
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Taomingiz rasmini yuklang &mdash; AI kaloriya va oziq moddalarni avtomatik hisoblab beradi.
        </p>
      </div>

      {/* Today's Summary */}
      <section className="glass-card rounded-xl p-6 relative overflow-hidden glow-button border-l-[3px] border-l-primary-fixed-dim">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary-fixed-dim/10 rounded-full blur-2xl" />
        <h3 className="font-headline-md text-headline-md text-primary uppercase italic mb-stack-sm flex items-center gap-2 relative z-10">
          <span className="material-symbols-outlined text-primary-fixed-dim">data_usage</span> Bugungi Ovqatlanish
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
          <div className="md:col-span-4 flex items-center gap-6 border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-6">
            <ProgressRing percentage={caloriePct} color="#abd600" glowColor="rgba(171,214,0,0.5)" />
            <div>
              <div className="font-display-lg-mobile text-display-lg-mobile text-primary font-bold">{consumed.calories}</div>
              <div className="font-label-mono text-label-mono text-on-surface-variant">
                / {metrics.targetCalories} KCAL MAQSAD
              </div>
              <div className="font-label-mono text-label-mono text-tertiary-fixed-dim mt-1">
                {remainingCalories >= 0 ? `${remainingCalories} KCAL QOLDI` : `${Math.abs(remainingCalories)} KCAL ORTIQCHA`}
              </div>
            </div>
          </div>

          <div className="md:col-span-8 space-y-3">
            <MacroBar label="Oqsil" grams={consumed.proteinG} max={metrics.proteinG} color="#abd600" rightLabel={`${consumed.proteinG}g / ${metrics.proteinG}g`} />
            <MacroBar label="Yog'" grams={consumed.fatG} max={metrics.fatG} color="#ffb4ab" rightLabel={`${consumed.fatG}g / ${metrics.fatG}g`} />
            <MacroBar label="Uglevod" grams={consumed.carbG} max={metrics.carbG} color="#00dbe9" rightLabel={`${consumed.carbG}g / ${metrics.carbG}g`} />
          </div>
        </div>
      </section>

      {/* Ovqat Qo'shish */}
      <section>
        <h3 className="font-headline-md text-headline-md text-primary uppercase italic mb-stack-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-fixed-dim">restaurant_menu</span> Ovqat Qo&apos;shish
        </h3>

        {activeMealType === null ? (
          <div className="space-y-3">
            {MEAL_TYPES.map(({ type, label, icon, split }) => {
              const target = Math.round(metrics.targetCalories * split);
              const eaten = consumedByType[type];
              return (
                <button
                  key={type}
                  onClick={() => {
                    resetScan();
                    setActiveMealType(type);
                  }}
                  className="w-full glass-card rounded-xl p-4 flex items-center justify-between gap-4 border border-transparent hover:border-primary-fixed-dim/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-primary-fixed-dim/10 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary-fixed-dim text-[26px]">{icon}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-headline-md text-[17px] text-primary font-bold truncate">{label}</h4>
                      <p className="font-label-mono text-[11px] text-on-surface-variant uppercase truncate">
                        {eaten > 0 ? `${eaten} / ${target} kkal` : `Tavsiya etiladi: ${target} kkal`}
                      </p>
                    </div>
                  </div>
                  <span className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 glow-button">
                    <span className="material-symbols-outlined text-[22px]">add</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="glass-card ai-accent-border rounded-xl p-6">
            <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setActiveMealType(null);
                    resetScan();
                  }}
                  aria-label="Orqaga"
                  className="text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h3 className="font-headline-md text-headline-md text-primary uppercase">
                  {MEAL_TYPES.find((m) => m.type === activeMealType)?.dativeLabel} Qo&apos;shish
                </h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setScanMode("photo");
                    resetScan();
                  }}
                  className={`px-4 py-2 rounded-lg font-label-mono text-label-mono uppercase transition-colors ${
                    scanMode === "photo"
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-white/5 text-on-surface-variant border border-white/10 hover:bg-white/10"
                  }`}
                >
                  Rasm
                </button>
                <button
                  onClick={() => {
                    setScanMode("barcode");
                    resetScan();
                  }}
                  className={`px-4 py-2 rounded-lg font-label-mono text-label-mono uppercase transition-colors ${
                    scanMode === "barcode"
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-white/5 text-on-surface-variant border border-white/10 hover:bg-white/10"
                  }`}
                >
                  Barkod / QR
                </button>
              </div>
            </div>

            {scanMode === "photo" ? (
              <>
                {!previewUrl && (
                  <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/15 rounded-xl py-12 cursor-pointer hover:border-primary-fixed-dim/50 hover:bg-white/5 transition-colors">
                    <span className="material-symbols-outlined text-5xl text-primary-fixed-dim">add_a_photo</span>
                    <span className="font-body-md text-body-md text-on-surface-variant text-center px-4">
                      Ovqat rasmini yuklang yoki suratga oling
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                )}

                {previewUrl && (
                  <div className="space-y-4">
                    <div className="relative rounded-xl overflow-hidden h-56">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} className="w-full h-full object-cover" alt="Tanlangan ovqat" />
                      {scanning && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                          <span className="material-symbols-outlined text-4xl text-primary-fixed-dim animate-spin">progress_activity</span>
                          <span className="font-label-mono text-label-mono text-primary-fixed-dim uppercase tracking-widest">
                            AI Tahlil Qilmoqda...
                          </span>
                        </div>
                      )}
                    </div>

                    {error && (
                      <p className="font-body-md text-body-md text-error border border-error/30 bg-error/10 rounded-lg px-4 py-3">
                        {error}
                      </p>
                    )}

                    {!scanning && resultCard}

                    {!result && !scanning && (
                      <button
                        onClick={resetScan}
                        className="w-full px-6 py-3 rounded-lg bg-white/5 text-on-surface-variant border border-white/10 hover:bg-white/10 transition-colors font-label-mono text-label-mono"
                      >
                        Boshqa Rasm
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                {!result && !barcodeLoading && !error && (
                  <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setScanMode("photo")} />
                )}

                {barcodeLoading && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <span className="material-symbols-outlined text-4xl text-primary-fixed-dim animate-spin">progress_activity</span>
                    <span className="font-label-mono text-label-mono text-primary-fixed-dim uppercase tracking-widest">
                      Mahsulot Qidirilmoqda...
                    </span>
                  </div>
                )}

                {error && (
                  <div className="space-y-3">
                    <p className="font-body-md text-body-md text-error border border-error/30 bg-error/10 rounded-lg px-4 py-3">
                      {error}
                    </p>
                    <button
                      onClick={() => setError(null)}
                      className="w-full px-6 py-3 rounded-lg bg-white/5 text-on-surface-variant border border-white/10 hover:bg-white/10 transition-colors font-label-mono text-label-mono"
                    >
                      Qayta Urinish
                    </button>
                  </div>
                )}

                {resultCard}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Today's Meal History */}
      <section>
        <h3 className="font-headline-md text-headline-md text-primary uppercase italic mb-stack-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-fixed-dim">history</span> Bugungi Taomlar
        </h3>
        {meals.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Hali hech narsa skanerlanmagan. Yuqoridan ovqat rasmini yuklang!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {meals.map((meal) => (
              <div key={meal.id} className="glass-card rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary-fixed-dim/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary-fixed-dim">
                      {MEAL_TYPES.find((m) => m.type === meal.mealType)?.icon ?? "restaurant"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-body-md text-body-md text-on-surface truncate">{meal.mealName}</h4>
                    <p className="font-label-mono text-[10px] text-on-surface-variant uppercase">
                      {MEAL_TYPES.find((m) => m.type === meal.mealType)?.label ?? "Ovqat"}
                      {" · "}
                      {new Date(meal.timestamp).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}O {meal.proteinG}g &middot; Y {meal.fatG}g &middot; U {meal.carbG}g
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-headline-md text-[18px] font-bold text-primary">{meal.calories}</div>
                    <div className="font-label-mono text-[9px] text-on-surface-variant uppercase">Kcal</div>
                  </div>
                  <button
                    onClick={() => removeMeal(meal.id)}
                    aria-label="O'chirish"
                    className="text-on-surface-variant hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Vazn Dinamikasi */}
      <section className="glass-card ai-accent-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
          <span className="material-symbols-outlined text-primary-fixed-dim">monitor_weight</span>
          <h3 className="font-headline-md text-headline-md text-primary uppercase">Vazn Dinamikasi</h3>
        </div>

        <TrendLineChart
          label="Vazn (kg)"
          unit=" kg"
          points={weightChartPoints}
          forecastPoints={weightForecastPoints}
          emptyMessage="Trend va prognozni ko'rish uchun yana kamida 2 marta vazningizni qayd eting."
        />

        {wForecast.status === "ok" && (
          <p className="font-body-md text-[13px] text-on-surface-variant mt-4">
            Haftasiga {wForecast.slopeKgPerWeek! > 0 ? "+" : ""}
            {wForecast.slopeKgPerWeek} kg &middot; 30 kundan keyin taxminan {wForecast.projectedIn30DaysKg} kg
            {profile.targetWeightKg != null &&
              (wForecast.etaToGoalDays != null
                ? ` · Maqsad (${profile.targetWeightKg} kg)gacha taxminan ${wForecast.etaToGoalDays} kun`
                : ` · Joriy trend maqsad vazningiz (${profile.targetWeightKg} kg) tomon emas`)}
          </p>
        )}

        {weightDiscrepancy && (
          <div className="flex items-start gap-2 border border-error/30 bg-error/10 rounded-lg px-4 py-3 mt-4">
            <span className="material-symbols-outlined text-error text-[18px] mt-0.5">warning</span>
            <p className="font-body-md text-[13px] text-error">
              Vazn trendi maqsadingizga ({GOAL_LABELS[profile.goal]}) zid yo&apos;nalishda ketmoqda.
            </p>
          </div>
        )}

        <div className="flex items-end gap-3 mt-6 pt-4 border-t border-white/10">
          <div className="flex-1">
            <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2">
              JORIY VAZNNI QAYD ETISH (KG)
            </label>
            <input
              type="number"
              min={30}
              max={300}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder={String(profile.weightKg)}
              className="w-full bg-black/40 border border-white/10 rounded px-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none"
            />
          </div>
          <button
            onClick={handleLogWeight}
            className="px-6 py-3 rounded-lg bg-primary-container text-on-primary-container font-headline-md text-sm uppercase tracking-wider glow-button hover:bg-primary-fixed transition-colors"
          >
            Qayd Etish
          </button>
        </div>
      </section>

      {/* Haftalik Faollik */}
      <section className="glass-card ai-accent-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
          <span className="material-symbols-outlined text-tertiary-fixed-dim">calendar_month</span>
          <h3 className="font-headline-md text-headline-md text-primary uppercase">Haftalik Faollik</h3>
        </div>
        <WeeklyActivityChart points={weeklyActivity} />
        {weeklyActivity.length > 1 && (
          <p className="font-body-md text-[13px] text-on-surface-variant mt-4">
            O&apos;rtacha {avgSessionsPerWeek} mashg&apos;ulot/hafta (so&apos;nggi {weeklyActivity.length} hafta)
          </p>
        )}
      </section>

      {/* Kuch Progressi */}
      <section className="glass-card ai-accent-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
          <span className="material-symbols-outlined text-primary-fixed-dim">trending_up</span>
          <h3 className="font-headline-md text-headline-md text-primary uppercase">Kuch Progressi</h3>
        </div>

        {performedExercises.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">
            Hali hech qanday mashq bajarilmagan. Mashg&apos;ulot yakunlagach, progressni shu yerda kuzatasiz.
          </p>
        ) : (
          <>
            <select
              value={activeExerciseId ?? ""}
              onChange={(e) => setSelectedExerciseId(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded px-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none mb-6"
            >
              {performedExercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>

            <TrendLineChart
              label="Eng Og'ir Podxod (kg)"
              unit=" kg"
              points={exerciseChartPoints}
              forecastPoints={exerciseForecastPoints}
              emptyMessage="Trendni ko'rish uchun bu mashqni yana kamida 2 marta bajaring."
            />

            {exerciseTrend.status === "ok" && (
              <p className="font-body-md text-[13px] text-on-surface-variant mt-4">
                Haftasiga {exerciseTrend.slopeKgPerWeek! > 0 ? "+" : ""}
                {exerciseTrend.slopeKgPerWeek} kg &middot; 4 haftadan keyin taxminan {exerciseTrend.projectedIn4WeeksKg} kg
              </p>
            )}
          </>
        )}
      </section>

      {/* Aqlli Tahlil */}
      <section className="glass-card ai-accent-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
          <span className="material-symbols-outlined text-tertiary-fixed-dim">auto_awesome</span>
          <h3 className="font-headline-md text-headline-md text-primary uppercase">Aqlli Tahlil</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-4 md:border-r border-white/10 md:pr-6">
            <div className="text-center md:text-left">
              <div className="font-headline-md text-[22px] text-primary font-bold">{metrics.tdee}</div>
              <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">Formula TDEE</div>
            </div>
            <div className="text-center md:text-left">
              <div className="font-headline-md text-[22px] text-primary font-bold">
                {tdeeCalibration.status === "ok" ? tdeeCalibration.calibratedTdee : "—"}
              </div>
              <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">
                Kalibrlangan TDEE
                {tdeeCalibration.status === "ok" && (tdeeCalibration.confidence === "high" ? " (yuqori ishonch)" : " (o'rta ishonch)")}
              </div>
            </div>
            {tdeeCalibration.status === "insufficient" && (
              <p className="font-body-md text-[12px] text-on-surface-variant col-span-2 md:col-span-1">
                Yana {Math.max(0, 5 - tdeeCalibration.weightDataPoints)} ta vazn yozuvi va{" "}
                {Math.max(0, 7 - tdeeCalibration.mealDataDays)} kun ovqat ma&apos;lumoti kalibrlash uchun kerak.
              </p>
            )}
          </div>

          <div className="md:col-span-8">
            {forecastLoading && !forecastInsight && (
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                <span className="font-label-mono text-label-mono uppercase tracking-widest">AI tahlil qilmoqda...</span>
              </div>
            )}
            {forecastInsight && (
              <div className="space-y-3">
                <p className="font-body-md text-body-md text-on-surface">{forecastInsight.summary}</p>
                <p className="font-body-md text-[14px] text-tertiary-fixed-dim">{forecastInsight.forecast}</p>
                {forecastInsight.warnings.length > 0 && (
                  <ul className="space-y-2">
                    {forecastInsight.warnings.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 font-body-md text-[14px] text-error">
                        <span className="material-symbols-outlined text-error text-[16px] mt-0.5">warning</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {forecastInsight.tips.length > 0 && (
                  <ul className="space-y-2">
                    {forecastInsight.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 font-body-md text-[14px] text-on-surface-variant">
                        <span className="material-symbols-outlined text-tertiary-fixed-dim text-[16px] mt-0.5">check_circle</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {!forecastLoading && !forecastInsight && (
              <p className="font-body-md text-body-md text-on-surface-variant">
                Tahlil hozircha mavjud emas. Vazn va mashg&apos;ulot ma&apos;lumotlaringizni to&apos;plab, birozdan so&apos;ng qayta tekshiring.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
