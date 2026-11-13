"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useWorkoutSession } from "@/context/workout-session-context";
import { useUserProfile } from "@/context/user-profile-context";
import {
  useWorkoutHistory,
  compareExercises,
  type ExerciseComparison,
  type WorkoutSession,
} from "@/lib/workout-log";
import { useMealLog, sumMeals } from "@/lib/meal-log";
import { calculateFitnessMetrics } from "@/lib/fitness";
import { recommendedWater, type WaterRecommendation } from "@/lib/cardio";
import { fetchWorkoutRecovery, type WorkoutRecoveryRequest } from "@/lib/workout-recovery";
import { collectNewRecords, type RecordHighlight } from "@/lib/personal-records";
import { EXERCISES, MUSCLE_GROUPS, type MuscleGroupId } from "@/lib/exercises";
import { MonthCalendar } from "@/components/month-calendar";
import { CollapsiblePanel } from "@/components/collapsible-panel";
import { dayKey as toDateKey } from "@/lib/date-key";
import { DayDetail } from "@/components/workout/day-detail";
import { ActiveWorkout } from "@/components/workout/active-workout";
import { WorkoutResult } from "@/components/workout/workout-result";
import { PrPanel } from "@/components/workout/pr-panel";
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
  const {
    sessions,
    hasMore,
    loadingMore,
    error: historyError,
    loadMore,
    addSession,
    removeSession,
    updateSessionAdvice,
  } = useWorkoutHistory();
  const { activeSession, startSession, finishSession, discardSession } = useWorkoutSession();
  const { profile } = useUserProfile();
  const { meals } = useMealLog();

  const todayKey = toDateKey(new Date());
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [calendarView, setCalendarView] = useState(() => ({
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
  }));

  const [result, setResult] = useState<WorkoutSession | null>(null);
  const [comparison, setComparison] = useState<ExerciseComparison[]>([]);
  const [newRecords, setNewRecords] = useState<RecordHighlight[]>([]);
  const [water, setWater] = useState<WaterRecommendation>({ baseMl: 0, workoutMl: 0, totalMl: 0 });
  const [strengthCalories, setStrengthCalories] = useState(0);
  const [cardioCalories, setCardioCalories] = useState(0);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  // AI maslahat avtomatik emas, foydalanuvchi so'raganda olinadi — shu uchun so'rov tanasi saqlab qo'yiladi.
  const [recoveryRequest, setRecoveryRequest] = useState<{ sessionId: string; body: WorkoutRecoveryRequest } | null>(null);

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

  // Tarix sahifalab yuklanadi (eng yangilari avval). Kalendarda hali
  // yuklanmagan eski oy ochilsa — o'sha oygacha bo'lgan qismini avtomatik yuklaymiz.
  // Har bir "eng eski yozuv + oy" holati uchun bir marta urinamiz — yuklash
  // xato bersa cheksiz qayta so'rov yuborilmaydi.
  const oldestLoaded = sessions[0]?.finishedAt;
  const lastAutoLoad = useRef<string | null>(null);
  useEffect(() => {
    if (!hasMore || loadingMore) return;
    const monthStart = new Date(calendarView.year, calendarView.month, 1).toISOString();
    if (oldestLoaded && oldestLoaded < monthStart) return;
    const attempt = `${oldestLoaded ?? ""}|${monthStart}`;
    if (lastAutoLoad.current === attempt) return;
    lastAutoLoad.current = attempt;
    void loadMore();
  }, [hasMore, loadingMore, oldestLoaded, calendarView.year, calendarView.month, loadMore]);

  const finishLock = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleFinish = async () => {
    if (finishLock.current) return;
    const session = finishSession(profile.weightKg);
    if (!session) return;

    const previous = sessions[sessions.length - 1];
    const sessionComparison = compareExercises(session, previous);
    // Rekordlar yangi sessiya tarixga qo'shilishidan OLDIN hisoblanadi —
    // aks holda sessiya o'z-o'zi bilan taqqoslanib, rekord ko'rinmay qolardi.
    const sessionRecords = collectNewRecords(sessions, session);
    const cardioKcal = session.cardio.reduce((sum, c) => sum + c.caloriesBurned, 0);

    finishLock.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      await addSession(session);
      discardSession();
    } catch {
      setSaveError("Mashg'ulot saqlanmadi. Qoralama saqlanib qoldi; qayta urinib ko'ring.");
      return;
    } finally {
      finishLock.current = false;
      setSaving(false);
    }
    setResult(session);
    setComparison(sessionComparison);
    setNewRecords(sessionRecords);
    setWater(recommendedWater(profile.weightKg, estimatedWorkoutMinutes(session)));
    setCardioCalories(cardioKcal);
    setStrengthCalories(session.caloriesBurned - cardioKcal);
    setSelectedKey(todayKey);
    setRecoveryError(null);
    setRecoveryLoading(false);

    const metrics = calculateFitnessMetrics(
      profile.age,
      profile.gender,
      profile.weightKg,
      profile.heightCm,
      profile.goal,
      profile.activityLevel,
    );
    const consumed = sumMeals(meals);

    setRecoveryRequest({
      sessionId: session.id,
      body: {
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
      },
    });
  };

  const requestRecovery = async () => {
    if (!recoveryRequest || recoveryLoading) return;
    setRecoveryError(null);
    setRecoveryLoading(true);
    const recovery = await fetchWorkoutRecovery(recoveryRequest.body);
    setRecoveryLoading(false);
    if ("error" in recovery) {
      setRecoveryError(recovery.error);
    } else {
      setResult((prev) => (prev ? { ...prev, ...recovery } : prev));
      updateSessionAdvice(recoveryRequest.sessionId, recovery);
    }
  };

  // Faol mashg'ulot bo'lsa — butun ekran unga bag'ishlanadi.
  if (activeSession) {
    return (
      <div className="max-w-6xl mx-auto space-y-stack-lg">
        <Header active />
        {saveError && (
          <p role="alert" className="text-error">
            {saveError}
          </p>
        )}
        <ActiveWorkout
          sessions={sessions}
          weightKg={profile.weightKg}
          saving={saving}
          onFinish={handleFinish}
        />
      </div>
    );
  }

  const selectedSessions = sessionsByDay.get(selectedKey) ?? [];
  const isToday = selectedKey === todayKey;
  const showResult = result !== null;

  const trendPoints = sessions.slice(-8).map((s) => ({
    id: s.id,
    dateLabel: formatSessionDate(s.finishedAt),
    totalVolumeKg: s.totalVolumeKg,
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-stack-lg">
      <Header />

      {historyError && (
        <p role="alert" className="text-error text-sm">
          {historyError}
        </p>
      )}
      <CollapsiblePanel
        title="Mashg'ulot tarixi"
        icon="calendar_month"
        open={historyOpen}
        onToggle={() => setHistoryOpen((v) => !v)}
      >
        <MonthCalendar
          year={calendarView.year}
          month={calendarView.month}
          onMonthChange={(year, month) => setCalendarView({ year, month })}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
          markedDays={new Set(sessionsByDay.keys())}
          markedLabel="mashg'ulot bor"
          loading={loadingMore}
        />
        {selectedSessions.length > 0 ? (
          <DayDetail
            dateKey={selectedKey}
            sessions={selectedSessions}
            isToday={isToday}
            onDeleteSession={removeSession}
          />
        ) : (
          <p className="text-center text-sm text-on-surface-variant">
            {isToday ? "Bugun hali mashg'ulot bo'lmagan." : "Bu kuni mashg'ulot bo'lmagan."}
          </p>
        )}
      </CollapsiblePanel>

      {showResult ? (
        <WorkoutResult
          result={result}
          comparison={comparison}
          newRecords={newRecords}
          water={water}
          strengthCalories={strengthCalories}
          cardioCalories={cardioCalories}
          recoveryLoading={recoveryLoading}
          recoveryError={recoveryError}
          canRequestRecovery={!!recoveryRequest}
          onRequestRecovery={() => void requestRecovery()}
          onClose={() => setResult(null)}
        />
      ) : (
        <StartCard onStart={() => startSession()} />
      )}

      {trendPoints.length > 1 && (
        <div className="glass-card rounded-xl p-6">
          <VolumeChart points={trendPoints} />
        </div>
      )}

      <PrPanel sessions={sessions} />
    </div>
  );
}

function Header({ active = false }: { active?: boolean }) {
  return (
    <div>
      <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-primary uppercase italic">
        Mashg&apos;ulotlar
      </h1>
      <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
        {active
          ? "Rejangizni tuzing va bajarilgan podxodlarni qayd eting"
          : "Kalendardan kunni tanlang yoki yangi mashg'ulotni boshlang"}
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
        <h3 className="font-headline-md text-headline-md text-primary uppercase italic">
          Bugungi rejangizni tuzing
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          {EXERCISES.length} ta mashq orasidan tanlang: rasmlar, texnika va jihoz bo&apos;yicha qulay qidiruv.
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
