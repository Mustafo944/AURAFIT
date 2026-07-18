"use client";

import { useMemo, useState } from "react";
import { useWorkoutSession } from "@/context/workout-session-context";
import { useUserProfile } from "@/context/user-profile-context";
import { useWorkoutHistory, compareExercises, type ExerciseComparison, type WorkoutSession } from "@/lib/workout-log";
import { useMealLog, sumMeals } from "@/lib/meal-log";
import { calculateFitnessMetrics } from "@/lib/fitness";
import { recommendedWater, type WaterRecommendation } from "@/lib/cardio";
import { fetchWorkoutRecovery } from "@/lib/workout-recovery";
import { MUSCLE_GROUPS, type MuscleGroupId } from "@/lib/exercises";
import { TrainingCalendar, toDateKey } from "@/components/workout/training-calendar";
import { DayDetail } from "@/components/workout/day-detail";
import { ActiveWorkout } from "@/components/workout/active-workout";
import { WorkoutResult } from "@/components/workout/workout-result";
import { VolumeChart } from "@/components/volume-chart";

function muscleLabel(id: MuscleGroupId): string {
  return MUSCLE_GROUPS.find((g) => g.id === id)?.label ?? id;
}

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" });
}

// Kardio uchun terlashga asoslangan suv qo'shimchasini haqiqiy vaqt (soat)
// o'rniga podxod/kardio davomiyligidan baholaymiz — mashg'ulot uzoq ochiq
// qolib ketsa ham raqam haqiqatga yaqin qoladi.
function estimatedWorkoutMinutes(session: WorkoutSession): number {
  const strengthMin = session.totalSets * 2.5;
  const cardioMin = session.cardio.reduce((sum, c) => sum + c.durationMin, 0);
  return strengthMin + cardioMin;
}

export function WorkoutHub() {
  const { sessions, addSession, updateSessionAdvice } = useWorkoutHistory();
  const { activeSession, startSession, finishSession } = useWorkoutSession();
  const { profile } = useUserProfile();
  const { meals } = useMealLog();

  const todayKey = toDateKey(new Date());
  const [selectedKey, setSelectedKey] = useState(todayKey);

  const [result, setResult] = useState<WorkoutSession | null>(null);
  const [comparison, setComparison] = useState<ExerciseComparison[]>([]);
  const [water, setWater] = useState<WaterRecommendation>({ baseMl: 0, workoutMl: 0, totalMl: 0 });
  const [strengthCalories, setStrengthCalories] = useState(0);
  const [cardioCalories, setCardioCalories] = useState(0);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const s of sessions) {
      const key = toDateKey(new Date(s.finishedAt));
      const existing = map.get(key);
      if (existing) existing.push(s);
      else map.set(key, [s]);
    }
    return map;
  }, [sessions]);

  const handleFinish = async () => {
    const session = finishSession(profile.weightKg);
    if (!session) return;

    const previous = sessions[sessions.length - 1];
    const sessionComparison = compareExercises(session, previous);
    const cardioKcal = session.cardio.reduce((sum, c) => sum + c.caloriesBurned, 0);

    addSession(session);
    setResult(session);
    setComparison(sessionComparison);
    setWater(recommendedWater(profile.weightKg, estimatedWorkoutMinutes(session)));
    setCardioCalories(cardioKcal);
    setStrengthCalories(session.caloriesBurned - cardioKcal);
    setSelectedKey(todayKey);
    setRecoveryError(null);
    setRecoveryLoading(true);

    const metrics = calculateFitnessMetrics(
      profile.age,
      profile.gender,
      profile.weightKg,
      profile.heightCm,
      profile.goal
    );
    const consumed = sumMeals(meals);

    const recovery = await fetchWorkoutRecovery({
      profile: { age: profile.age, gender: profile.gender, weightKg: profile.weightKg, goal: profile.goal },
      session: {
        muscleGroups: [...new Set(session.exercises.map((e) => muscleLabel(e.muscleGroup)))],
        exercises: session.exercises.map((e) => ({
          name: e.exerciseName,
          sets: e.sets.length,
          topWeightKg: e.sets.length > 0 ? Math.max(...e.sets.map((s) => s.weightKg)) : 0,
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

  // Faol mashg'ulot bo'lsa — butun ekran unga bag'ishlanadi.
  if (activeSession) {
    return (
      <div className="max-w-3xl mx-auto space-y-stack-lg">
        <Header />
        <ActiveWorkout sessions={sessions} weightKg={profile.weightKg} onFinish={handleFinish} />
      </div>
    );
  }

  const selectedSessions = sessionsByDay.get(selectedKey) ?? [];
  const isToday = selectedKey === todayKey;
  const showResult = result !== null && isToday;

  const trendPoints = sessions.slice(-8).map((s) => ({
    id: s.id,
    dateLabel: formatSessionDate(s.finishedAt),
    totalVolumeKg: s.totalVolumeKg,
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-stack-lg">
      <Header />

      <TrainingCalendar sessions={sessions} selectedKey={selectedKey} onSelect={setSelectedKey} />

      {showResult ? (
        <WorkoutResult
          result={result}
          comparison={comparison}
          water={water}
          strengthCalories={strengthCalories}
          cardioCalories={cardioCalories}
          recoveryLoading={recoveryLoading}
          recoveryError={recoveryError}
          onClose={() => setResult(null)}
        />
      ) : selectedSessions.length > 0 ? (
        <DayDetail dateKey={selectedKey} sessions={selectedSessions} isToday={isToday} />
      ) : isToday ? (
        <StartCard onStart={startSession} />
      ) : (
        <div className="glass-card rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-on-surface-variant/40 text-4xl">event</span>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">Bu kuni mashg&apos;ulot bo&apos;lmagan.</p>
        </div>
      )}

      {trendPoints.length > 1 && (
        <div className="glass-card rounded-xl p-6">
          <VolumeChart points={trendPoints} />
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary uppercase italic">
        Mashg&apos;ulotlar
      </h1>
      <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
        Kalendardan kunni tanlang yoki yangi mashg&apos;ulotni boshlang
      </p>
    </div>
  );
}

function StartCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="glass-card rounded-xl p-8 text-center space-y-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-primary-fixed-dim/15 flex items-center justify-center">
        <span className="material-symbols-outlined text-primary-fixed-dim text-4xl">fitness_center</span>
      </div>
      <div>
        <h3 className="font-headline-md text-headline-md text-primary uppercase italic">Bugun Mashg&apos;ulot Yo&apos;q</h3>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          Mushak guruhlari va mashqlarni tanlab, mashg&apos;ulotni boshlang.
        </p>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="w-full bg-primary-container text-on-primary-container font-headline-md text-headline-md uppercase italic py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-fixed glow-button transition-all active:scale-[0.98]"
      >
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          play_arrow
        </span>
        Mashg&apos;ulotni Boshlash
      </button>
    </div>
  );
}
