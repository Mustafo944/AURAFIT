"use client";

import { useEffect, useState } from "react";
import { useWorkoutSession } from "@/context/workout-session-context";
import { useUserProfile } from "@/context/user-profile-context";
import { calculateFitnessMetrics } from "@/lib/fitness";
import { useMealLog, sumMeals } from "@/lib/meal-log";
import { compareExercises, type ExerciseComparison, type WorkoutSession } from "@/lib/workout-log";
import { fetchWorkoutRecovery } from "@/lib/workout-recovery";
import { MUSCLE_GROUPS, type MuscleGroupId } from "@/lib/exercises";
import { VolumeChart } from "@/components/volume-chart";

function muscleLabel(id: MuscleGroupId): string {
  return MUSCLE_GROUPS.find((g) => g.id === id)?.label ?? id;
}

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" });
}

function formatElapsed(startedAt: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `${hours}s ${rest}d` : `${rest}d`;
}

// `sessions`/`addSession`/`updateSessionAdvice` prop sifatida keladi — sahifa
// (workouts/page.tsx) useWorkoutHistory'ni allaqachon chaqiradi; panel uni
// qayta chaqirsa bir xil to'liq tarix bitta sahifa ochilishida IKKI marta
// yuklanardi.
export function WorkoutSessionPanel({
  sessions,
  addSession,
  updateSessionAdvice,
}: {
  sessions: WorkoutSession[];
  addSession: (session: WorkoutSession) => void;
  updateSessionAdvice: (id: string, advice: { recoveryAdvice: string; progressAdvice: string }) => void;
}) {
  const { activeSession, startSession, discardSession, finishSession } = useWorkoutSession();
  const { profile } = useUserProfile();
  const metrics = calculateFitnessMetrics(profile.age, profile.gender, profile.weightKg, profile.heightCm, profile.goal);
  const { meals } = useMealLog();
  const consumed = sumMeals(meals);

  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!activeSession) return;
    const id = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, [activeSession]);

  const [result, setResult] = useState<WorkoutSession | null>(null);
  const [comparison, setComparison] = useState<ExerciseComparison[]>([]);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const handleFinish = async () => {
    const session = finishSession(profile.weightKg);
    if (!session) return;

    const previous = sessions[sessions.length - 1];
    const sessionComparison = compareExercises(session, previous);

    addSession(session);
    setResult(session);
    setComparison(sessionComparison);
    setRecoveryError(null);
    setRecoveryLoading(true);

    const recovery = await fetchWorkoutRecovery({
      profile: { age: profile.age, gender: profile.gender, weightKg: profile.weightKg, goal: profile.goal },
      session: {
        muscleGroups: [...new Set(session.exercises.map((e) => muscleLabel(e.muscleGroup)))],
        exercises: session.exercises.map((e) => ({
          name: e.exerciseName,
          sets: e.sets.length,
          topWeightKg: Math.max(...e.sets.map((s) => s.weightKg)),
        })),
        totalSets: session.totalSets,
        totalVolumeKg: session.totalVolumeKg,
        caloriesBurned: session.caloriesBurned,
      },
      comparison: sessionComparison,
      nutrition: {
        consumed,
        target: {
          calories: metrics.targetCalories,
          proteinG: metrics.proteinG,
          fatG: metrics.fatG,
          carbG: metrics.carbG,
        },
      },
    });

    setRecoveryLoading(false);
    if ("error" in recovery) {
      setRecoveryError(recovery.error);
    } else {
      setResult((prev) => (prev ? { ...prev, ...recovery } : prev));
      updateSessionAdvice(session.id, recovery);
    }
  };

  const totalSetsLogged = activeSession?.exercises.reduce((sum, e) => sum + e.sets.length, 0) ?? 0;
  const muscleGroupsTouched = activeSession
    ? [...new Set(activeSession.exercises.map((e) => muscleLabel(e.muscleGroup)))]
    : [];

  const chartPoints = sessions.slice(-8).map((s) => ({
    id: s.id,
    dateLabel: formatSessionDate(s.finishedAt),
    totalVolumeKg: s.totalVolumeKg,
  }));
  const recentSessions = sessions.slice().reverse().slice(0, 5);

  return (
    <div className="space-y-stack-md">
      {!activeSession && !result && (
        <button
          type="button"
          onClick={startSession}
          className="w-full bg-primary-container text-on-primary-container font-headline-md text-headline-md uppercase italic py-4 rounded-lg flex items-center justify-center gap-2 hover:bg-primary-fixed glow-button transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            play_arrow
          </span>
          Mashg&apos;ulotni Boshlash
        </button>
      )}

      {activeSession && (
        <div className="glass-card rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 border-l-[3px] border-l-primary-fixed-dim">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="material-symbols-outlined text-primary-fixed-dim animate-pulse">fiber_manual_record</span>
            <div className="min-w-0">
              <div className="font-headline-md text-[16px] text-primary uppercase italic">
                Faol Mashg&apos;ulot &middot; {formatElapsed(activeSession.startedAt)}
              </div>
              <div className="font-label-mono text-label-mono text-on-surface-variant truncate">
                {totalSetsLogged} ta podxod
                {muscleGroupsTouched.length > 0 ? ` · ${muscleGroupsTouched.join(", ")}` : " · pastdan mashqni tanlab boshlang"}
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={discardSession}
              className="px-4 py-2 rounded-lg bg-white/5 text-on-surface-variant border border-white/10 hover:bg-white/10 transition-colors font-label-mono text-label-mono"
            >
              Bekor Qilish
            </button>
            <button
              type="button"
              onClick={handleFinish}
              disabled={totalSetsLogged === 0}
              className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-label-mono text-label-mono uppercase glow-button hover:bg-primary-fixed transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Yakunlash
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="glass-card ai-accent-border rounded-xl p-6 space-y-4 relative">
          <button
            type="button"
            onClick={() => setResult(null)}
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
            <div className="bg-surface-container rounded p-3 text-center border border-outline/20">
              <div className="font-headline-md text-[22px] text-primary font-bold">{result.totalSets}</div>
              <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">Podxod</div>
            </div>
            <div className="bg-surface-container rounded p-3 text-center border border-outline/20">
              <div className="font-headline-md text-[22px] text-primary font-bold">
                {Math.round(result.totalVolumeKg).toLocaleString("uz-UZ")}
              </div>
              <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">Hajm (kg)</div>
            </div>
            <div className="bg-surface-container rounded p-3 text-center border border-outline/20">
              <div className="font-headline-md text-[22px] text-primary-fixed-dim font-bold">{result.caloriesBurned}</div>
              <div className="font-label-mono text-[10px] text-on-surface-variant uppercase">Kcal Yoqildi</div>
            </div>
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
      )}

      {sessions.length > 0 && !result && (
        <div className="glass-card rounded-xl p-6">
          <VolumeChart points={chartPoints} />
          <div className="mt-4 pt-4 border-t border-white/10 space-y-1.5">
            {recentSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 font-label-mono text-[11px]">
                <span className="text-on-surface-variant">{formatSessionDate(s.finishedAt)}</span>
                <span className="text-on-surface-variant">{s.totalSets} podxod</span>
                <span className="text-on-surface">{Math.round(s.totalVolumeKg)} kg</span>
                <span className="text-primary-fixed-dim">{s.caloriesBurned} kcal</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
