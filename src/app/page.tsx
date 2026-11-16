"use client";

import Link from "next/link";
import { useUserProfile } from "@/context/user-profile-context";
import { calculateFitnessMetrics, GOAL_LABELS } from "@/lib/fitness";
import { ProgressRing } from "@/components/progress-ring";
import { BmiCard } from "@/components/bmi-card";
import { useMealLog, sumMeals } from "@/lib/meal-log";
import { ProfileSetupCard } from "@/components/profile-setup-card";

export default function DashboardPage() {
  const { profile, loading, loadError, reload } = useUserProfile();
  const metrics = calculateFitnessMetrics(
    profile.age,
    profile.gender,
    profile.weightKg,
    profile.heightCm,
    profile.goal,
    profile.activityLevel,
  );
  const { meals } = useMealLog();
  const consumed = sumMeals(meals);
  const proteinPct = metrics.proteinG > 0 ? (consumed.proteinG / metrics.proteinG) * 100 : 0;
  const fatPct = metrics.fatG > 0 ? (consumed.fatG / metrics.fatG) * 100 : 0;
  const carbPct = metrics.carbG > 0 ? (consumed.carbG / metrics.carbG) * 100 : 0;

  // Parametrlar kiritilmagan bo'lsa, namunaviy qiymatlardan hisoblangan raqamlar
  // ko'rsatilmaydi: yuklanayotganda bo'sh joy, keyin anketaga taklif.
  if (!profile.onboarded) {
    if (loading) {
      return <div role="status" aria-label="Yuklanmoqda" className="glass-card rounded-2xl h-48 animate-pulse" />;
    }
    // Server xatosi "yangi akkaunt" emas: anketani taklif qilmaymiz (aks holda haqiqiy ma'lumot ustidan yozilishi mumkin).
    if (loadError) {
      return (
        <section role="alert" className="glass-card rounded-2xl p-6 md:p-8 space-y-4 border-l-[4px] border-l-error">
          <h2 className="font-headline-md text-[20px] text-primary">Ma&apos;lumotlaringiz yuklanmadi</h2>
          <p className="text-sm text-on-surface-variant">
            Serverga ulanib bo&apos;lmadi. Ma&apos;lumotlaringiz o&apos;chmagan — internetni tekshirib, qayta urinib
            ko&apos;ring. Dastur o&apos;zi ham qayta urinib turadi.
          </p>
          <button
            type="button"
            onClick={reload}
            className="rounded-xl bg-primary-container px-5 py-3 font-headline-md text-[15px] uppercase tracking-wider text-on-primary-container glow-button hover:bg-primary-fixed transition-colors"
          >
            Qayta urinish
          </button>
        </section>
      );
    }
    return (
      <div className="space-y-stack-lg">
        <ProfileSetupCard />
      </div>
    );
  }

  return (
    <div className="space-y-stack-lg">
      {/* Kunlik maqsad + BMI */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        <div className="glass-card glass-card-hover rounded-2xl p-6 md:p-8 relative overflow-hidden border-l-[4px] border-l-primary-fixed-dim shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col justify-between gap-6">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary-fixed-dim/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-tertiary-fixed-dim/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-primary-fixed-dim shadow-[0_0_8px_#c3f400] animate-pulse" />
              <span className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                Kunlik Maqsad
              </span>
            </div>
            <div className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary font-bold leading-none tracking-tight">
              {metrics.targetCalories}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-label-mono text-label-mono text-tertiary-fixed-dim font-bold">KCAL</span>
              <span className="text-white/20">&middot;</span>
              <span className="font-label-mono text-[11px] px-2 py-0.5 rounded bg-tertiary-fixed-dim/15 text-tertiary-fixed-dim border border-tertiary-fixed-dim/30 uppercase">
                {GOAL_LABELS[profile.goal]}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4 relative z-10">
            <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="font-headline-md text-[22px] md:text-[26px] text-primary font-bold tracking-tight">
                {metrics.bmr}
              </div>
              <div className="font-label-mono text-[10px] text-on-surface-variant uppercase mt-0.5">BMR</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="font-headline-md text-[22px] md:text-[26px] text-primary font-bold tracking-tight">
                {metrics.tdee}
              </div>
              <div className="font-label-mono text-[10px] text-on-surface-variant uppercase mt-0.5">TDEE</div>
            </div>
          </div>
        </div>
        <BmiCard
          bmi={metrics.bmi}
          category={metrics.bmiCategory}
          weightKg={profile.weightKg}
          heightCm={profile.heightCm}
        />
      </section>

      {/* Bugungi Ozuqa Moddalari (Rings) */}
      <section>
        <div className="flex justify-between items-end mb-stack-sm">
          <h3 className="font-headline-md text-headline-md text-primary uppercase italic flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-fixed-dim">data_usage</span> Bugungi Ozuqa
            Moddalari
          </h3>
          <Link
            href="/analytics"
            className="font-label-mono text-label-mono text-primary-fixed-dim hover:text-primary transition-colors flex items-center gap-1 group"
          >
            TAHLIL{" "}
            <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
              chevron_right
            </span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {/* Oqsil */}
          <div className="glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary-fixed-dim/10 rounded-full blur-2xl group-hover:bg-primary-fixed-dim/20 transition-all duration-500" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                Oqsil
              </span>
              <div className="flex items-center gap-2">
                <span className="font-label-mono text-[11px] text-primary-fixed-dim font-bold">
                  {Math.round(proteinPct)}%
                </span>
                <span className="material-symbols-outlined text-primary-fixed-dim">egg</span>
              </div>
            </div>
            <div className="flex items-center gap-6 relative z-10">
              <ProgressRing percentage={proteinPct} color="#abd600" glowColor="rgba(171,214,0,0.5)" />
              <div>
                <div className="font-display-lg-mobile text-display-lg-mobile text-primary font-bold">
                  {consumed.proteinG}g
                </div>
                <div className="font-label-mono text-label-mono text-on-surface-variant">
                  / {metrics.proteinG}G MAQSAD
                </div>
              </div>
            </div>
          </div>

          {/* Yog' */}
          <div className="glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-error/10 rounded-full blur-2xl group-hover:bg-error/20 transition-all duration-500" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                Yog&apos;
              </span>
              <div className="flex items-center gap-2">
                <span className="font-label-mono text-[11px] text-error font-bold">
                  {Math.round(fatPct)}%
                </span>
                <span className="material-symbols-outlined text-error">water_drop</span>
              </div>
            </div>
            <div className="flex items-center gap-6 relative z-10">
              <ProgressRing percentage={fatPct} color="#ffb4ab" glowColor="rgba(255,180,171,0.5)" />
              <div>
                <div className="font-display-lg-mobile text-display-lg-mobile text-primary font-bold">
                  {consumed.fatG}g
                </div>
                <div className="font-label-mono text-label-mono text-on-surface-variant">
                  / {metrics.fatG}G MAQSAD
                </div>
              </div>
            </div>
          </div>

          {/* Uglevod */}
          <div className="glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-tertiary-fixed-dim/10 rounded-full blur-2xl group-hover:bg-tertiary-fixed-dim/20 transition-all duration-500" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="font-label-mono text-label-mono text-on-surface-variant uppercase tracking-wider">
                Uglevod
              </span>
              <div className="flex items-center gap-2">
                <span className="font-label-mono text-[11px] text-tertiary-fixed-dim font-bold">
                  {Math.round(carbPct)}%
                </span>
                <span className="material-symbols-outlined text-tertiary-fixed-dim">grain</span>
              </div>
            </div>
            <div className="flex items-center gap-6 relative z-10">
              <ProgressRing percentage={carbPct} color="#00dbe9" glowColor="rgba(0,219,233,0.5)" />
              <div>
                <div className="font-display-lg-mobile text-display-lg-mobile text-primary font-bold">
                  {consumed.carbG}g
                </div>
                <div className="font-label-mono text-label-mono text-on-surface-variant">
                  / {metrics.carbG}G MAQSAD
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
