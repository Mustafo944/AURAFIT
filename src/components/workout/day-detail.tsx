"use client";

import { useState } from "react";
import type { WorkoutSession } from "@/lib/workout-log";
import { MUSCLE_GROUPS, type MuscleGroupId } from "@/lib/exercises";

const UZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

function muscleInfo(id: MuscleGroupId) {
  return MUSCLE_GROUPS.find((g) => g.id === id);
}

function formatDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${d}-${UZ_MONTHS[m - 1]}, ${y}`;
}

function StatChip({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-surface-container rounded-lg px-3 py-2 text-center border border-outline/20 min-w-0">
      <div className="font-headline-md text-[18px] text-primary font-bold leading-none">{value}</div>
      <div className="font-label-mono text-[10px] text-on-surface-variant uppercase mt-1">{label}</div>
    </div>
  );
}

// Bitta kunning mashg'ulot(lar)i: standart holatda qisqacha (statistika +
// mushak guruhlari), bosilganda to'liq (har bir mashq va podxod, kardio).
export function DayDetail({
  dateKey,
  sessions,
  isToday,
  onDeleteSession,
}: {
  dateKey: string;
  sessions: WorkoutSession[];
  isToday: boolean;
  onDeleteSession?: (sessionId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const totals = sessions.reduce(
    (acc, s) => ({
      sets: acc.sets + s.totalSets,
      volume: acc.volume + s.totalVolumeKg,
      calories: acc.calories + s.caloriesBurned,
      cardio: acc.cardio + s.cardio.length,
    }),
    { sets: 0, volume: 0, calories: 0, cardio: 0 }
  );

  const muscleGroups = [
    ...new Set(sessions.flatMap((s) => s.exercises.map((e) => e.muscleGroup))),
  ] as MuscleGroupId[];

  const handleDelete = (sessionId: string) => {
    onDeleteSession?.(sessionId);
    setConfirmDeleteId(null);
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full text-left p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-fixed-dim">military_tech</span>
          <div className="flex-1 min-w-0">
            <div className="font-headline-md text-[17px] text-primary uppercase italic leading-tight">
              {isToday ? "Bugungi Mashg'ulot" : "Mashg'ulot"}
            </div>
            <div className="font-label-mono text-[11px] text-on-surface-variant">{formatDayLabel(dateKey)}</div>
          </div>
          <span
            className="material-symbols-outlined text-[22px] text-on-surface-variant transition-transform duration-200"
            style={{ transform: expanded ? "rotate(180deg)" : undefined }}
          >
            expand_more
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatChip value={totals.sets} label="Podxod" />
          <StatChip value={Math.round(totals.volume).toLocaleString("uz-UZ")} label="Hajm (kg)" />
          <StatChip value={totals.calories} label="Kcal" />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {muscleGroups.map((id) => {
            const info = muscleInfo(id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-full px-2.5 py-1 font-label-mono text-[11px] text-on-surface-variant uppercase"
              >
                <span className="material-symbols-outlined text-[13px] text-primary-fixed-dim">
                  {info?.icon ?? "fitness_center"}
                </span>
                {info?.label ?? id}
              </span>
            );
          })}
          {totals.cardio > 0 && (
            <span className="inline-flex items-center gap-1 bg-tertiary-fixed-dim/10 border border-tertiary-fixed-dim/30 rounded-full px-2.5 py-1 font-label-mono text-[11px] text-tertiary-fixed-dim uppercase">
              <span className="material-symbols-outlined text-[13px]">directions_run</span>
              {totals.cardio} kardio
            </span>
          )}
        </div>

        {!expanded && (
          <div className="font-label-mono text-[10px] text-on-surface-variant uppercase tracking-wider">
            To&apos;liq ma&apos;lumot uchun bosing
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">
          {sessions.map((session) => (
            <div key={session.id} className="space-y-2">
              {session.exercises.map((exercise) => {
                const info = muscleInfo(exercise.muscleGroup);
                return (
                  <div key={exercise.exerciseId} className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-primary-fixed-dim text-[16px]">
                        {info?.icon ?? "fitness_center"}
                      </span>
                      <span className="font-body-md text-[14px] text-on-surface font-semibold">{exercise.exerciseName}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {exercise.sets.map((set, i) => (
                        <span
                          key={i}
                          className="font-label-mono text-[11px] text-on-surface-variant bg-surface-container rounded px-2 py-1"
                        >
                          {set.weightKg}kg × {set.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}

              {session.cardio.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-tertiary-fixed-dim/[0.07] border border-tertiary-fixed-dim/20 rounded-lg p-3"
                >
                  <span className="material-symbols-outlined text-tertiary-fixed-dim text-[16px]">directions_run</span>
                  <span className="font-body-md text-[14px] text-on-surface font-semibold flex-1">{entry.label}</span>
                  <span className="font-label-mono text-[11px] text-on-surface-variant">
                    {entry.durationMin} daq
                    {entry.speedKmh ? ` · ${entry.speedKmh} km/s` : ""}
                    {entry.inclinePct ? ` · ${entry.inclinePct}%` : ""}
                  </span>
                  <span className="font-label-mono text-[12px] text-tertiary-fixed-dim">{entry.caloriesBurned} kcal</span>
                </div>
              ))}

              {/* O'chirish tugmasi */}
              {onDeleteSession && (
                <div className="pt-2">
                  {confirmDeleteId === session.id ? (
                    <div className="flex items-center gap-2 bg-error/10 border border-error/30 rounded-lg p-3">
                      <span className="material-symbols-outlined text-error text-[18px]">warning</span>
                      <span className="font-body-md text-[13px] text-on-surface flex-1">
                        Mashg&apos;ulotni o&apos;chirishni tasdiqlaysizmi?
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(session.id)}
                        className="bg-error text-on-error font-label-mono text-[12px] uppercase px-4 py-2 rounded-lg hover:bg-error/80 transition-colors active:scale-[0.97]"
                      >
                        Ha, O&apos;chir
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="bg-white/10 text-on-surface font-label-mono text-[12px] uppercase px-4 py-2 rounded-lg hover:bg-white/20 transition-colors active:scale-[0.97]"
                      >
                        Bekor
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(session.id)}
                      className="w-full flex items-center justify-center gap-2 bg-error/10 border border-error/20 text-error font-label-mono text-[12px] uppercase py-2.5 rounded-lg hover:bg-error/20 transition-colors active:scale-[0.98]"
                    >
                      Mashg&apos;ulotni O&apos;chirish
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
