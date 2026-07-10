"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useUserProfile, DEFAULT_PROFILE, type Gender, type Goal } from "@/context/user-profile-context";
import { calculateFitnessMetrics } from "@/lib/fitness";
import { useProfileInsight } from "@/lib/profile-insight";
import { useWeightHistory } from "@/lib/weight-log";
import { useWorkoutHistory } from "@/lib/workout-log";
import { muscleRecoveryStatus } from "@/lib/muscle-recovery";
import { BodyHeatmap } from "@/components/body-heatmap";

type ProfileFormState = Omit<typeof DEFAULT_PROFILE, "age" | "weightKg" | "heightCm" | "targetWeightKg"> & {
  age: number | "";
  weightKg: number | "";
  heightCm: number | "";
  targetWeightKg: number | "";
};

export default function ProfilePage() {
  const { profile, setProfile } = useUserProfile();
  const { addWeightEntry } = useWeightHistory();
  const { sessions } = useWorkoutHistory();
  const recoveryStatuses = useMemo(() => muscleRecoveryStatus(sessions), [sessions]);
  const [form, setForm] = useState<ProfileFormState>({ ...profile, targetWeightKg: profile.targetWeightKg ?? "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({ ...profile, targetWeightKg: profile.targetWeightKg ?? "" });
  }, [profile]);

  const handleSave = () => {
    const nextWeightKg = form.weightKg === "" ? profile.weightKg : form.weightKg;
    const next = {
      age: form.age === "" ? profile.age : form.age,
      gender: form.gender,
      weightKg: nextWeightKg,
      heightCm: form.heightCm === "" ? profile.heightCm : form.heightCm,
      goal: form.goal,
      targetWeightKg: form.targetWeightKg === "" ? null : form.targetWeightKg,
    };
    setProfile(next);
    setForm({ ...next, targetWeightKg: next.targetWeightKg ?? "" });
    if (nextWeightKg !== profile.weightKg) {
      addWeightEntry(nextWeightKg);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Driven by the saved profile (not the live form draft), so the AI call only
  // fires once Saqlash is pressed — never on every keystroke.
  const metrics = calculateFitnessMetrics(
    profile.age,
    profile.gender,
    profile.weightKg,
    profile.heightCm,
    profile.goal
  );
  const { insight, loading: insightLoading } = useProfileInsight({
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
  });

  return (
    <div className="space-y-stack-lg max-w-7xl mx-auto">
      {/* Profile Header Section */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        <div className="md:col-span-12 glass-card rounded-xl p-6 flex flex-col md:flex-row items-center md:items-start gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-primary-container shadow-[0_0_20px_rgba(195,244,0,0.2)] relative">
              <Image
                alt="ATHLETE_01 Profile Picture"
                fill
                sizes="128px"
                className="object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgSUeKuNCii9EGLv0gC8oIPQ0dy3s3bJwO1uu2n9c0j_jzjv4zw2X9T3Kl3voFx1Nef-TyBxDglRUNwGmrhVaLMZCOk63W-2_tdCXX0z279M4zecrwKHOQCMT07aedR1WjrjokJXr5GTxeybD_CLmFDGoXk-YG7cPkKH-VL5xcVipl_sMSfatPtCsSQtuVfov2FgF6iWOv64r00om926B8CuxNsAREsW8OHNTx5to1K_X2Sc--xk5_"
              />
            </div>
            <button className="absolute bottom-0 right-0 bg-primary-container text-on-primary-container w-10 h-10 rounded-full flex items-center justify-center glow-button hover:bg-primary-fixed transition-colors">
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
          </div>

          {/* Profile Info */}
          <div className="flex-1 text-center md:text-left flex flex-col justify-center">
            <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary uppercase">ATHLETE_01</h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2">
              <span className="bg-[#1A1A1A] border border-primary-fixed font-label-mono text-label-mono text-primary-fixed px-3 py-1 rounded">PRO DARAJA</span>
              <span className="bg-[#1A1A1A] border border-white/20 font-label-mono text-label-mono text-on-surface-variant px-3 py-1 rounded flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">military_tech</span> 42 NISHON
              </span>
            </div>
          </div>

        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Side Navigation (Desktop) */}
        <div className="hidden md:flex flex-col col-span-3 glass-card rounded-xl overflow-hidden h-fit">
          <nav className="flex flex-col py-stack-md w-full">
            <Link className="flex items-center gap-3 px-6 py-4 bg-primary/10 text-primary border-l-4 border-primary" href="/profile">
              <span className="material-symbols-outlined">psychology</span>
              <span className="font-body-md text-body-md">AI Murabbiy Sozlamalari</span>
            </Link>
            <Link className="flex items-center gap-3 px-6 py-4 text-on-surface-variant hover:bg-white/5 transition-colors duration-200 mt-stack-md border-t border-white/5" href="#">
              <span className="material-symbols-outlined">logout</span>
              <span className="font-body-md text-body-md">Chiqish</span>
            </Link>
          </nav>
        </div>

        {/* Settings Content Area */}
        <div className="col-span-1 md:col-span-9 space-y-stack-md">
          {/* Section 0: Personal Biometrics */}
          <div className="glass-card ai-accent-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
              <span className="material-symbols-outlined text-primary-fixed-dim">monitor_weight</span>
              <h3 className="font-headline-md text-headline-md text-primary uppercase">Shaxsiy Ma&apos;lumotlar</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2">YOSH</label>
                <input
                  className="w-full bg-[#000000] border border-white/10 rounded px-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none"
                  type="number"
                  min={10}
                  max={100}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value === "" ? "" : Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2">JINS</label>
                <select
                  className="w-full bg-[#000000] border border-white/10 rounded px-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
                >
                  <option value="male">Erkak</option>
                  <option value="female">Ayol</option>
                </select>
              </div>
              <div>
                <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2">VAZN (KG)</label>
                <input
                  className="w-full bg-[#000000] border border-white/10 rounded px-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none"
                  type="number"
                  min={30}
                  max={300}
                  value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: e.target.value === "" ? "" : Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2">BO&apos;Y (SM)</label>
                <input
                  className="w-full bg-[#000000] border border-white/10 rounded px-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none"
                  type="number"
                  min={100}
                  max={250}
                  value={form.heightCm}
                  onChange={(e) => setForm({ ...form, heightCm: e.target.value === "" ? "" : Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2">
                  MAQSAD VAZNI (KG) <span className="normal-case text-on-surface-variant/60">— ixtiyoriy</span>
                </label>
                <input
                  className="w-full bg-[#000000] border border-white/10 rounded px-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none"
                  type="number"
                  min={30}
                  max={300}
                  value={form.targetWeightKg}
                  onChange={(e) =>
                    setForm({ ...form, targetWeightKg: e.target.value === "" ? "" : Number(e.target.value) })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-label-mono text-label-mono text-on-surface-variant mb-2">MAQSAD</label>
                <select
                  className="w-full bg-[#000000] border border-white/10 rounded px-4 py-3 text-on-surface font-body-md focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors outline-none"
                  value={form.goal}
                  onChange={(e) => setForm({ ...form, goal: e.target.value as Goal })}
                >
                  <option value="lose">Vazn Yo&apos;qotish</option>
                  <option value="maintain">Vaznni Saqlash</option>
                  <option value="gain">Mushak Massasi Orttirish</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={handleSave}
                className="px-6 py-3 rounded-lg bg-primary-container text-on-primary-container font-headline-md text-sm uppercase tracking-wider glow-button hover:bg-primary-fixed transition-colors"
              >
                Saqlash
              </button>
              {saved && (
                <span className="font-label-mono text-label-mono text-primary-fixed-dim flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span> Saqlandi
                </span>
              )}
            </div>
          </div>

          {/* Muskul Charchog'i Xaritasi */}
          <div className="glass-card ai-accent-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
              <span className="material-symbols-outlined text-primary-fixed-dim">local_fire_department</span>
              <h3 className="font-headline-md text-headline-md text-primary uppercase">Muskul Charchog&apos;i Xaritasi</h3>
            </div>
            <BodyHeatmap statuses={recoveryStatuses} />
          </div>

          {/* AI Tahlili: formula + AI hybrid */}
          <div className="glass-card ai-accent-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
              <span className="material-symbols-outlined text-tertiary-fixed-dim">auto_awesome</span>
              <h3 className="font-headline-md text-headline-md text-primary uppercase">AI Tahlili</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Formula numbers */}
              <div className="md:col-span-4 grid grid-cols-3 md:grid-cols-1 gap-4 md:border-r border-white/10 md:pr-6">
                <div className="text-center md:text-left">
                  <div className="font-headline-md text-[22px] text-primary font-bold">{metrics.bmr}</div>
                  <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">BMR (kcal)</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="font-headline-md text-[22px] text-primary font-bold">{metrics.tdee}</div>
                  <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">TDEE (kcal)</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="font-headline-md text-[22px] text-primary font-bold">{metrics.targetCalories}</div>
                  <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">Kunlik Maqsad</div>
                </div>
                <div className="text-center md:text-left">
                  <div className="font-headline-md text-[22px] text-primary font-bold">{metrics.bmi}</div>
                  <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">BMI</div>
                  <div className="font-label-mono text-[9px] text-tertiary-fixed-dim mt-0.5">{metrics.bmiCategory}</div>
                </div>
              </div>

              {/* AI narrative */}
              <div className="md:col-span-8">
                {insightLoading && !insight && (
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    <span className="font-label-mono text-label-mono uppercase tracking-widest">AI tahlil qilmoqda...</span>
                  </div>
                )}
                {insight && (
                  <div className="space-y-3">
                    <p className="font-body-md text-body-md text-on-surface">{insight.analysis}</p>
                    {insight.tips.length > 0 && (
                      <ul className="space-y-2">
                        {insight.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 font-body-md text-[14px] text-on-surface-variant">
                            <span className="material-symbols-outlined text-tertiary-fixed-dim text-[16px] mt-0.5">check_circle</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {!insightLoading && !insight && (
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Tahlil hozircha mavjud emas. Ma&apos;lumotlaringizni saqlab, birozdan so&apos;ng qayta tekshiring.
                  </p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
