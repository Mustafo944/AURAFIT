"use client";

import Link from "next/link";
import { useUserProfile } from "@/context/user-profile-context";
import { calculateFitnessMetrics, GOAL_LABELS } from "@/lib/fitness";
import { ProgressRing } from "@/components/progress-ring";
import { useMealLog, sumMeals } from "@/lib/meal-log";
import { useWorkoutHistory, type WorkoutSession } from "@/lib/workout-log";
import { MUSCLE_GROUPS, type MuscleGroupId } from "@/lib/exercises";

const UZ_MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyun", "iyul", "avg", "sen", "okt", "noy", "dek"];

function formatSessionDate(iso: string): string {
  const d = new Date(iso);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return "Bugun";
  if (diffDays === 1) return "Kecha";
  return `${d.getDate()}-${UZ_MONTHS_SHORT[d.getMonth()]}`;
}

// To'liq class satrlari — Tailwind qurish vaqtida faqat matnda so'zma-so'z
// uchraydigan klasslarni generatsiya qiladi, shuning uchun rangni
// `text-${accent}` kabi qismlardan yig'ib bo'lmaydi (build vaqtida yo'qolib
// qoladi). O'rniga ikkita tayyor variant orasida tanlaymiz.
const CARD_ACCENTS = [
  {
    border: "border-l-primary-fixed-dim",
    heroBg: "bg-gradient-to-br from-primary-fixed-dim/20 to-transparent",
    icon: "text-primary-fixed-dim",
    badge: "bg-primary-fixed-dim/20 text-primary-fixed-dim border-primary-fixed-dim/50",
    titleHover: "group-hover:text-primary-fixed-dim",
    button: "bg-primary-fixed-dim",
  },
  {
    border: "border-l-tertiary-fixed-dim",
    heroBg: "bg-gradient-to-br from-tertiary-fixed-dim/20 to-transparent",
    icon: "text-tertiary-fixed-dim",
    badge: "bg-tertiary-fixed-dim/20 text-tertiary-fixed-dim border-tertiary-fixed-dim/50",
    titleHover: "group-hover:text-tertiary-fixed-dim",
    button: "bg-tertiary-fixed-dim",
  },
] as const;

// Sessiyada eng ko'p podxod bajarilgan mushak guruhini "kun mavzusi" sifatida
// tanlaydi (mas. asosan ko'krak mashqlari bo'lsa — "Ko'krak Kuni").
function dominantMuscleGroup(session: WorkoutSession) {
  const setsByGroup = new Map<MuscleGroupId, number>();
  for (const exercise of session.exercises) {
    setsByGroup.set(exercise.muscleGroup, (setsByGroup.get(exercise.muscleGroup) ?? 0) + exercise.sets.length);
  }
  let bestGroup: MuscleGroupId = session.exercises[0]?.muscleGroup ?? "chest";
  let bestCount = -1;
  for (const [group, count] of setsByGroup) {
    if (count > bestCount) {
      bestGroup = group;
      bestCount = count;
    }
  }
  return MUSCLE_GROUPS.find((g) => g.id === bestGroup) ?? MUSCLE_GROUPS[0];
}

export default function DashboardPage() {
  const { profile } = useUserProfile();
  const metrics = calculateFitnessMetrics(
    profile.age,
    profile.gender,
    profile.weightKg,
    profile.heightCm,
    profile.goal
  );
  const { meals } = useMealLog();
  const consumed = sumMeals(meals);
  const proteinPct = metrics.proteinG > 0 ? (consumed.proteinG / metrics.proteinG) * 100 : 0;
  const fatPct = metrics.fatG > 0 ? (consumed.fatG / metrics.fatG) * 100 : 0;
  const carbPct = metrics.carbG > 0 ? (consumed.carbG / metrics.carbG) * 100 : 0;

  // Eng yangi sessiyalar oxirida keladi (ascending) — teskari qilib so'nggi
  // 2 tasini olamiz.
  const { sessions } = useWorkoutHistory();
  const recentSessions = [...sessions].reverse().slice(0, 2);

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
                {metrics.targetCalories}
              </div>
              <span className="font-label-mono text-label-mono text-tertiary-fixed-dim mt-1 text-center md:text-left">
                KCAL &middot; {GOAL_LABELS[profile.goal].toUpperCase()}
              </span>
            </div>

            {/* BMR / TDEE / BMI */}
            <div className="md:col-span-6 grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="font-headline-md text-[22px] text-primary font-bold">
                  {metrics.bmr}
                </div>
                <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">BMR</div>
              </div>
              <div className="text-center">
                <div className="font-headline-md text-[22px] text-primary font-bold">
                  {metrics.tdee}
                </div>
                <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">TDEE</div>
              </div>
              <div className="text-center">
                <div className="font-headline-md text-[22px] text-primary font-bold">
                  {metrics.bmi}
                </div>
                <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">BMI</div>
                <div className="font-label-mono text-[9px] text-tertiary-fixed-dim mt-0.5">
                  {metrics.bmiCategory}
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

      {/* So'nggi Mashg'ulotlar */}
      <section>
        <div className="flex justify-between items-end mb-stack-sm">
          <h3 className="font-headline-md text-headline-md text-primary uppercase italic flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary-fixed-dim">history</span>
            {/* Brauzer kengaytmalari (masalan tarjima vositalari) ba'zan
                hidratsiyadan oldin matn tugunlariga bo'sh joy qo'shib/olib
                tashlaydi — bu haqiqiy kod xatosi emas, shu sabab shu yerga
                xos suppressHydrationWarning qo'yiladi (React hujjatlarida
                tavsiya etilgan yagona yechim). */}
            <span suppressHydrationWarning>So&apos;nggi Mashg&apos;ulotlar</span>
          </h3>
          <Link
            href="/workouts"
            className="font-label-mono text-label-mono text-primary-fixed-dim hover:text-primary transition-colors flex items-center gap-1"
          >
            BARCHASINI KO&apos;RISH <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </Link>
        </div>

        {recentSessions.length === 0 ? (
          <Link
            href="/workouts"
            className="glass-card press-card ai-accent-border rounded-xl p-8 flex flex-col items-center gap-3 text-center hover:-translate-y-1 transition-transform duration-300"
          >
            <span className="material-symbols-outlined text-tertiary-fixed-dim text-4xl">fitness_center</span>
            <h4 className="font-headline-md text-[18px] font-bold text-primary uppercase">Hali Mashg&apos;ulot Yo&apos;q</h4>
            <p className="font-body-md text-[14px] text-on-surface-variant max-w-md">
              Birinchi mashg&apos;ulotingizni yakunlang — bu yerda so&apos;nggi natijalaringiz chiqib turadi.
            </p>
          </Link>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            {recentSessions.map((session, i) => {
              const group = dominantMuscleGroup(session);
              const accent = CARD_ACCENTS[i % CARD_ACCENTS.length];
              const durationMin = Math.max(
                1,
                Math.round((new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)
              );
              return (
                <Link
                  key={session.id}
                  href="/workouts"
                  className={`glass-card press-card rounded-xl overflow-hidden group cursor-pointer hover:-translate-y-1 transition-transform duration-300 relative border-l-[3px] ${accent.border} block`}
                >
                  <div className={`h-40 relative flex items-center justify-center ${accent.heroBg}`}>
                    <span className={`material-symbols-outlined ${accent.icon} text-[64px] opacity-80`}>{group.icon}</span>
                    <div className="absolute top-3 left-3 z-20 flex gap-2">
                      <span className={`font-label-mono text-[10px] border px-2 py-1 rounded backdrop-blur-sm ${accent.badge}`}>
                        {group.label.toUpperCase()}
                      </span>
                      <span className="font-label-mono text-[10px] bg-surface/80 text-on-surface border border-white/20 px-2 py-1 rounded backdrop-blur-sm">
                        {durationMin} DAQ
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 z-20">
                      <span className="font-label-mono text-[10px] bg-surface/80 text-on-surface border border-white/20 px-2 py-1 rounded backdrop-blur-sm">
                        {formatSessionDate(session.finishedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 relative z-20">
                    <h4 className={`font-headline-md text-[20px] font-bold text-primary mb-1 uppercase tracking-tight transition-colors ${accent.titleHover}`}>
                      {group.label} Kuni
                    </h4>
                    <p className="font-body-md text-[14px] text-on-surface-variant mb-4">
                      {session.exercises.length} mashq &middot; {session.totalSets} yondashuv &middot; {session.totalVolumeKg} kg hajm
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <span className="font-label-mono text-[12px] bg-[#1a1a1a] border border-white/20 text-on-surface-variant px-2 py-1 rounded">
                          {session.caloriesBurned} KKAL
                        </span>
                      </div>
                      <div className={`w-8 h-8 rounded-full text-on-primary flex items-center justify-center hover:bg-primary-fixed glow-button transition-all ${accent.button}`}>
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
