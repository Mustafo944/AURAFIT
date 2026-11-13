"use client";
import { useState } from "react";
import { TrendLineChart } from "@/components/trend-line-chart";
import type { WorkoutSession } from "@/lib/workout-log";
export function ExerciseProgress({ sessions }: { sessions: WorkoutSession[] }) {
  const options = [
    ...new Map(
      sessions.flatMap((session) =>
        session.exercises.map((exercise) => [exercise.exerciseId, exercise.exerciseName] as const),
      ),
    ).entries(),
  ];
  const [selected, setSelected] = useState("");
  const [metric, setMetric] = useState<"weight" | "reps" | "volume">("weight");
  const exerciseId = options.some(([id]) => id === selected) ? selected : options[0]?.[0];
  const points = sessions
    .flatMap((session) => {
      const exercise = session.exercises.find((item) => item.exerciseId === exerciseId);
      if (!exercise?.sets.length) return [];
      const value =
        metric === "weight"
          ? Math.max(...exercise.sets.map((set) => set.weightKg))
          : metric === "reps"
            ? exercise.sets.reduce((sum, set) => sum + set.reps, 0)
            : exercise.sets.reduce((sum, set) => sum + set.weightKg * set.reps, 0);
      return [
        {
          id: session.id,
          dateLabel: new Date(session.finishedAt).toLocaleDateString("uz-UZ", {
            day: "numeric",
            month: "short",
          }),
          value,
        },
      ];
    })
    .slice(-12);
  return (
    <section className="glass-card rounded-xl p-5 space-y-4">
      <h3 className="font-headline-md text-xl text-primary">Mashqlar bo&apos;yicha o&apos;sish</h3>
      {!options.length ? (
        <p className="text-sm text-on-surface-variant">
          Birinchi mashg&apos;ulotdan keyin natijalar shu yerda ko&apos;rinadi.
        </p>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm min-w-0">
              Mashq
              <select
                className="block w-full bg-black border border-white/10 rounded-lg p-3 mt-1"
                value={exerciseId}
                onChange={(e) => setSelected(e.target.value)}
              >
                {options.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Ko&apos;rsatkich
              <select
                className="block w-full bg-black border border-white/10 rounded-lg p-3 mt-1"
                value={metric}
                onChange={(e) => setMetric(e.target.value as typeof metric)}
              >
                <option value="weight">Eng katta og&apos;irlik</option>
                <option value="reps">Jami takror</option>
                <option value="volume">Hajm (kg x takror)</option>
              </select>
            </label>
          </div>
          <TrendLineChart
            label="So'nggi 12 mashg'ulot"
            unit={metric === "reps" ? " takror" : " kg"}
            points={points}
          />
        </>
      )}
    </section>
  );
}
