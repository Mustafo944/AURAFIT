"use client";

import Link from "next/link";
import Image from "next/image";
import { useUserProfile } from "@/context/user-profile-context";
import { calculateFitnessMetrics, GOAL_LABELS } from "@/lib/fitness";
import { ProgressRing } from "@/components/progress-ring";
import { useMealLog, sumMeals } from "@/lib/meal-log";
import { useDailyAdvice } from "@/lib/daily-advice";

const DEFAULT_ADVICE =
  "Bugungi mashg'ulotdan so'ng uglevodlarni to'ldirishga e'tibor bering. Kechagi yuklama tufayli mushaklar tiklanishi uchun protein qabuli muhim.";

export default function DashboardPage() {
  const { profile, loading: profileLoading } = useUserProfile();
  const metrics = calculateFitnessMetrics(
    profile.age,
    profile.gender,
    profile.weightKg,
    profile.heightCm,
    profile.goal
  );
  const { meals, loading: mealsLoading } = useMealLog();
  const consumed = sumMeals(meals);
  const proteinPct = metrics.proteinG > 0 ? (consumed.proteinG / metrics.proteinG) * 100 : 0;
  const fatPct = metrics.fatG > 0 ? (consumed.fatG / metrics.fatG) * 100 : 0;
  const carbPct = metrics.carbG > 0 ? (consumed.carbG / metrics.carbG) * 100 : 0;
  const { advice } = useDailyAdvice({
    profile: {
      age: profile.age,
      gender: profile.gender,
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
      goal: profile.goal,
    },
    metrics: {
      bmr: metrics.bmr,
      tdee: metrics.tdee,
      targetCalories: metrics.targetCalories,
      bmi: metrics.bmi,
      bmiCategory: metrics.bmiCategory,
      proteinG: metrics.proteinG,
      fatG: metrics.fatG,
      carbG: metrics.carbG,
    },
    consumed,
    meals: meals.map((m) => ({ mealName: m.mealName, calories: m.calories })),
    mealCount: meals.length,
    // Profil va bugungi taomlar to'liq yuklanmaguncha AI chaqirilmaydi —
    // aks holda standart/bo'sh qiymatlar bilan bitta ortiqcha so'rov ketadi.
  }, !profileLoading && !mealsLoading);

  return (
    <div className="space-y-stack-lg">
      {/* Metabolik Profil */}
      <section>
        <div className="glass-card rounded-xl p-6 relative overflow-hidden glow-button border-l-[3px] border-l-primary-fixed-dim">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary-fixed-dim/10 rounded-full blur-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
            {/* Hero: Target Calories */}
            <div className="md:col-span-6 flex flex-col items-center md:items-start border-b md:border-b-0 md:border-r border-white/10 pb-4 md:pb-0 md:pr-6">
              <span className="font-label-mono text-label-mono text-on-surface-variant uppercase mb-1">Kunlik Maqsad</span>
              <div className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary font-bold leading-none">
                {profileLoading ? (
                  <span className="inline-block w-28 h-10 rounded bg-white/10 animate-pulse align-middle" />
                ) : (
                  metrics.targetCalories
                )}
              </div>
              <span className="font-label-mono text-label-mono text-tertiary-fixed-dim mt-1 text-center md:text-left">
                KCAL &middot; {GOAL_LABELS[profile.goal].toUpperCase()}
              </span>
            </div>

            {/* BMR / TDEE / BMI */}
            <div className="md:col-span-6 grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="font-headline-md text-[22px] text-primary font-bold">
                  {profileLoading ? <span className="inline-block w-10 h-5 rounded bg-white/10 animate-pulse" /> : metrics.bmr}
                </div>
                <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">BMR</div>
              </div>
              <div className="text-center">
                <div className="font-headline-md text-[22px] text-primary font-bold">
                  {profileLoading ? <span className="inline-block w-10 h-5 rounded bg-white/10 animate-pulse" /> : metrics.tdee}
                </div>
                <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">TDEE</div>
              </div>
              <div className="text-center">
                <div className="font-headline-md text-[22px] text-primary font-bold">
                  {profileLoading ? <span className="inline-block w-10 h-5 rounded bg-white/10 animate-pulse" /> : metrics.bmi}
                </div>
                <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">BMI</div>
                <div className="font-label-mono text-[9px] text-tertiary-fixed-dim mt-0.5">
                  {profileLoading ? "" : metrics.bmiCategory}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bugungi Ozuqa Moddalari (Rings) */}
      <section>
        <div className="flex justify-between items-end mb-stack-sm">
          <h3 className="font-headline-md text-headline-md text-primary uppercase italic flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-fixed-dim">data_usage</span> Bugungi Ozuqa Moddalari
          </h3>
          <Link
            href="/analytics"
            className="font-label-mono text-label-mono text-primary-fixed-dim hover:text-primary transition-colors flex items-center gap-1"
          >
            TAHLIL <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {/* Oqsil */}
          <div className="glass-card rounded-xl p-6 relative overflow-hidden glow-button group">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary-fixed-dim/10 rounded-full blur-2xl group-hover:bg-primary-fixed-dim/20 transition-all duration-500" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Oqsil</span>
              <span className="material-symbols-outlined text-primary-fixed-dim">egg</span>
            </div>
            <div className="flex items-center gap-6 relative z-10">
              <ProgressRing percentage={proteinPct} color="#abd600" glowColor="rgba(171,214,0,0.5)" />
              <div>
                <div className="font-display-lg-mobile text-display-lg-mobile text-primary font-bold">{consumed.proteinG}g</div>
                <div className="font-label-mono text-label-mono text-on-surface-variant">/ {metrics.proteinG}G MAQSAD</div>
              </div>
            </div>
          </div>

          {/* Yog' */}
          <div className="glass-card rounded-xl p-6 relative overflow-hidden glow-button group">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-error/10 rounded-full blur-2xl group-hover:bg-error/20 transition-all duration-500" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Yog&apos;</span>
              <span className="material-symbols-outlined text-error">water_drop</span>
            </div>
            <div className="flex items-center gap-6 relative z-10">
              <ProgressRing percentage={fatPct} color="#ffb4ab" glowColor="rgba(255,180,171,0.5)" />
              <div>
                <div className="font-display-lg-mobile text-display-lg-mobile text-primary font-bold">{consumed.fatG}g</div>
                <div className="font-label-mono text-label-mono text-on-surface-variant">/ {metrics.fatG}G MAQSAD</div>
              </div>
            </div>
          </div>

          {/* Uglevod */}
          <div className="glass-card rounded-xl p-6 relative overflow-hidden glow-button group">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-tertiary-fixed-dim/10 rounded-full blur-2xl group-hover:bg-tertiary-fixed-dim/20 transition-all duration-500" />
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Uglevod</span>
              <span className="material-symbols-outlined text-tertiary-fixed-dim">grain</span>
            </div>
            <div className="flex items-center gap-6 relative z-10">
              <ProgressRing percentage={carbPct} color="#00dbe9" glowColor="rgba(0,219,233,0.5)" />
              <div>
                <div className="font-display-lg-mobile text-display-lg-mobile text-primary font-bold">{consumed.carbG}g</div>
                <div className="font-label-mono text-label-mono text-on-surface-variant">/ {metrics.carbG}G MAQSAD</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Kunlik Maslahat (Daily Advice) */}
      <section className="glass-card rounded-xl p-6 border-l-[4px] border-l-tertiary-fixed-dim">
        <h3 className="font-headline-md text-headline-md text-primary uppercase italic mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-tertiary-fixed-dim">lightbulb</span>
          Kunlik Maslahat
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant">
          {advice ?? DEFAULT_ADVICE}
        </p>
      </section>

      {/* AI Workout Cards */}
      <section>
        <div className="flex justify-between items-end mb-stack-sm">
          <h3 className="font-headline-md text-headline-md text-primary uppercase italic flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary-fixed-dim">psychology</span> Mashqlar: AI Protokollari
          </h3>
          <Link
            href="/workouts"
            className="font-label-mono text-label-mono text-primary-fixed-dim hover:text-primary transition-colors flex items-center gap-1"
          >
            BARCHASINI KO&apos;RISH <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
          {/* Workout Card 1 */}
          <Link href="/workouts" className="glass-card rounded-xl overflow-hidden group cursor-pointer hover:-translate-y-1 transition-transform duration-300 relative border-l-[3px] border-l-tertiary-fixed-dim block">
            <div className="h-40 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high to-transparent z-10" />
              <Image
                alt="Velosiped Mashg'uloti"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                className="object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaDi3MwLcCpo1D1Usa_vKYKYWwvP3l3B4glXzIjtEjMho3KtFWfxlBzXJc40snouBQ9qwooZ7YSjwqMXEJXPreBamDThvcbe9JTggA6ZJRAnu6-U_-VVaGslRNqGBGQromB-MXHtJ0K4PZV9AKa8XpGJapMz4FsvZBhFrOUCs7qsCzFYUF07Y4_I_aLxCia9NvPTVo9JOchdmHUlZ4TRAsy27eOhQ23Eg2ZtW8sJRXQYbMSq3Pl9kS"
              />
              <div className="absolute top-3 left-3 z-20 flex gap-2">
                <span className="font-label-mono text-[10px] bg-tertiary-fixed-dim/20 text-tertiary-fixed-dim border border-tertiary-fixed-dim/50 px-2 py-1 rounded backdrop-blur-sm">CHIDAMLILIK</span>
                <span className="font-label-mono text-[10px] bg-surface/80 text-on-surface border border-white/20 px-2 py-1 rounded backdrop-blur-sm">45 DAQ</span>
              </div>
            </div>
            <div className="p-5 relative z-20 -mt-8">
              <h4 className="font-headline-md text-[20px] font-bold text-primary mb-1 uppercase tracking-tight group-hover:text-tertiary-fixed-dim transition-colors">Void Sprinter Protokoli</h4>
              <p className="font-body-md text-[14px] text-on-surface-variant mb-4 line-clamp-2">
                So&apos;nggi tiklanish ko&apos;rsatkichlaringizga asoslanib VO2 max ni maksimal darajaga ko&apos;tarish uchun yuqori chastotali intervallar.
              </p>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="font-label-mono text-[12px] bg-[#1a1a1a] border border-primary-fixed-dim/50 text-primary-fixed-dim px-2 py-1 rounded">160 URG&apos;U/DAQ</span>
                  <span className="font-label-mono text-[12px] bg-[#1a1a1a] border border-white/20 text-on-surface-variant px-2 py-1 rounded">O&apos;RTACHA</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary-fixed-dim text-on-primary flex items-center justify-center hover:bg-primary-fixed glow-button transition-all">
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Workout Card 2 */}
          <Link href="/workouts" className="glass-card rounded-xl overflow-hidden group cursor-pointer hover:-translate-y-1 transition-transform duration-300 relative border-l-[3px] border-l-primary-fixed-dim block">
            <div className="h-40 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high to-transparent z-10" />
              <Image
                alt="Kuch Mashg'uloti"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                className="object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBF3B5ibAmBhacYyB_yDAIoPxK9_De1vuk7OKv8WkmD99cOIBXe5B5vNjofmhKm1-6BXLGH1nUYOPZMLmBL5Y-q_e7MqdZm8RBwM7WPQXUSkMZkeFXEKXu7GBwb7tfLBgAup0JIjMlkOKC8lU-ibivESuPSxc57aL-tBjQ1dDaHTezU9XViAkhGpS3X43_liC_Dc7WMYKttchQoPgQnkML_qCmXLkIfhMxvM5IZx3kW-UMj6WAHCYw_"
              />
              <div className="absolute top-3 left-3 z-20 flex gap-2">
                <span className="font-label-mono text-[10px] bg-primary-fixed-dim/20 text-primary-fixed-dim border border-primary-fixed-dim/50 px-2 py-1 rounded backdrop-blur-sm">GIPERTROFIYA</span>
                <span className="font-label-mono text-[10px] bg-surface/80 text-on-surface border border-white/20 px-2 py-1 rounded backdrop-blur-sm">60 DAQ</span>
              </div>
            </div>
            <div className="p-5 relative z-20 -mt-8">
              <h4 className="font-headline-md text-[20px] font-bold text-primary mb-1 uppercase tracking-tight group-hover:text-primary-fixed-dim transition-colors">Kinetic Overload</h4>
              <p className="font-body-md text-[14px] text-on-surface-variant mb-4 line-clamp-2">
                Yuqori tana mexanik kuchlanishiga e&apos;tibor. AI algoritmi oxirgi mashg&apos;ulotdan 5% yuklama oshirishni taklif qiladi.
              </p>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="font-label-mono text-[12px] bg-[#1a1a1a] border border-primary-fixed-dim/50 text-primary-fixed-dim px-2 py-1 rounded">4 YONDASHUV</span>
                  <span className="font-label-mono text-[12px] bg-[#1a1a1a] border border-error/50 text-error px-2 py-1 rounded">INTENSIV</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-primary-fixed-dim text-on-primary flex items-center justify-center hover:bg-primary-fixed glow-button transition-all">
                  <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
