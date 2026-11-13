"use client";
import { useState } from "react";
import { EXERCISES, type Exercise } from "@/lib/exercises";
import { useWorkoutTemplates } from "@/lib/saved-items";
import type { TrainingPreferences } from "@/lib/training-preferences";
import { buildTrainingPlan } from "@/lib/training-plan";
import type { WorkoutSession } from "@/lib/workout-log";

export function WorkoutPlans({
  preferences,
  latest,
  onStart,
}: {
  preferences: TrainingPreferences;
  latest?: WorkoutSession;
  onStart: (exercises: Exercise[]) => void;
}) {
  const { items, save } = useWorkoutTemplates();
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const resolve = (ids: string[]) =>
    ids.flatMap((id) => {
      const exercise = EXERCISES.find((e) => e.id === id);
      return exercise ? [exercise] : [];
    });
  const previous = resolve(latest?.exercises.map((e) => e.exerciseId) ?? []);
  const remove = async (id: string) => {
    setRemoving(id);
    setError(null);
    try {
      await save(items.filter((item) => item.id !== id));
    } catch {
      setError("Shablonni o'chirib bo'lmadi.");
    } finally {
      setRemoving(null);
    }
  };
  return (
    <section className="glass-card rounded-xl p-5 space-y-5">
      <h3 className="font-headline-md text-xl text-primary">Tez boshlash</h3>
      {previous.length > 0 && (
        <button
          type="button"
          onClick={() => onStart(previous)}
          className="w-full rounded-lg bg-primary/10 border border-primary/20 p-3 text-primary"
        >
          Oldingi mashqlarni takrorlash
        </button>
      )}
      <p className="text-xs text-on-surface-variant">
        Ro&apos;yxat tayyorlanadi; bajarilgan podxodlarni mashg&apos;ulot davomida kiriting.
      </p>
      {items.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm">Shu qurilmadagi shablonlar</h4>
          {items.map((item) => (
            <div key={item.id} className="flex gap-2">
              <button
                disabled={!resolve(item.exerciseIds).length}
                onClick={() => onStart(resolve(item.exerciseIds))}
                className="flex-1 text-left border border-white/10 rounded-lg p-3 disabled:opacity-50"
              >
                {item.name}{" "}
                <span className="text-xs text-on-surface-variant">({item.exerciseIds.length} mashq)</span>
              </button>
              <button
                disabled={!!removing}
                onClick={() => void remove(item.id)}
                aria-label={`${item.name} shablonini o'chirish`}
                className="p-3 text-error disabled:opacity-50"
              >
                O&apos;chirish
              </button>
            </div>
          ))}
        </div>
      )}
      <h4 className="text-sm">Sozlamalaringizga mos boshlang&apos;ich reja</h4>
      <div className="grid sm:grid-cols-2 gap-3">
        {buildTrainingPlan(preferences).map((day) => (
          <div key={day.name} className="border border-white/10 rounded-lg p-4 space-y-3">
            <h5 className="text-primary">{day.name}</h5>
            <p className="text-sm text-on-surface-variant">
              {day.exercises.map((e) => e.name).join(" / ") ||
                "Mos mashq yo'q. Profilda jihozlarni belgilang."}
            </p>
            <button
              disabled={!day.exercises.length}
              onClick={() => onStart(day.exercises)}
              className="text-sm text-primary underline disabled:opacity-50"
            >
              Shu rejani boshlash
            </button>
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-error text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
