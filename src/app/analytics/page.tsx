"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useUserProfile } from "@/context/user-profile-context";
import { calculateFitnessMetrics } from "@/lib/fitness";
import { useMealLog, sumMeals, type MealType } from "@/lib/meal-log";
import { useWorkoutHistory } from "@/lib/workout-log";
import { weeklyWorkoutFrequency } from "@/lib/forecast";
import { ProgressRing } from "@/components/progress-ring";
import { MacroBar } from "@/components/macro-bar";
import { WeeklyActivityChart } from "@/components/weekly-activity-chart";
import { BarcodeScanner } from "@/components/barcode-scanner";

// Nonushta/Tushlik/Kechki ovqat kunning ma'lum vaqtiga tavsiya etiladi,
// Qo'shimcha taom esa istalgan payt qo'shilishi mumkin — shu sabab alohida
// vaqt oralig'i yo'q. Tavsiya etilgan kaloriya kunlik maqsadning taxminiy
// ulushidan hisoblanadi.
const MEAL_TYPES: Array<{ type: MealType; label: string; dativeLabel: string; icon: string; split: number }> = [
  { type: "breakfast", label: "Nonushta", dativeLabel: "Nonushtaga", icon: "free_breakfast", split: 0.25 },
  { type: "lunch", label: "Tushlik", dativeLabel: "Tushlikka", icon: "lunch_dining", split: 0.35 },
  { type: "dinner", label: "Kechki ovqat", dativeLabel: "Kechki ovqatga", icon: "dinner_dining", split: 0.3 },
  { type: "snack", label: "Qo'shimcha taom", dativeLabel: "Qo'shimcha taomga", icon: "cookie", split: 0.1 },
];

// Qo'shimcha taom oxirida alohida tugma orqali xohlagancha qo'shilishi mumkin
const MEAL_CARD_ORDER: MealType[] = ["breakfast", "lunch", "dinner"];

/**
 * Kunlik suv iste'moli tavsiyasi — ilmiy tadqiqotlarga asoslangan.
 *
 * Asosiy formula (IOM / EFSA yo'riqnomasi):
 *   Bazaviy ehtiyoj = tana vazni (kg) × 35 ml/kg
 *   (Voyaga yetganlar uchun tana vazni har kg ga 30–40 ml suv, o'rtacha 35 ml)
 *
 * Yosh bo'yicha tuzatish (EFSA 2010, IOM 2004):
 *   - 18 dan kichik: ×1.1 (o'smir organizmning suv ehtiyoji yuqoriroq)
 *   - 18–30 yosh: ×1.0 (eng faol davr, bazaviy daraja)
 *   - 31–55 yosh: ×0.95 (moddalar almashinuvi biroz sekinlashadi)
 *   - 55+ yosh: ×0.90 (buyrak funksiyasi pasayishi, lekin suv hali ham muhim)
 *
 * Manbalar:
 *   - EFSA Journal 2010;8(3):1459 — "Scientific Opinion on Dietary Reference
 *     Values for water"
 *   - IOM (2004) — "Dietary Reference Intakes for Water, Potassium, Sodium,
 *     Chloride, and Sulfate"
 *   - Popkin B.M., D'Anci K.E., Rosenberg I.H. (2010) — "Water, Hydration
 *     and Health" Nutrition Reviews 68(8):439–458
 */
function calculateWaterIntake(weightKg: number, age: number): { liters: number; glasses: number; note: string } {
  // Bazaviy: 35 ml per kg (IOM / EFSA o'rtacha tavsiya)
  let mlPerDay = weightKg * 35;

  // Yoshga qarab tuzatish koeffitsiyenti
  let ageFactor: number;
  let ageNote: string;
  if (age < 18) {
    ageFactor = 1.1;
    ageNote = "O'smir organizmi tez o'sadi — hujayra bo'linishi va gormonlar ishlab chiqarishi uchun ko'proq suv talab qilinadi (EFSA, 2010).";
  } else if (age <= 30) {
    ageFactor = 1.0;
    ageNote = "Eng faol yosh davri — mushak massasi yuqori, moddalar almashinuvi tez ishlaydi, shuning uchun standart suv me'yori yetarli (IOM, 2004).";
  } else if (age <= 55) {
    ageFactor = 0.95;
    ageNote = "30 yoshdan keyin har 10 yilda mushak massasi 3–5% kamayadi, gormonlar (testosteron, estrogen) darajasi tushadi — natijada moddalar almashinuvi sekinlashib, suv ehtiyoji biroz pasayadi (Popkin et al., 2010).";
  } else {
    ageFactor = 0.90;
    ageNote = "55 yoshdan keyin buyrak filtratsiya tezligi pasayadi va tashnalik hissini boshqaruvchi gipotalamus sezgirligi kamayadi — shuning uchun tashnalik sezilmasa ham muntazam suv ichish muhim (IOM, 2004).";
  }

  mlPerDay *= ageFactor;

  const liters = Math.round(mlPerDay / 100) / 10; // 1 xonali kasr
  const glasses = Math.round(mlPerDay / 250); // 250ml = 1 stakan

  return { liters, glasses, note: ageNote };
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
  const { profile } = useUserProfile();
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

  // Haftalik Faollik bo'limi uchun — mashg'ulot tarixidan haftalik chastota.
  const { sessions } = useWorkoutHistory();
  const weeklyActivity = useMemo(() => weeklyWorkoutFrequency(sessions), [sessions]);
  const avgSessionsPerWeek =
    weeklyActivity.length > 0
      ? Math.round((weeklyActivity.reduce((s, w) => s + w.count, 0) / weeklyActivity.length) * 10) / 10
      : 0;

  // Suv iste'moli tavsiyasi — vazn va yoshga qarab dinamik hisoblanadi
  const waterIntake = useMemo(
    () => calculateWaterIntake(profile.weightKg, profile.age),
    [profile.weightKg, profile.age]
  );

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
            {MEAL_CARD_ORDER.map((type, idx) => {
              const { label, icon, split } = MEAL_TYPES.find((m) => m.type === type)!;
              const target = Math.round(metrics.targetCalories * split);
              const eaten = consumedByType[type];
              return (
                <button
                  key={`${type}-${idx}`}
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

            {/* Qo'shimcha taom tugmasi */}
            {(() => {
              const { label, icon, split } = MEAL_TYPES.find((m) => m.type === "snack")!;
              const target = Math.round(metrics.targetCalories * split);
              const eaten = consumedByType["snack"];
              return (
                <button
                  onClick={() => {
                    resetScan();
                    setActiveMealType("snack");
                  }}
                  className="w-full glass-card rounded-xl p-4 flex items-center justify-between gap-4 border border-primary-fixed-dim/30 bg-primary-fixed-dim/5 hover:bg-primary-fixed-dim/10 hover:border-primary-fixed-dim/60 transition-colors text-left mt-2"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-primary-fixed-dim/20 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary-fixed-dim text-[26px]">{icon}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-headline-md text-[17px] text-primary font-bold truncate">Qo&apos;shimcha taom</h4>
                      <p className="font-label-mono text-[11px] text-on-surface-variant uppercase truncate">
                        {eaten > 0 ? `${eaten} / ${target} kkal` : `Istalgancha qo'shishingiz mumkin`}
                      </p>
                    </div>
                  </div>
                  <span className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 glow-button">
                    <span className="material-symbols-outlined text-[22px]">add</span>
                  </span>
                </button>
              );
            })()}
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
                  Shtrix Kod
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
                    <div className="flex flex-col md:flex-row gap-3">
                      <button
                        onClick={() => setError(null)}
                        className="flex-1 px-6 py-3 rounded-lg bg-white/5 text-on-surface-variant border border-white/10 hover:bg-white/10 transition-colors font-label-mono text-label-mono"
                      >
                        Qayta Urinish
                      </button>
                      <button
                        onClick={() => {
                          setScanMode("photo");
                          resetScan();
                        }}
                        className="flex-1 px-6 py-3 rounded-lg bg-primary-container text-on-primary-container font-label-mono text-label-mono hover:bg-primary-fixed transition-colors"
                      >
                        Rasm Orqali Urinish
                      </button>
                    </div>
                  </div>
                )}

                {resultCard}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Suv Iste'moli Tavsiyasi */}
      <section className="glass-card ai-accent-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-4">
          <span className="text-[24px]">💧</span>
          <h3 className="font-headline-md text-headline-md text-primary uppercase">Suv Iste&apos;moli</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {/* Kunlik norma */}
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-[18px]">🥤</span>
              <span className="font-label-mono text-[11px] text-on-surface-variant uppercase">Kunlik norma</span>
            </div>
            <div className="font-headline-md text-[28px] font-bold" style={{ color: '#00bcd4' }}>
              {waterIntake.liters} L
            </div>
            <div className="font-label-mono text-[11px] text-on-surface-variant mt-1">
              {waterIntake.glasses} stakan (250 ml)
            </div>
          </div>

          {/* Vazn asosida */}
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-[18px]">⚖️</span>
              <span className="font-label-mono text-[11px] text-on-surface-variant uppercase">Vazningiz</span>
            </div>
            <div className="font-headline-md text-[24px] font-bold text-primary">
              {profile.weightKg} kg
            </div>
            <div className="font-label-mono text-[11px] text-on-surface-variant mt-1">
              35 ml × {profile.weightKg} kg
            </div>
          </div>

          {/* Yosh asosida */}
          <div className="bg-white/5 rounded-xl p-4 text-center border border-white/5">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-[18px]">🎂</span>
              <span className="font-label-mono text-[11px] text-on-surface-variant uppercase">Yoshingiz</span>
            </div>
            <div className="font-headline-md text-[24px] font-bold text-tertiary-fixed-dim">
              {profile.age} yosh
            </div>
            <div className="font-label-mono text-[11px] text-on-surface-variant mt-1">
              Yosh koeffitsiyenti: ×{profile.age < 18 ? '1.1' : profile.age <= 30 ? '1.0' : profile.age <= 55 ? '0.95' : '0.90'}
            </div>
          </div>
        </div>

        {/* Ilmiy izoh */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
          <div className="flex items-start gap-3">
            <span className="text-[16px] mt-0.5">🔬</span>
            <div>
              <p className="font-body-md text-[13px] text-on-surface-variant leading-relaxed">
                {waterIntake.note}
              </p>
              <p className="font-label-mono text-[10px] text-on-surface-variant/60 mt-2 leading-relaxed">
                Manbalar: EFSA Journal 2010;8(3):1459 · IOM (2004) Dietary Reference Intakes · Popkin B.M. et al. (2010) Nutrition Reviews 68(8):439–458
              </p>
            </div>
          </div>
        </div>

        <p className="font-body-md text-[12px] text-on-surface-variant/50 mt-3 italic">
          💡 Mashg&apos;ulot paytida qo&apos;shimcha 500–1000 ml suv ichish tavsiya etiladi. Profildagi vazn o&apos;zgarsa, tavsiya avtomatik yangilanadi.
        </p>
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

    </div>
  );
}
