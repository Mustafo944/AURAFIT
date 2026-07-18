"use client";

import type { WorkoutSession, ExerciseComparison } from "@/lib/workout-log";
import { formatLiters, type WaterRecommendation } from "@/lib/cardio";

// Mashg'ulot yakuni ekrani — sof taqdimot (presentational). Statistika va suv
// tavsiyasi FORMULA bilan darhol chiqadi; AI maslahati esa fonda yuklanadi va
// tayyor bo'lgach qo'shiladi (natijani ko'rsatishni bloklamaydi).
export function WorkoutResult({
  result,
  comparison,
  water,
  strengthCalories,
  cardioCalories,
  recoveryLoading,
  recoveryError,
  onClose,
}: {
  result: WorkoutSession;
  comparison: ExerciseComparison[];
  water: WaterRecommendation;
  strengthCalories: number;
  cardioCalories: number;
  recoveryLoading: boolean;
  recoveryError: string | null;
  onClose: () => void;
}) {
  return (
    <div className="glass-card ai-accent-border rounded-xl p-6 space-y-5 relative">
      <button
        type="button"
        onClick={onClose}
        aria-label="Yopish"
        className="absolute top-4 right-4 text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-[20px]">close</span>
      </button>

      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary-fixed-dim">military_tech</span>
        <h3 className="font-headline-md text-headline-md text-primary uppercase italic">Mashg&apos;ulot Yakunlandi</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-container rounded-lg p-3 text-center border border-outline/20">
          <div className="font-headline-md text-[22px] text-primary font-bold">{result.totalSets}</div>
          <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">Podxod</div>
        </div>
        <div className="bg-surface-container rounded-lg p-3 text-center border border-outline/20">
          <div className="font-headline-md text-[22px] text-primary font-bold">
            {Math.round(result.totalVolumeKg).toLocaleString("uz-UZ")}
          </div>
          <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">Hajm (kg)</div>
        </div>
        <div className="bg-surface-container rounded-lg p-3 text-center border border-outline/20">
          <div className="font-headline-md text-[22px] text-primary-fixed-dim font-bold">{result.caloriesBurned}</div>
          <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">Kcal Yoqildi</div>
        </div>
      </div>

      {cardioCalories > 0 && (
        <div className="font-label-mono text-[11px] text-on-surface-variant text-center -mt-2">
          Kuch mashqlari {strengthCalories} kcal · Kardio {cardioCalories} kcal
        </div>
      )}

      {/* Suv tavsiyasi — vazn va mashg'ulot davomiyligiga tayanib hisoblangan. */}
      <div className="bg-tertiary-fixed-dim/[0.07] border border-tertiary-fixed-dim/25 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-tertiary-fixed-dim text-[20px]">water_drop</span>
          <span className="font-label-mono text-label-mono text-tertiary-fixed-dim uppercase">Suv Ichish Tavsiyasi</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-display-lg-mobile text-[30px] text-primary font-bold">{formatLiters(water.totalMl)}</span>
          <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">litr / bugun</span>
        </div>
        <p className="font-body-md text-[12px] text-on-surface-variant mt-1.5">
          Kunlik asos {formatLiters(water.baseMl)} l + mashg&apos;ulot uchun qo&apos;shimcha {water.workoutMl} ml.
          Terlash bilan yo&apos;qotilgan suyuqlikni tiklang.
        </p>
      </div>

      {comparison.length > 0 && (
        <div className="space-y-1.5">
          <div className="font-label-mono text-label-mono text-on-surface-variant uppercase">
            O&apos;tgan Mashg&apos;ulot Bilan Solishtirish
          </div>
          {comparison.map((c) => (
            <div
              key={c.exerciseName}
              className="flex items-center justify-between gap-3 bg-surface-container/50 rounded px-3 py-1.5"
            >
              <span className="font-body-md text-[13px] text-on-surface truncate">{c.exerciseName}</span>
              <span
                className={`font-label-mono text-[12px] shrink-0 ${
                  c.deltaKg > 0 ? "text-primary-fixed-dim" : "text-on-surface-variant"
                }`}
              >
                {c.previousBestWeightKg}kg &rarr; {c.latestBestWeightKg}kg ({c.deltaKg >= 0 ? "+" : ""}
                {c.deltaKg}kg)
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 border-t border-white/10 pt-4">
        {recoveryLoading && (
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
            <span className="font-label-mono text-label-mono uppercase tracking-widest">AI tahlil qilmoqda...</span>
          </div>
        )}
        {recoveryError && (
          <p className="font-body-md text-body-md text-error border border-error/30 bg-error/10 rounded-lg px-4 py-3">
            {recoveryError}
          </p>
        )}
        {result.recoveryAdvice && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-tertiary-fixed-dim text-[18px]">restaurant</span>
              <span className="font-label-mono text-label-mono text-tertiary-fixed-dim uppercase">
                Tiklanish uchun Ovqatlanish
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface">{result.recoveryAdvice}</p>
          </div>
        )}
        {result.progressAdvice && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary-fixed-dim text-[18px]">trending_up</span>
              <span className="font-label-mono text-label-mono text-primary-fixed-dim uppercase">Keyingi Qadam</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface">{result.progressAdvice}</p>
          </div>
        )}
      </div>
    </div>
  );
}
