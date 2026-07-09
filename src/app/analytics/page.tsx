"use client";

import { useState, type ChangeEvent } from "react";
import { useUserProfile } from "@/context/user-profile-context";
import { calculateFitnessMetrics } from "@/lib/fitness";
import { useMealLog, sumMeals } from "@/lib/meal-log";
import { ProgressRing } from "@/components/progress-ring";
import { MacroBar } from "@/components/macro-bar";

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
  const { profile } = useUserProfile();
  const metrics = calculateFitnessMetrics(
    profile.age,
    profile.gender,
    profile.weightKg,
    profile.heightCm,
    profile.goal
  );
  const { meals, addMeal, removeMeal } = useMealLog();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const consumed = sumMeals(meals);
  const remainingCalories = metrics.targetCalories - consumed.calories;
  const caloriePct = metrics.targetCalories > 0 ? (consumed.calories / metrics.targetCalories) * 100 : 0;

  const resetScan = () => {
    setPreviewUrl(null);
    setResult(null);
    setError(null);
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

  const handleAddToLog = () => {
    if (!result) return;
    addMeal({
      mealName: result.mealName,
      calories: result.totalCalories,
      proteinG: result.proteinG,
      fatG: result.fatG,
      carbG: result.carbG,
      items: result.items ?? [],
    });
    resetScan();
  };

  const resultMaxMacro = result ? Math.max(result.proteinG, result.fatG, result.carbG) : 0;

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

      {/* AI Food Scanner */}
      <section className="glass-card ai-accent-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-tertiary-fixed-dim">photo_camera</span>
          <h3 className="font-headline-md text-headline-md text-primary uppercase">AI Ovqat Skaneri</h3>
        </div>

        {!previewUrl && (
          <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-white/15 rounded-xl py-12 cursor-pointer hover:border-primary-fixed-dim/50 hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-5xl text-primary-fixed-dim">add_a_photo</span>
            <span className="font-body-md text-body-md text-on-surface-variant text-center px-4">
              Ovqat rasmini yuklang yoki suratga oling
            </span>
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
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

            {result && !scanning && (
              <div className="space-y-4 border-t border-white/10 pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-headline-md text-[20px] font-bold text-primary uppercase tracking-tight">
                      {result.mealName}
                    </h4>
                    {result.items?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {result.items.map((item, i) => (
                          <span key={i} className="font-label-mono text-[11px] bg-[#1a1a1a] border border-white/20 text-on-surface-variant px-2 py-1 rounded">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display-lg-mobile text-[32px] text-primary font-bold leading-none">
                      {result.totalCalories}
                    </div>
                    <div className="font-label-mono text-label-mono text-tertiary-fixed-dim">KCAL</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <MacroBar label="Oqsil" grams={result.proteinG} color="#abd600" max={resultMaxMacro} />
                  <MacroBar label="Yog'" grams={result.fatG} color="#ffb4ab" max={resultMaxMacro} />
                  <MacroBar label="Uglevod" grams={result.carbG} color="#00dbe9" max={resultMaxMacro} />
                </div>

                {result.note && (
                  <p className="font-body-md text-[14px] text-on-surface-variant">
                    <span className="material-symbols-outlined text-[14px] align-middle text-tertiary-fixed-dim mr-1">lightbulb</span>
                    {result.note}
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
                    Boshqa Rasm
                  </button>
                </div>
              </div>
            )}

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
                    <span className="material-symbols-outlined text-primary-fixed-dim">restaurant</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-body-md text-body-md text-on-surface truncate">{meal.mealName}</h4>
                    <p className="font-label-mono text-[10px] text-on-surface-variant uppercase">
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
    </div>
  );
}
